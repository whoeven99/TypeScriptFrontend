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

export type ThemeSceneProfileView = {
  sceneStats: Array<{ scene: string; count: number }>;
  roleStats: Array<{ role: string; count: number }>;
  sceneHints: Array<{
    module: string;
    keyPattern: string;
    namespace: string | null;
    resourcePattern: string | null;
    scene: string;
    role: string | null;
    tonePreference: string;
    creativity: string;
    confidence: number;
  }>;
  appNamespaces: string[];
  highConfidencePatterns: string[];
};

export type TranslationContextProfileView = {
  generatedAt: string | null;
  shopContext: {
    industry: string | null;
    subIndustry: string | null;
    brandTone: string | null;
    brandPositioning: string | null;
    description: string | null;
    keywords: string[];
    sellingPoints: string[];
    priceRange: string | null;
  } | null;
  terminologyProfile: {
    brandTerms: string[];
    doNotTranslateTerms: string[];
    preferredTerms: Array<{ source: string; note: string | null }>;
    seoTerms: string[];
  } | null;
  marketProfile: {
    markets: ShopMarketView[];
    publishedLocales: string[];
    marketNotes: string[];
    currencyContext: string[];
  } | null;
  themeSceneProfile: ThemeSceneProfileView | null;
  modulePolicyProfile: {
    moduleHints: Array<{
      module: string;
      tonePolicy: string | null;
      keywordPolicy: string | null;
      literalVsAdaptive: string | null;
    }>;
  } | null;
};

export type ShopScanArtifacts = {
  strategy: TerminologyStrategyView | null;
  glossarySuggestions: GlossarySuggestionView[];
  understanding: ShopUnderstandingView | null;
  markets: ShopMarketView[];
  signals: ShopSignalsView | null;
  themeSceneProfile: ThemeSceneProfileView | null;
  translationContextProfile: TranslationContextProfileView | null;
  source: "cosmos" | "blob" | "mixed" | "none";
};

type ProfileFactsBlob = {
  markets?: unknown;
  signals?: unknown;
  themeSceneProfile?: unknown;
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

type ThemeKeyProfileBlob = {
  themeSceneProfile?: unknown;
};

type TranslationContextProfileBlob = {
  generatedAt?: unknown;
  shopContext?: unknown;
  terminologyProfile?: unknown;
  marketProfile?: unknown;
  themeSceneProfile?: unknown;
  modulePolicyProfile?: unknown;
};

/**
 * 读取扫描产出的术语策略、术语建议，以及 Blob 中的理解/市场/信号明细。
 * strategy / glossary 优先 Cosmos summary；understanding / markets / signals 仅在 Blob。
 */
export async function loadShopScanArtifacts(
  blobPrefix: string | null | undefined,
  summary?: ShopScanSummary | null,
): Promise<ShopScanArtifacts> {
  const fromCosmos = artifactsFromSummary(summary);

  let understanding: ShopUnderstandingView | null = null;
  let markets: ShopMarketView[] = [];
  let signals: ShopSignalsView | null = null;
  let themeSceneProfile: ThemeSceneProfileView | null = null;
  let translationContextProfile: TranslationContextProfileView | null = null;
  let strategyFromBlob: TerminologyStrategyView | null = null;
  let glossaryFromBlob: GlossarySuggestionView[] = [];
  let readBlob = false;

  if (blobPrefix) {
    const prefix = blobPrefix.endsWith("/") ? blobPrefix : `${blobPrefix}/`;
    const [profileFacts, glossaryRaw, themeKeyProfile, contextProfile] = await Promise.all([
      readV4Blob<ProfileFactsBlob>(`${prefix}profile-facts.json`),
      fromCosmos.glossarySuggestions.length > 0
        ? Promise.resolve(null)
        : readV4Blob<GlossaryRawBlob>(`${prefix}glossary-raw.json`),
      readV4Blob<ThemeKeyProfileBlob>(`${prefix}theme-key-profile.json`),
      readV4Blob<TranslationContextProfileBlob>(`${prefix}translation-context-profile.json`),
    ]);
    readBlob = Boolean(profileFacts || glossaryRaw || themeKeyProfile || contextProfile);

    understanding = normalizeUnderstanding(profileFacts?.induction?.understanding);
    markets = normalizeMarkets(profileFacts?.markets);
    signals = normalizeSignals(profileFacts?.signals);
    themeSceneProfile =
      normalizeThemeSceneProfile(themeKeyProfile?.themeSceneProfile) ??
      normalizeThemeSceneProfile(profileFacts?.themeSceneProfile);
    translationContextProfile = normalizeTranslationContextProfile(contextProfile);
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
    understanding ||
      markets.length > 0 ||
      signals ||
      themeSceneProfile ||
      translationContextProfile ||
      strategyFromBlob ||
      glossaryFromBlob.length > 0,
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
    themeSceneProfile,
    translationContextProfile,
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

function normalizeThemeSceneProfile(raw: unknown): ThemeSceneProfileView | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;

  const sceneStats = Array.isArray(value.sceneStats)
    ? value.sceneStats
        .map((row) => {
          if (!row || typeof row !== "object") return null;
          const item = row as Record<string, unknown>;
          const scene = str(item.scene);
          const count = typeof item.count === "number" ? item.count : Number(item.count);
          if (!scene || !Number.isFinite(count) || count <= 0) return null;
          return { scene, count };
        })
        .filter((row): row is { scene: string; count: number } => Boolean(row))
        .slice(0, 20)
    : [];

  const roleStats = Array.isArray(value.roleStats)
    ? value.roleStats
        .map((row) => {
          if (!row || typeof row !== "object") return null;
          const item = row as Record<string, unknown>;
          const role = str(item.role);
          const count = typeof item.count === "number" ? item.count : Number(item.count);
          if (!role || !Number.isFinite(count) || count <= 0) return null;
          return { role, count };
        })
        .filter((row): row is { role: string; count: number } => Boolean(row))
        .slice(0, 20)
    : [];

  const sceneHints = Array.isArray(value.sceneHints)
    ? value.sceneHints
        .map((row) => {
          if (!row || typeof row !== "object") return null;
          const item = row as Record<string, unknown>;
          const module = str(item.module);
          const keyPattern = str(item.keyPattern);
          const scene = str(item.scene);
          if (!module || !keyPattern || !scene) return null;
          const confidence =
            typeof item.confidence === "number" ? item.confidence : Number(item.confidence);
          return {
            module,
            keyPattern,
            namespace: str(item.namespace),
            resourcePattern: str(item.resourcePattern),
            scene,
            role: str(item.role),
            tonePreference: str(item.tonePreference) ?? "balanced",
            creativity: str(item.creativity) ?? "low",
            confidence: Number.isFinite(confidence) ? confidence : 0,
          };
        })
        .filter(
          (
            row,
          ): row is {
            module: string;
            keyPattern: string;
            namespace: string | null;
            resourcePattern: string | null;
            scene: string;
            role: string | null;
            tonePreference: string;
            creativity: string;
            confidence: number;
          } => Boolean(row),
        )
        .slice(0, 80)
    : [];

  const appNamespaces = stringList(value.appNamespaces, 20);
  const highConfidencePatterns = stringList(value.highConfidencePatterns, 40);

  if (
    sceneStats.length === 0 &&
    roleStats.length === 0 &&
    sceneHints.length === 0 &&
    appNamespaces.length === 0 &&
    highConfidencePatterns.length === 0
  ) {
    return null;
  }

  return {
    sceneStats,
    roleStats,
    sceneHints,
    appNamespaces,
    highConfidencePatterns,
  };
}

function normalizeTranslationContextProfile(raw: unknown): TranslationContextProfileView | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;

  const shopContext = normalizeShopContext(value.shopContext);
  const terminologyProfile = normalizeTerminologyProfile(value.terminologyProfile);
  const marketProfile = normalizeMarketProfile(value.marketProfile);
  const themeSceneProfile = normalizeThemeSceneProfile(value.themeSceneProfile);
  const modulePolicyProfile = normalizeModulePolicyProfile(value.modulePolicyProfile);
  const generatedAt = str(value.generatedAt);

  if (
    !generatedAt &&
    !shopContext &&
    !terminologyProfile &&
    !marketProfile &&
    !themeSceneProfile &&
    !modulePolicyProfile
  ) {
    return null;
  }

  return {
    generatedAt,
    shopContext,
    terminologyProfile,
    marketProfile,
    themeSceneProfile,
    modulePolicyProfile,
  };
}

function normalizeShopContext(raw: unknown): TranslationContextProfileView["shopContext"] {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const industry = str(value.industry);
  const subIndustry = str(value.subIndustry);
  const brandTone = str(value.brandTone);
  const brandPositioning = str(value.brandPositioning);
  const description = str(value.description);
  const keywords = stringList(value.keywords, 20);
  const sellingPoints = stringList(value.sellingPoints, 10);
  const priceRange = str(value.priceRange);

  if (
    !industry &&
    !subIndustry &&
    !brandTone &&
    !brandPositioning &&
    !description &&
    keywords.length === 0 &&
    sellingPoints.length === 0 &&
    !priceRange
  ) {
    return null;
  }

  return {
    industry,
    subIndustry,
    brandTone,
    brandPositioning,
    description,
    keywords,
    sellingPoints,
    priceRange,
  };
}

function normalizeTerminologyProfile(
  raw: unknown,
): TranslationContextProfileView["terminologyProfile"] {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const brandTerms = stringList(value.brandTerms, 20);
  const doNotTranslateTerms = stringList(value.doNotTranslateTerms, 20);
  const seoTerms = stringList(value.seoTerms, 15);
  const preferredTerms = Array.isArray(value.preferredTerms)
    ? value.preferredTerms
        .map((row) => {
          if (!row || typeof row !== "object") return null;
          const item = row as Record<string, unknown>;
          const source = str(item.source);
          if (!source) return null;
          return { source, note: str(item.note) };
        })
        .filter((row): row is { source: string; note: string | null } => Boolean(row))
        .slice(0, 20)
    : [];

  if (
    brandTerms.length === 0 &&
    doNotTranslateTerms.length === 0 &&
    seoTerms.length === 0 &&
    preferredTerms.length === 0
  ) {
    return null;
  }

  return {
    brandTerms,
    doNotTranslateTerms,
    preferredTerms,
    seoTerms,
  };
}

function normalizeMarketProfile(raw: unknown): TranslationContextProfileView["marketProfile"] {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const markets = normalizeMarkets(value.markets);
  const publishedLocales = stringList(value.publishedLocales, 20);
  const marketNotes = stringList(value.marketNotes, 10);
  const currencyContext = stringList(value.currencyContext, 10);

  if (
    markets.length === 0 &&
    publishedLocales.length === 0 &&
    marketNotes.length === 0 &&
    currencyContext.length === 0
  ) {
    return null;
  }

  return {
    markets,
    publishedLocales,
    marketNotes,
    currencyContext,
  };
}

function normalizeModulePolicyProfile(
  raw: unknown,
): TranslationContextProfileView["modulePolicyProfile"] {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const moduleHints = Array.isArray(value.moduleHints)
    ? value.moduleHints
        .map((row) => {
          if (!row || typeof row !== "object") return null;
          const item = row as Record<string, unknown>;
          const module = str(item.module);
          if (!module) return null;
          return {
            module,
            tonePolicy: str(item.tonePolicy),
            keywordPolicy: str(item.keywordPolicy),
            literalVsAdaptive: str(item.literalVsAdaptive),
          };
        })
        .filter(
          (
            row,
          ): row is {
            module: string;
            tonePolicy: string | null;
            keywordPolicy: string | null;
            literalVsAdaptive: string | null;
          } => Boolean(row),
        )
        .slice(0, 20)
    : [];

  if (moduleHints.length === 0) return null;
  return { moduleHints };
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
