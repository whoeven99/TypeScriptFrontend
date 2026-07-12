import { BLACKLIST_WORDS } from "@ciwi/translation-core/translation-filter/constants";
import { shouldIncludeFieldV2 } from "@ciwi/translation-core/translation-filter";
import { shopScanGraphql } from "./graphql.js";

/**
 * 采样某目标语言下「源文 → 已有译文」对，供 AI 归纳术语表。
 *
 * 优先短字段（title），因为品牌词/专有名词/固定叫法多出现在标题，最能体现
 * 「应固定翻译」的术语。只取已有译文（value 非空）的资源。
 */

export type TranslationPair = { source: string; target: string };

/** 主题文案样本（画像阶段用，只取源文）。 */
export type ThemeTextSample = {
  text: string;
  module: string;
  key: string;
  weight: number;
};

const PAIR_QUERY = `
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

const THEME_TEXT_QUERY = `
query ShopScanThemeTexts(
  $resourceType: TranslatableResourceType!
  $first: Int!
  $after: String
) {
  translatableResources(resourceType: $resourceType, first: $first, after: $after) {
    edges {
      node {
        resourceId
        translatableContent { key value type }
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}`;

const PAGE_SIZE = 100;
const SAMPLE_KEYS = new Set(["title"]);

/** 画像阶段优先采样的 theme 模块（按品牌叙事价值排序）。 */
const THEME_PROFILE_MODULES = [
  "ONLINE_STORE_THEME_JSON_TEMPLATE",
  "ONLINE_STORE_THEME_SECTION_GROUP",
  "ONLINE_STORE_THEME_SETTINGS_DATA_SECTIONS",
] as const;

const THEME_MODULE_WEIGHT: Record<string, number> = {
  ONLINE_STORE_THEME_JSON_TEMPLATE: 2,
  ONLINE_STORE_THEME_SECTION_GROUP: 1,
  ONLINE_STORE_THEME_SETTINGS_DATA_SECTIONS: 0,
};

const HIGH_WEIGHT_KEY_RE =
  /hero|banner|announcement|tagline|slogan|subheading|subtitle|cta|button_label/i;
const MEDIUM_WEIGHT_KEY_RE = /heading|title|description|text|content|label|intro|caption/i;
const HOME_SIGNAL_RE = /index|home|hero|banner|slideshow|featured/i;

const MAX_THEME_TEXT_SAMPLES = Math.max(
  10,
  Number(process.env.SHOP_SCAN_THEME_SAMPLE) || 40,
);
const MAX_PAGES_PER_MODULE = Math.max(
  2,
  Number(process.env.SHOP_SCAN_THEME_PAGES) || 5,
);

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

type ThemeTextNode = {
  resourceId?: string | null;
  translatableContent?: Array<{ key: string; value: string; type?: string | null }> | null;
};

type ThemeTextResponse = {
  translatableResources: {
    edges: Array<{ node: ThemeTextNode }>;
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
        PAIR_QUERY,
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

/**
 * 从 theme 相关 translatableResources 采样源文，供店铺画像归纳品牌语气与卖点。
 * 走与翻译流水线相同的字段过滤规则，并按 key/模块加权优先 hero/banner/首页文案。
 */
export async function sampleThemeTexts(
  shop: string,
  accessToken: string,
  maxSamples = MAX_THEME_TEXT_SAMPLES,
  onPage?: () => Promise<void>,
): Promise<ThemeTextSample[]> {
  const candidates: ThemeTextSample[] = [];

  for (const module of THEME_PROFILE_MODULES) {
    let after: string | null = null;

    for (let page = 0; page < MAX_PAGES_PER_MODULE; page++) {
      const data: ThemeTextResponse = await shopScanGraphql<ThemeTextResponse>(
        shop,
        accessToken,
        THEME_TEXT_QUERY,
        {
          resourceType: module,
          first: PAGE_SIZE,
          after,
        },
      );

      const conn = data?.translatableResources;
      for (const { node } of conn?.edges ?? []) {
        const resourceId = node.resourceId ?? "";
        for (const content of node.translatableContent ?? []) {
          const key = content.key ?? "";
          const rawValue = content.value ?? "";
          const includable = shouldIncludeFieldV2(
            { key, value: rawValue, type: content.type },
            undefined,
            { module, isCover: true, isHandle: false },
          );
          if (!includable) continue;

          const text = normalizeThemeText(rawValue);
          if (!isUsefulThemeText(text)) continue;

          candidates.push({
            text,
            module,
            key,
            weight: scoreThemeSample({
              module,
              key,
              resourceId,
              text,
            }),
          });
        }
      }

      if (onPage) await onPage();
      if (!conn?.pageInfo?.hasNextPage) break;
      after = conn.pageInfo.endCursor ?? null;
      if (!after) break;
    }
  }

  return selectTopThemeSamples(candidates, maxSamples);
}

function scoreThemeSample(args: {
  module: string;
  key: string;
  resourceId: string;
  text: string;
}): number {
  const { module, key, resourceId, text } = args;
  let weight = THEME_MODULE_WEIGHT[module] ?? 0;

  const keyBlob = `${key} ${resourceId}`;
  if (HIGH_WEIGHT_KEY_RE.test(keyBlob)) weight += 4;
  else if (MEDIUM_WEIGHT_KEY_RE.test(keyBlob)) weight += 2;

  if (HOME_SIGNAL_RE.test(keyBlob)) weight += 3;

  if (text.length >= 20) weight += 1;
  if (text.length >= 60) weight += 1;

  return weight;
}

function selectTopThemeSamples(
  candidates: ThemeTextSample[],
  maxSamples: number,
): ThemeTextSample[] {
  const seen = new Set<string>();
  const sorted = [...candidates].sort((a, b) => b.weight - a.weight || b.text.length - a.text.length);
  const out: ThemeTextSample[] = [];

  for (const sample of sorted) {
    const dedupeKey = sample.text.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    out.push(sample);
    if (out.length >= maxSamples) break;
  }

  return out;
}

function normalizeThemeText(value: string): string {
  const stripped = stripHtml(value).replace(/\s+/g, " ").trim();
  return truncateText(stripped, 250);
}

function isUsefulThemeText(text: string): boolean {
  if (text.length < 4 || text.length > 250) return false;
  if (BLACKLIST_WORDS.has(text)) return false;
  if (/^[\d\s.,:;!?%+\-/$]+$/.test(text)) return false;
  return true;
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .trim();
}

function truncateText(text: string, maxLen: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen).trimEnd()}…`;
}
