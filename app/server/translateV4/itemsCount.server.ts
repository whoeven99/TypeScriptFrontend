/**
 * 汇总页「已翻译/总数」统计 —— TSF 本地计算，口径与 v4 一致（去 Java）。
 *
 * 与 Java getTranslationItemsInfo 的区别：用 worker 同一套 translationFilter 规则
 * （`shouldIncludeFieldV2`）判定「哪些字段算可翻译」，因此 v4 翻完必然 N/N，不会出现
 * 「v4 翻完仍显示 208/232」的漂移。
 *
 * 数据源仍是 Shopify（与 Java 一样需翻页拉取），本模块不提速，只保证去 Java + 口径一致。
 */
import { shouldIncludeFieldV2 } from "./translationFilter";

/** 仅依赖 admin.graphql，避免与 SDK 版本耦合。 */
export type AdminGraphqlClient = {
  graphql: (
    query: string,
    options?: { variables?: Record<string, unknown> },
  ) => Promise<{ json: () => Promise<any> }>;
};

/** 汇总页消费形状（与 Java 返回保持一致）。 */
export type ItemsCountRow = {
  language: string;
  type: string;
  translatedNumber: number;
  totalNumber: number;
};

/** 汇总页 module → Shopify TranslatableResourceType（对齐 worker MODULE_TO_SHOPIFY_TYPE）。 */
const MODULE_TO_SHOPIFY_TYPE: Record<string, string> = {
  PRODUCT: "PRODUCT",
};

const TRANSLATABLE_RESOURCES_QUERY = `#graphql
  query CountTranslatableResources(
    $resourceType: TranslatableResourceType!
    $first: Int!
    $locale: String!
    $after: String
  ) {
    translatableResources(resourceType: $resourceType, first: $first, after: $after) {
      edges {
        node {
          resourceId
          translations(locale: $locale) {
            key
            outdated
          }
          translatableContent {
            key
            value
            type
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }`;

const PAGE_SIZE = 50;

type TranslatableNode = {
  translations?: Array<{ key: string; outdated?: boolean | null }> | null;
  translatableContent?: Array<{
    key: string;
    value: string;
    type?: string | null;
  }> | null;
};

/** 某字段是否已有「当前译文」（非过期）。 */
function hasCurrentTranslation(
  translations: TranslatableNode["translations"],
  key: string,
): boolean {
  return (translations ?? []).some(
    (t) => t.key === key && t.outdated !== true,
  );
}

/**
 * 统计一个 module 在某目标语言下的 已翻译/总可翻译 字段数。
 *
 * - total（分母）：用 shouldIncludeFieldV2 + isCover:true 判定「应翻字段」（不受现有译文影响）。
 * - translated（分子）：上述字段里，已有「当前译文」的数量。
 *
 * isHandle 默认 false，对齐 v4 任务默认（tasks.ts 默认 isHandle:false）。
 */
export async function countModuleItems({
  admin,
  module,
  target,
  isHandle = false,
}: {
  admin: AdminGraphqlClient;
  module: string;
  target: string;
  isHandle?: boolean;
}): Promise<{ total: number; translated: number }> {
  const resourceType = MODULE_TO_SHOPIFY_TYPE[module] ?? module;
  let total = 0;
  let translated = 0;
  let after: string | null = null;

  for (;;) {
    const response = await admin.graphql(TRANSLATABLE_RESOURCES_QUERY, {
      variables: { resourceType, first: PAGE_SIZE, locale: target, after },
    });
    const data = await response.json();
    const conn = data?.data?.translatableResources;
    const edges: Array<{ node: TranslatableNode }> = conn?.edges ?? [];

    for (const edge of edges) {
      const node = edge.node;
      const translations = node.translations ?? [];
      for (const content of node.translatableContent ?? []) {
        const includable = shouldIncludeFieldV2(
          { key: content.key, value: content.value, type: content.type },
          undefined, // 分母不受现有译文影响
          { module, isCover: true, isHandle },
        );
        if (!includable) continue;
        total++;
        if (hasCurrentTranslation(translations, content.key)) translated++;
      }
    }

    if (!conn?.pageInfo?.hasNextPage) break;
    after = conn.pageInfo.endCursor ?? null;
    if (!after) break;
  }

  return { total, translated };
}

/**
 * 汇总页「Products」卡片统计（v4 口径，取代 Java GetTranslationItemsInfo）。
 * 返回与 Java 同形的单元素数组，type 用 "PRODUCT"（与组件匹配键一致）。
 */
export async function getProductsItemsCount({
  admin,
  target,
}: {
  admin: AdminGraphqlClient;
  target: string;
}): Promise<ItemsCountRow[]> {
  const { total, translated } = await countModuleItems({
    admin,
    module: "PRODUCT",
    target,
  });
  return [
    {
      language: target,
      type: "PRODUCT",
      translatedNumber: translated,
      totalNumber: total,
    },
  ];
}
