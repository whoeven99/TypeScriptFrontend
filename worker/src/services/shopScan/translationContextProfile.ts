import type { ShopSignalBundle } from "./signalExtraction.js";
import type { TerminologyStrategy, ShopUnderstanding } from "./profileInduction.js";
import type { ShopMarket, ShopProfileFacts } from "./shopContext.js";
import type { ThemeSceneProfile } from "./themeKeyIntelligence.js";
import { buildCategoryTerminologyPreload } from "./categoryTerminologyPreload.js";

export type TranslationContextProfile = {
  generatedAt: string;
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
    markets: Array<{
      name: string;
      handle: string;
      status: string;
      baseCurrency: string | null;
      locales: string[];
    }>;
    publishedLocales: string[];
    marketNotes: string[];
    currencyContext: string[];
  } | null;
  themeSceneProfile: ThemeSceneProfile | null;
  modulePolicyProfile: {
    moduleHints: Array<{
      module: string;
      tonePolicy: string | null;
      keywordPolicy: string | null;
      literalVsAdaptive: string | null;
    }>;
  } | null;
};

export function buildTranslationContextProfile(args: {
  publishedLocales: string[];
  markets: ShopMarket[];
  facts?: ShopProfileFacts | null;
  signals?: ShopSignalBundle | null;
  understanding: ShopUnderstanding | null;
  strategy: TerminologyStrategy | null;
  themeSceneProfile: ThemeSceneProfile | null;
  generatedAt?: string;
}): TranslationContextProfile {
  const {
    publishedLocales,
    markets,
    facts,
    signals,
    understanding,
    strategy,
    themeSceneProfile,
    generatedAt,
  } = args;

  const now = generatedAt ?? new Date().toISOString();
  const shopContext = understanding
    ? {
        industry: understanding.industry,
        subIndustry: understanding.subIndustry,
        brandTone: understanding.voiceStyle,
        brandPositioning: understanding.brandPositioning,
        description: understanding.description || null,
        keywords: understanding.keywords.slice(0, 15),
        sellingPoints: understanding.sellingPoints.slice(0, 8),
        priceRange: understanding.priceRange,
      }
    : null;

  const preloadedTerminology = buildCategoryTerminologyPreload({
    facts,
    signals,
    understanding,
  });
  const mergedPreferredTerms = mergePreferredTerms(
    preloadedTerminology?.preferredTerms ?? [],
    strategy?.preferredTerms ?? [],
  );
  const terminologyProfile =
    strategy || preloadedTerminology
      ? {
          brandTerms: uniqueNonEmpty([
            ...(preloadedTerminology?.brandTerms ?? []),
            ...(strategy?.brandTerms ?? []),
          ]).slice(0, 20),
          doNotTranslateTerms: uniqueNonEmpty([
            ...(preloadedTerminology?.doNotTranslateTerms ?? []),
            ...(strategy?.doNotTranslateTerms ?? []),
          ]).slice(0, 20),
          preferredTerms: mergedPreferredTerms.slice(0, 20),
          seoTerms: uniqueNonEmpty([
            ...(preloadedTerminology?.seoTerms ?? []),
            ...(strategy?.seoTerms ?? []),
          ]).slice(0, 15),
        }
      : null;

  const marketProfile =
    markets.length > 0 || publishedLocales.length > 0 || (understanding?.marketNotes.length ?? 0) > 0
      ? {
          markets: markets.slice(0, 20).map((market) => ({
            name: market.name,
            handle: market.handle,
            status: market.status,
            baseCurrency: market.baseCurrency,
            locales: market.locales.slice(0, 10),
          })),
          publishedLocales: publishedLocales.slice(0, 20),
          marketNotes: understanding?.marketNotes.slice(0, 8) ?? [],
          currencyContext: uniqueNonEmpty(markets.map((market) => market.baseCurrency ?? "")).slice(0, 10),
        }
      : null;

  const modulePolicyProfile =
    strategy && strategy.moduleHints.length > 0
      ? {
          moduleHints: strategy.moduleHints.slice(0, 10).map((hint) => ({
            module: hint.module,
            tonePolicy: hint.tonePolicy,
            keywordPolicy: hint.keywordPolicy,
            literalVsAdaptive: hint.literalVsAdaptive,
          })),
        }
      : null;

  return {
    generatedAt: now,
    shopContext,
    terminologyProfile,
    marketProfile,
    themeSceneProfile,
    modulePolicyProfile,
  };
}

function uniqueNonEmpty(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

function mergePreferredTerms(
  primary: Array<{ source: string; note: string | null }>,
  fallback: Array<{ source: string; note: string | null }>,
): Array<{ source: string; note: string | null }> {
  const seen = new Map<string, { source: string; note: string | null }>();

  for (const entry of [...primary, ...fallback]) {
    const source = entry.source.trim();
    if (!source) continue;
    const key = source.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, {
        source,
        note: entry.note?.trim() || null,
      });
      continue;
    }

    const existing = seen.get(key);
    if (existing && !existing.note && entry.note?.trim()) {
      existing.note = entry.note.trim();
    }
  }

  return [...seen.values()];
}
