import type { ShopProfileFacts } from "./shopContext.js";
import type { ThemeTextSample } from "./translationSamples.js";

/**
 * 信号提取层（文档 Phase 3）。
 *
 * 把已采集的原始素材（facts + theme 文案）加工成高质量、可解释的中间信号，
 * 供 AI 归纳阶段消费，避免把全量原始文本一股脑喂给模型。
 *
 * 纯函数，无网络/IO，便于单测与调权重。
 */

/** 文本来源桶（文档 8.1）。 */
export type SignalSource =
  | "menu"
  | "collection_title"
  | "collection_description"
  | "theme"
  | "product_title"
  | "product_type"
  | "vendor"
  | "article_title"
  | "article_summary"
  | "tag";

/** 带 metadata 的原始文本样本。 */
type TextSample = {
  text: string;
  source: SignalSource;
  weight: number;
};

export type WeightedTerm = {
  term: string;
  /** 加权得分（来源权重累加）。 */
  score: number;
  /** 出现次数（裸频次）。 */
  count: number;
  /** 出现过的来源（去重）。 */
  sources: SignalSource[];
};

export type RepresentativeSample = {
  source: SignalSource;
  text: string;
};

/** 信号提取的结构化中间结果（文档 8.6）。 */
export type ShopSignalBundle = {
  weightedTopTerms: WeightedTerm[];
  weightedTopPhrases: WeightedTerm[];
  brandTerms: string[];
  categoryTerms: string[];
  menuTerms: string[];
  representativeSamples: RepresentativeSample[];
  sourceStats: Record<string, number>;
};

/** 来源基础权重（文档 8.3）。theme 样本自带相对权重，另行叠加。 */
const SOURCE_WEIGHT: Record<SignalSource, number> = {
  menu: 3,
  collection_title: 3,
  theme: 3,
  product_title: 2.5,
  collection_description: 1.5,
  article_title: 2,
  article_summary: 2,
  product_type: 2,
  vendor: 1,
  tag: 1,
};

/** 每个来源进入代表样本的上限（分层抽样，文档 8.5）。 */
const SAMPLE_QUOTA: Partial<Record<SignalSource, number>> = {
  menu: 12,
  collection_title: 10,
  theme: 12,
  product_title: 8,
  collection_description: 4,
  article_title: 5,
  article_summary: 4,
};

const MAX_TOP_TERMS = 40;
const MAX_TOP_PHRASES = 25;
const MAX_BRAND_TERMS = 25;
const MAX_CATEGORY_TERMS = 25;
const MAX_MENU_TERMS = 25;
const MAX_REPRESENTATIVE_SAMPLES = 60;

/** 英文常用停用词 + 电商噪音词（保守集合）。 */
const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with", "by",
  "at", "from", "as", "is", "are", "be", "this", "that", "these", "those",
  "your", "our", "you", "we", "it", "its", "all", "new", "our", "up", "off",
  "out", "get", "buy", "shop", "sale", "free", "now", "more", "best", "top",
  "com", "www", "http", "https", "de", "la", "le", "el", "en", "y", "und",
]);

export function extractShopSignals(
  facts: ShopProfileFacts,
  themeTexts: ThemeTextSample[],
): ShopSignalBundle {
  const pool = buildTextPool(facts, themeTexts);

  const { unigrams, bigrams } = accumulateTermFrequencies(pool);

  const weightedTopTerms = topWeightedTerms(unigrams, MAX_TOP_TERMS);
  const weightedTopPhrases = topWeightedTerms(bigrams, MAX_TOP_PHRASES);

  const brandTerms = dedupeNonEmpty(facts.vendors).slice(0, MAX_BRAND_TERMS);
  const categoryTerms = dedupeNonEmpty([
    ...facts.productTypes,
    ...facts.collectionTitles,
  ]).slice(0, MAX_CATEGORY_TERMS);
  const menuTerms = dedupeNonEmpty(facts.menuTitles).slice(0, MAX_MENU_TERMS);

  const representativeSamples = selectRepresentativeSamples(pool);

  const sourceStats: Record<string, number> = {};
  for (const s of pool) {
    sourceStats[s.source] = (sourceStats[s.source] ?? 0) + 1;
  }

  return {
    weightedTopTerms,
    weightedTopPhrases,
    brandTerms,
    categoryTerms,
    menuTerms,
    representativeSamples,
    sourceStats,
  };
}

/** 1. 建立原始文本池：按来源分桶，附带来源权重。 */
function buildTextPool(
  facts: ShopProfileFacts,
  themeTexts: ThemeTextSample[],
): TextSample[] {
  const pool: TextSample[] = [];

  const push = (texts: string[], source: SignalSource) => {
    for (const raw of texts) {
      const text = normalize(raw);
      if (!text) continue;
      pool.push({ text, source, weight: SOURCE_WEIGHT[source] });
    }
  };

  push(facts.menuTitles, "menu");
  push(facts.collectionTitles, "collection_title");
  push(facts.collectionDescriptions, "collection_description");
  push(facts.topProductTitles, "product_title");
  push(facts.productTypes, "product_type");
  push(facts.vendors, "vendor");
  push(facts.articleTitles, "article_title");
  push(facts.articleSummaries, "article_summary");
  push(facts.tags, "tag");

  // theme 样本自带相对 weight（hero/banner 更高），叠加到来源基础权重上做归一。
  for (const t of themeTexts) {
    const text = normalize(t.text);
    if (!text) continue;
    pool.push({
      text,
      source: "theme",
      weight: SOURCE_WEIGHT.theme + Math.min(t.weight, 6) * 0.3,
    });
  }

  return pool;
}

/** 4. 加权词频：unigram + bigram（拉丁词），CJK 走字符 2-gram。 */
function accumulateTermFrequencies(pool: TextSample[]): {
  unigrams: Map<string, WeightedTerm>;
  bigrams: Map<string, WeightedTerm>;
} {
  const unigrams = new Map<string, WeightedTerm>();
  const bigrams = new Map<string, WeightedTerm>();

  for (const sample of pool) {
    const { latinTokens, cjkTerms } = tokenize(sample.text);

    for (const term of [...latinTokens, ...cjkTerms]) {
      bump(unigrams, term, sample);
    }

    // 拉丁词相邻组合成短语（跳过停用词起止）。
    for (let i = 0; i + 1 < latinTokens.length; i++) {
      const a = latinTokens[i];
      const b = latinTokens[i + 1];
      if (STOPWORDS.has(a) || STOPWORDS.has(b)) continue;
      bump(bigrams, `${a} ${b}`, sample);
    }
  }

  return { unigrams, bigrams };
}

function bump(map: Map<string, WeightedTerm>, term: string, sample: TextSample): void {
  const existing = map.get(term);
  if (existing) {
    existing.score += sample.weight;
    existing.count += 1;
    if (!existing.sources.includes(sample.source)) existing.sources.push(sample.source);
  } else {
    map.set(term, {
      term,
      score: sample.weight,
      count: 1,
      sources: [sample.source],
    });
  }
}

function topWeightedTerms(map: Map<string, WeightedTerm>, limit: number): WeightedTerm[] {
  return [...map.values()]
    // 只保留出现 >1 次或跨多来源的词，过滤长尾偶发噪音。
    .filter((t) => t.count > 1 || t.sources.length > 1)
    .sort((a, b) => b.score - a.score || b.count - a.count)
    .slice(0, limit)
    .map((t) => ({ ...t, score: round2(t.score) }));
}

/** 5. 分层抽样：每来源按配额取代表样本（长度优先，去重）。 */
function selectRepresentativeSamples(pool: TextSample[]): RepresentativeSample[] {
  const bySource = new Map<SignalSource, TextSample[]>();
  for (const s of pool) {
    const arr = bySource.get(s.source) ?? [];
    arr.push(s);
    bySource.set(s.source, arr);
  }

  const out: RepresentativeSample[] = [];
  const seen = new Set<string>();

  for (const [source, samples] of bySource) {
    const quota = SAMPLE_QUOTA[source];
    if (!quota) continue;
    const sorted = [...samples].sort((a, b) => b.text.length - a.text.length);
    let taken = 0;
    for (const s of sorted) {
      if (taken >= quota) break;
      const key = s.text.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ source, text: s.text });
      taken++;
    }
  }

  return out.slice(0, MAX_REPRESENTATIVE_SAMPLES);
}

/** 分词：返回拉丁词（小写、去停用词）与 CJK 字符 2-gram。 */
function tokenize(text: string): { latinTokens: string[]; cjkTerms: string[] } {
  const lower = text.toLowerCase();
  const latinTokens: string[] = [];
  const cjkTerms: string[] = [];

  // 拉丁/数字词块（允许词内撇号、连字符）。
  const latinMatches = lower.match(/[a-z0-9][a-z0-9''\-]*[a-z0-9]|[a-z0-9]/g) ?? [];
  for (const raw of latinMatches) {
    const token = raw.replace(/^[-']+|[-']+$/g, "");
    if (token.length < 2) continue;
    if (STOPWORDS.has(token)) continue;
    if (/^\d+$/.test(token)) continue;
    latinTokens.push(token);
  }

  // CJK 连续段：相邻两字组成 2-gram（近似分词，第一版）。
  const cjkSegments = text.match(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]+/g) ?? [];
  for (const seg of cjkSegments) {
    if (seg.length === 1) {
      cjkTerms.push(seg);
      continue;
    }
    for (let i = 0; i + 1 < seg.length; i++) {
      cjkTerms.push(seg.slice(i, i + 2));
    }
  }

  return { latinTokens, cjkTerms };
}

function normalize(value: string): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function dedupeNonEmpty(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const trimmed = (v ?? "").trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
