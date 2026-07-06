import { shopScanGraphql } from "./graphql.js";

/**
 * 采样某目标语言下「源文 → 已有译文」对，供 AI 归纳术语表。
 *
 * 优先短字段（title），因为品牌词/专有名词/固定叫法多出现在标题，最能体现
 * 「应固定翻译」的术语。只取已有译文（value 非空）的资源。
 */

export type TranslationPair = { source: string; target: string };

const QUERY = `
query ShopScanSamples(
  $resourceType: TranslatableResourceType!
  $first: Int!
  $locale: String!
  $after: String
) {
  translatableResources(resourceType: $resourceType, first: $first, after: $after) {
    edges {
      node {
        translations(locale: $locale) { key value outdated }
        translatableContent { key value }
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}`;

const PAGE_SIZE = 100;
const SAMPLE_KEYS = new Set(["title"]);

type SampleNode = {
  translations?: Array<{ key: string; value?: string | null; outdated?: boolean | null }> | null;
  translatableContent?: Array<{ key: string; value: string }> | null;
};

type SampleResponse = {
  translatableResources: {
    edges: Array<{ node: SampleNode }>;
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
};

export async function sampleTranslationPairs(
  shop: string,
  accessToken: string,
  locale: string,
  modules: string[],
  maxPairs: number,
): Promise<TranslationPair[]> {
  const pairs: TranslationPair[] = [];
  const seen = new Set<string>();

  for (const module of modules) {
    if (pairs.length >= maxPairs) break;
    let after: string | null = null;

    for (;;) {
      if (pairs.length >= maxPairs) break;
      const data: SampleResponse = await shopScanGraphql<SampleResponse>(
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
          if (!SAMPLE_KEYS.has(content.key)) continue;
          const source = (content.value ?? "").trim();
          if (!source || source.length > 120) continue;
          const t = translations.find((r) => r.key === content.key && r.outdated !== true);
          const target = (t?.value ?? "").trim();
          if (!target) continue;
          const dedupeKey = `${source}\u0000${target}`;
          if (seen.has(dedupeKey)) continue;
          seen.add(dedupeKey);
          pairs.push({ source, target });
          if (pairs.length >= maxPairs) break;
        }
        if (pairs.length >= maxPairs) break;
      }

      if (!conn?.pageInfo?.hasNextPage) break;
      after = conn.pageInfo.endCursor ?? null;
      if (!after) break;
    }
  }

  return pairs;
}
