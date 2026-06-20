/**
 * manage 翻译页「保存」直连 Shopify（替代经 Java 的 updateManageTranslation）。
 *
 * 仅负责把译文写回/删除 Shopify：
 *   - value 非空 → translationsRegister
 *   - value 为空 → translationsRemove
 * 不做 LLM 翻译、不扣额度（那些仍走 Java，如 SingleTextTranslate）。
 *
 * 关键点：confirmData 里 `locale` 是「源语言」，`target` 才是要写入的「目标语言」。
 * Shopify 的 TranslationInput.locale / translationsRemove.locales 必须用 `target`。
 */
import {
  cachedModulesFromResourceIds,
  invalidateItemsCount,
} from "~/server/translateV4/itemsCount.server";

/** 仅依赖 admin.graphql，这里用最小结构化类型避免与 SDK 版本耦合。 */
export type AdminGraphqlClient = {
  graphql: (
    query: string,
    options?: { variables?: Record<string, unknown> },
  ) => Promise<{ json: () => Promise<any> }>;
};

/** 与各 manage 页提交的 confirmData 项形状一致。 */
export type ManageTranslationItem = {
  id?: string;
  resourceId: string;
  locale?: string; // 源语言，注册时不使用
  key: string; // Shopify 翻译 key（shopifyKey）
  value?: string;
  translatableContentDigest?: string;
  target: string; // 目标语言：真正用于注册/删除的 locale
};

/** 与原 updateManageTranslation 返回保持同形，页面 UI 无需改。 */
export type ManageSaveResult = {
  success: boolean;
  errorCode: number;
  errorMsg: string;
  response: {
    id?: string;
    resourceId: string;
    locale?: string;
    key: string;
    value?: string;
    translatableContentDigest?: string;
    target: string;
  } | null;
};

const REGISTER_MUTATION = `#graphql
  mutation translationsRegister($resourceId: ID!, $translations: [TranslationInput!]!) {
    translationsRegister(resourceId: $resourceId, translations: $translations) {
      userErrors { field message }
      translations { key value locale }
    }
  }`;

const REMOVE_MUTATION = `#graphql
  mutation translationsRemove($resourceId: ID!, $translationKeys: [String!]!, $locales: [String!]!) {
    translationsRemove(resourceId: $resourceId, translationKeys: $translationKeys, locales: $locales) {
      userErrors { field message }
      translations { key value }
    }
  }`;

/** Shopify translationsRegister 单次每 resourceId 上限 250 条。 */
const MAX_TRANSLATIONS_PER_CALL = 250;

/** 去掉 HTML 后是否为空——空则视为「删除该 key 译文」。 */
function isEmptyValue(value?: string): boolean {
  if (!value) return true;
  return value.replace(/<[^>]*>/g, "").trim() === "";
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function groupBy<T>(arr: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of arr) {
    const k = keyFn(item);
    const list = map.get(k);
    if (list) list.push(item);
    else map.set(k, [item]);
  }
  return map;
}

function resultFor(
  item: ManageTranslationItem,
  success: boolean,
  errorMsg: string,
): ManageSaveResult {
  return {
    success,
    errorCode: success ? 0 : 10001,
    errorMsg,
    response: {
      id: item.id,
      resourceId: item.resourceId,
      locale: item.locale,
      key: item.key,
      value: item.value,
      translatableContentDigest: item.translatableContentDigest,
      target: item.target,
    },
  };
}

/**
 * 保存一批译文到 Shopify。返回逐项结果（同 updateManageTranslation 形状）。
 * userErrors 如实透出：批内任一 userError → 该批所有项 success:false 并带回消息，避免「假成功」。
 */
export async function registerManageTranslations({
  admin,
  shop,
  confirmData,
}: {
  admin: AdminGraphqlClient;
  /** 传入则保存后失效对应统计缓存（汇总页据此重算）；不传则跳过失效。 */
  shop?: string;
  confirmData: ManageTranslationItem[];
}): Promise<ManageSaveResult[]> {
  const results: ManageSaveResult[] = [];

  const itemsToUpdate = confirmData.filter((i) => !isEmptyValue(i.value));
  const itemsToDelete = confirmData.filter((i) => isEmptyValue(i.value));

  // —— 注册：按 resourceId 分组，每组 ≤250 条一批 ——
  for (const [resourceId, group] of groupBy(itemsToUpdate, (i) => i.resourceId)) {
    // 缺 digest/target 的项无法注册，直接标失败（不静默丢弃）
    const valid = group.filter((i) => i.translatableContentDigest && i.target);
    const invalid = group.filter((i) => !i.translatableContentDigest || !i.target);
    for (const item of invalid) {
      results.push(resultFor(item, false, "missing digest or target locale"));
    }

    for (const batch of chunk(valid, MAX_TRANSLATIONS_PER_CALL)) {
      try {
        const response = await admin.graphql(REGISTER_MUTATION, {
          variables: {
            resourceId,
            translations: batch.map((i) => ({
              locale: i.target, // 目标语言
              key: i.key,
              value: i.value,
              translatableContentDigest: i.translatableContentDigest,
            })),
          },
        });
        const data = await response.json();
        const userErrors =
          data?.data?.translationsRegister?.userErrors ?? [];
        const errorMsg = userErrors
          .map((e: any) => e?.message)
          .filter(Boolean)
          .join("; ");
        const ok = userErrors.length === 0;
        for (const item of batch) results.push(resultFor(item, ok, errorMsg));
      } catch (error) {
        console.error("[translations] translationsRegister failed:", error);
        for (const item of batch) {
          results.push(resultFor(item, false, "translationsRegister request failed"));
        }
      }
    }
  }

  // —— 删除：按 resourceId + target 分组，translationKeys 批量 ——
  for (const [, group] of groupBy(
    itemsToDelete,
    (i) => `${i.resourceId}__${i.target}`,
  )) {
    const resourceId = group[0].resourceId;
    const locale = group[0].target;
    const keys = group.map((i) => i.key);
    try {
      const response = await admin.graphql(REMOVE_MUTATION, {
        variables: { resourceId, translationKeys: keys, locales: [locale] },
      });
      const data = await response.json();
      const userErrors = data?.data?.translationsRemove?.userErrors ?? [];
      const errorMsg = userErrors
        .map((e: any) => e?.message)
        .filter(Boolean)
        .join("; ");
      const ok = userErrors.length === 0;
      for (const item of group) results.push(resultFor(item, ok, errorMsg));
    } catch (error) {
      console.error("[translations] translationsRemove failed:", error);
      for (const item of group) {
        results.push(resultFor(item, false, "translationsRemove request failed"));
      }
    }
  }

  // 保存改变了译文 → 失效对应类型的统计缓存，汇总页下次重算（best-effort）。
  if (shop && confirmData.length) {
    const locale = confirmData.find((i) => i.target)?.target;
    if (locale) {
      const modules = cachedModulesFromResourceIds(
        confirmData.map((i) => i.resourceId),
      );
      await invalidateItemsCount(shop, locale, modules);
    }
  }

  return results;
}
