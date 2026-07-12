import { shouldIncludeFieldV2 } from "@ciwi/translation-core/translation-filter";
import { isBlankValue } from "@ciwi/translation-core/translation-filter/v3Base";
import { shopScanGraphql } from "./graphql.js";

/**
 * 按 module + locale 统计可翻译字段数(total)、已翻译数(translated) 与源文字符数(chars)。
 *
 * 口径与 `worker/src/services/itemsCount.ts` / TSF `itemsCount.server.ts` 一致：
 *   - total：shouldIncludeFieldV2(isCover:true) 判定的应翻字段（不受现有译文影响）
 *   - translated：上述字段中已有当前译文（outdated !== true 且非空）的数量
 *   - chars：应翻字段源文长度之和（用于评估翻译规模/耗时）
 */

const QUERY = `
query ShopScanCount(
  $resourceType: TranslatableResourceType!
  $first: Int!
  $locale: String!
  $after: String
) {
  translatableResources(resourceType: $resourceType, first: $first, after: $after) {
    edges {
      node {
        translations(locale: $locale) { key value outdated }
        translatableContent { key value type }
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}`;

const PAGE_SIZE = 250;

export type ModuleScanCount = { total: number; translated: number; chars: number };

type Node = {
  translations?: Array<{ key: string; value?: string | null; outdated?: boolean | null }> | null;
  translatableContent?: Array<{ key: string; value: string; type?: string | null }> | null;
};

type CountResponse = {
  translatableResources: {
    edges: Array<{ node: Node }>;
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
};

function hasCurrentTranslation(
  translations: Node["translations"],
  key: string,
): boolean {
  const row = (translations ?? []).find((t) => t.key === key);
  if (!row) return false;
  if (row.outdated === true) return false;
  return !isBlankValue(row.value);
}

export async function countModuleScan(
  shop: string,
  accessToken: string,
  module: string,
  locale: string,
  onPage?: () => Promise<void>,
): Promise<ModuleScanCount> {
  let total = 0;
  let translated = 0;
  let chars = 0;
  let after: string | null = null;

  for (;;) {
    const data: CountResponse = await shopScanGraphql<CountResponse>(
      shop,
      accessToken,
      QUERY,
      {
        resourceType: module,
        first: PAGE_SIZE,
        locale,
        after,
      },
    );

    const conn = data?.translatableResources;
    const edges = conn?.edges ?? [];
    for (const { node } of edges) {
      const translations = node.translations ?? [];
      for (const content of node.translatableContent ?? []) {
        const includable = shouldIncludeFieldV2(
          { key: content.key, value: content.value, type: content.type },
          undefined,
          { module, isCover: true, isHandle: false },
        );
        if (!includable) continue;
        total++;
        chars += content.value?.length ?? 0;
        if (hasCurrentTranslation(translations, content.key)) translated++;
      }
    }

    if (onPage) await onPage();
    if (!conn?.pageInfo?.hasNextPage) break;
    after = conn.pageInfo.endCursor ?? null;
    if (!after) break;
  }

  return { total, translated, chars };
}
