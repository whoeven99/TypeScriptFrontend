import { readV4Blob } from "~/server/translateV4/blob.server";
import type {
  ShopScanGlossarySuggestion,
  ShopScanProfileStrategy,
  ShopScanSummary,
} from "~/server/shopScan/cosmos.server";

/** 第二步 AI 归纳：术语与模块策略（与 worker profileInduction 对齐）。 */
export type TerminologyStrategyView = ShopScanProfileStrategy;

/** 从译文样本归纳的术语建议（仅展示，不写 Glossary 表）。 */
export type GlossarySuggestionView = ShopScanGlossarySuggestion;

/** 第一步 AI 理解（完整字段在 Blob；Turso 只落了其中 4 项）。 */
export type ShopUnderstandingView = {
  industry: string | null;
  subIndustry: string | null;
  brandPositioning: string | null;
  coreProductTypes: string[];
  sellingPoints: string[];
  priceRange: string | null;
  voiceStyle: string | null;
  seoDirection: string | null;
  marketNotes: string[];
  description: string | null;
  keywords: string[];
};

/** 扫描时采集的市场配置。 */
export type ShopMarketView = {
  name: string;
  handle: string;
  status: string;
  baseCurrency: string | null;
  locales: string[];
};

/** 信号提取中间结果（加权词频 / 分层抽样）。 */
export type ShopSignalsView = {
  weightedTopTerms: Array<{
    term: string;
    score: number;
    count: number;
    sources: string[];
  }>;
  weightedTopPhrases: Array<{
    term: string;
    score: number;
    count: number;
    sources: string[];
  }>;
  brandTerms: string[];
  categoryTerms: string[];
  menuTerms: string[];
  representativeSamples: Array<{ source: string; text: string }>;
  sourceStats: Record<string, number>;
};

export type ShopScanArtifacts = {
  strategy: TerminologyStrategyView | null;
  glossarySuggestions: GlossarySuggestionView[];
  understanding: ShopUnderstandingView | null;
  markets: ShopMarketView[];
  signals: ShopSignalsView | null;
  source: "cosmos" | "blob" | "mixed" | "none";
};

type ProfileFactsBlob = {
  markets?: unknown;
  signals?: unknown;
  induction?: {
    understanding?: unknown;
    strategy?: TerminologyStrategyView | null;
  } | null;
};

type GlossaryRawBlob = {
  perLocale?: Array<{
    locale?: string;
    terms?: Array<{ source?: string; target?: string }>;
  }>;
};

type LatestScanBlob = {
  profile?: ProfileFactsBlob | null;
  glossary?: GlossaryRawBlob | null;
};

/** 从 blobPrefix 推断 shop：`shop-profile/{shop}` 或历史 `shop-scan/{shop}/{scanId}`。 */
function shopFromBlobPrefix(blobPrefix: string): string | null {
  const parts = blobPrefix.replace(/\/+$/, "").split("/").filter(Boolean);
  if (parts[0] === "shop-profile" && parts[1]) return parts[1];
  if (parts[0] === "shop-scan" && parts[1]) return parts[1];
  return null;
}

/**
 * 读取扫描产出的术语策略、术语建议，以及 Blob 中的理解/市场/信号明细。
 * strategy / glossary 优先 Cosmos summary；understanding / markets / signals 仅在 Blob。
 * 优先读稳定文件 `shop-profile/{shop}/latest-scan.json`，再 fallback 旧散文件。
 */
export async function loadShopScanArtifacts(
  blobPrefix: string | null | undefined,
  summary?: ShopScanSummary | null,
): Promise<ShopScanArtifacts> {
  const fromCosmos = artifactsFromSummary(summary);

  let understanding: ShopUnderstandingView | null = null;
  let markets: ShopMarketView[] = [];
  let signals: ShopSignalsView | null = null;
  let strategyFromBlob: TerminologyStrategyView | null = null;
  let glossaryFromBlob: GlossarySuggestionView[] = [];
  let readBlob = false;

  let profileFacts: ProfileFactsBlob | null = null;
  let glossaryRaw: GlossaryRawBlob | null = null;

  const shop = blobPrefix ? shopFromBlobPrefix(blobPrefix) : null;
  if (shop) {
    const latest = await readV4Blob<LatestScanBlob>(
      `shop-profile/${shop}/latest-scan.json`,
    );
    if (latest?.profile || latest?.glossary) {
      profileFacts = latest.profile ?? null;
      glossaryRaw =
        fromCosmos.glossarySuggestions.length > 0
          ? null
          : (latest.glossary ?? null);
      readBlob = true;
    }
  }

  if (!profileFacts && !glossaryRaw && blobPrefix) {
    const prefix = blobPrefix.endsWith("/") ? blobPrefix : `${blobPrefix}/`;
    const [legacyProfile, legacyGlossary] = await Promise.all([
      readV4Blob<ProfileFactsBlob>(`${prefix}profile-facts.json`),
      fromCosmos.glossarySuggestions.length > 0
        ? Promise.resolve(null)
        : readV4Blob<GlossaryRawBlob>(`${prefix}glossary-raw.json`),
    ]);
    profileFacts = legacyProfile;
    glossaryRaw = legacyGlossary;
    readBlob = Boolean(profileFacts || glossaryRaw);
  }

  if (profileFacts || glossaryRaw) {
    understanding = normalizeUnderstanding(profileFacts?.induction?.understanding);
    markets = normalizeMarkets(profileFacts?.markets);
    signals = normalizeSignals(profileFacts?.signals);
    strategyFromBlob = normalizeStrategy(profileFacts?.induction?.strategy);
    glossaryFromBlob = normalizeGlossarySuggestions(glossaryRaw);
  }

  const strategy = fromCosmos.strategy ?? strategyFromBlob;
  const glossarySuggestions =
    fromCosmos.glossarySuggestions.length > 0
      ? fromCosmos.glossarySuggestions
      : glossaryFromBlob;

  const hasCosmos = Boolean(fromCosmos.strategy || fromCosmos.glossarySuggestions.length > 0);
  const hasBlobDetail = Boolean(
    understanding || markets.length > 0 || signals || strategyFromBlob || glossaryFromBlob.length > 0,
  );

  let source: ShopScanArtifacts["source"] = "none";
  if (hasCosmos && (hasBlobDetail || readBlob)) source = "mixed";
  else if (hasCosmos) source = "cosmos";
  else if (hasBlobDetail) source = "blob";

  return {
    strategy,
    glossarySuggestions,
    understanding,
    markets,
    signals,
    source,
  };
}

function artifactsFromSummary(summary?: ShopScanSummary | null): {
  strategy: TerminologyStrategyView | null;
  glossarySuggestions: GlossarySuggestionView[];
} {
  return {
    strategy: normalizeStrategy(summary?.profileStrategy),
    glossarySuggestions: normalizeGlossarySuggestionsFromRows(summary?.glossarySuggestions),
  };
}

function normalizeStrategy(
  raw: TerminologyStrategyView | null | undefined,
): TerminologyStrategyView | null {
  if (!raw) return null;

  const brandTerms = stringList(raw.brandTerms, 20);
  const doNotTranslateTerms = stringList(raw.doNotTranslateTerms, 20);
  const seoTerms = stringList(raw.seoTerms, 15);
  const preferredTerms = (raw.preferredTerms ?? [])
    .map((t) => ({
      source: (t?.source ?? "").trim(),
      note: t?.note?.trim() || null,
    }))
    .filter((t) => t.source)
    .slice(0, 20);
  const moduleHints = (raw.moduleHints ?? [])
    .map((h) => ({
      module: (h?.module ?? "").trim(),
      tonePolicy: h?.tonePolicy?.trim() || null,
      keywordPolicy: h?.keywordPolicy?.trim() || null,
      literalVsAdaptive: h?.literalVsAdaptive?.trim() || null,
    }))
    .filter((h) => h.module)
    .slice(0, 10);

  if (
    brandTerms.length === 0 &&
    doNotTranslateTerms.length === 0 &&
    preferredTerms.length === 0 &&
    seoTerms.length === 0 &&
    moduleHints.length === 0
  ) {
    return null;
  }

  return { brandTerms, doNotTranslateTerms, preferredTerms, seoTerms, moduleHints };
}

function normalizeUnderstanding(raw: unknown): ShopUnderstandingView | null {
  if (!raw || typeof raw !== "object") return null;
  const u = raw as Record<string, unknown>;

  const industry = str(u.industry);
  const subIndustry = str(u.subIndustry);
  const brandPositioning = str(u.brandPositioning);
  const coreProductTypes = stringList(u.coreProductTypes, 12);
  const sellingPoints = stringList(u.sellingPoints, 8);
  const priceRange = str(u.priceRange);
  const voiceStyle = str(u.voiceStyle);
  const seoDirection = str(u.seoDirection);
  const marketNotes = stringList(u.marketNotes, 8);
  const description = str(u.description);
  const keywords = stringList(u.keywords, 20);

  if (
    !industry &&
    !subIndustry &&
    !brandPositioning &&
    coreProductTypes.length === 0 &&
    sellingPoints.length === 0 &&
    !priceRange &&
    !voiceStyle &&
    !seoDirection &&
    marketNotes.length === 0 &&
    !description &&
    keywords.length === 0
  ) {
    return null;
  }

  return {
    industry,
    subIndustry,
    brandPositioning,
    coreProductTypes,
    sellingPoints,
    priceRange,
    voiceStyle,
    seoDirection,
    marketNotes,
    description,
    keywords,
  };
}

function normalizeMarkets(raw: unknown): ShopMarketView[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((m) => {
      if (!m || typeof m !== "object") return null;
      const row = m as Record<string, unknown>;
      const name = str(row.name);
      if (!name) return null;
      return {
        name,
        handle: str(row.handle) ?? "",
        status: str(row.status) ?? "",
        baseCurrency: str(row.baseCurrency),
        locales: stringList(row.locales, 20),
      };
    })
    .filter((m): m is ShopMarketView => Boolean(m))
    .slice(0, 50);
}

function normalizeSignals(raw: unknown): ShopSignalsView | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;

  const weightedTopTerms = normalizeWeightedTerms(s.weightedTopTerms, 30);
  const weightedTopPhrases = normalizeWeightedTerms(s.weightedTopPhrases, 20);
  const brandTerms = stringList(s.brandTerms, 20);
  const categoryTerms = stringList(s.categoryTerms, 20);
  const menuTerms = stringList(s.menuTerms, 20);
  const representativeSamples = Array.isArray(s.representativeSamples)
    ? s.representativeSamples
        .map((sample) => {
          if (!sample || typeof sample !== "object") return null;
          const row = sample as Record<string, unknown>;
          const source = str(row.source);
          const text = str(row.text);
          if (!source || !text) return null;
          return { source, text };
        })
        .filter((x): x is { source: string; text: string } => Boolean(x))
        .slice(0, 40)
    : [];

  const sourceStats: Record<string, number> = {};
  if (s.sourceStats && typeof s.sourceStats === "object" && !Array.isArray(s.sourceStats)) {
    for (const [k, v] of Object.entries(s.sourceStats as Record<string, unknown>)) {
      const n = typeof v === "number" ? v : Number(v);
      if (k && Number.isFinite(n) && n > 0) sourceStats[k] = n;
    }
  }

  if (
    weightedTopTerms.length === 0 &&
    weightedTopPhrases.length === 0 &&
    brandTerms.length === 0 &&
    categoryTerms.length === 0 &&
    menuTerms.length === 0 &&
    representativeSamples.length === 0 &&
    Object.keys(sourceStats).length === 0
  ) {
    return null;
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

function normalizeWeightedTerms(
  raw: unknown,
  max: number,
): Array<{ term: string; score: number; count: number; sources: string[] }> {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((t) => {
      if (!t || typeof t !== "object") return null;
      const row = t as Record<string, unknown>;
      const term = str(row.term);
      if (!term) return null;
      const score = typeof row.score === "number" ? row.score : Number(row.score) || 0;
      const count = typeof row.count === "number" ? row.count : Number(row.count) || 0;
      const sources = stringList(row.sources, 10);
      return { term, score, count, sources };
    })
    .filter(
      (t): t is { term: string; score: number; count: number; sources: string[] } => Boolean(t),
    )
    .slice(0, max);
}

function normalizeGlossarySuggestionsFromRows(
  rows: ShopScanGlossarySuggestion[] | undefined,
): GlossarySuggestionView[] {
  const out: GlossarySuggestionView[] = [];
  const seen = new Set<string>();
  for (const row of rows ?? []) {
    const locale = (row.locale ?? "").trim();
    const source = (row.source ?? "").trim();
    const target = (row.target ?? "").trim();
    if (!locale || !source || !target) continue;
    const key = `${locale}\u0000${source}\u0000${target}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ locale, source, target });
  }
  return out;
}

function normalizeGlossarySuggestions(raw: GlossaryRawBlob | null): GlossarySuggestionView[] {
  const out: GlossarySuggestionView[] = [];
  const seen = new Set<string>();

  for (const row of raw?.perLocale ?? []) {
    const locale = (row.locale ?? "").trim();
    if (!locale) continue;
    for (const term of row.terms ?? []) {
      const source = (term.source ?? "").trim();
      const target = (term.target ?? "").trim();
      if (!source || !target) continue;
      const key = `${locale}\u0000${source}\u0000${target}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ locale, source, target });
    }
  }

  return out;
}

function stringList(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => String(v ?? "").trim())
    .filter(Boolean)
    .slice(0, max);
}

function str(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t || null;
}
