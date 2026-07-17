import type { ShopSignalBundle } from "./signalExtraction.js";
import type { TerminologyStrategy, ShopUnderstanding } from "./profileInduction.js";
import type { ShopMarket, ShopProfileFacts } from "./shopContext.js";
import type { ThemeSceneProfile } from "./themeKeyIntelligence.js";
import {
  buildLocalizationContextLayers,
  type CategoryTerminologyPack,
  type LocalizationContextLayers,
  type LocalizationTerm,
  type SeriesArticleTerminologyPack,
} from "./categoryTerminologyPreload.js";

export type TranslationContextProfile = {
  generatedAt: string;
  shopBaseline: {
    brandTone: string | null;
    brandPositioning: string | null;
    globalProtectedTerms: string[];
    globalDoNotTranslateTerms: string[];
  } | null;
  categoryTerminologyPack: {
    key: string | null;
    professionalTerms: Array<{ source: string; note: string | null }>;
  } | null;
  seriesArticleTerminologyPack: {
    key: string | null;
    professionalTerms: Array<{ source: string; note: string | null }>;
  } | null;
  productFamilyProtectedTerms: {
    terms: string[];
  } | null;
  regionalStyleProfile: {
    guidanceNotes: string[];
  } | null;
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
  const derivedLayers = buildLocalizationContextLayers({
    facts,
    signals,
    understanding,
  });
  const mergedLayers = mergeLocalizationLayers(derivedLayers, strategy);
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
  const terminologyProfile = buildLegacyTerminologyProfile(mergedLayers);
  const regionalStyleProfile = buildRegionalStyleProfile({
    strategy,
    mergedLayers,
  });

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
            literalVsAdaptive: hint.literalVsAdaptive,
          })),
        }
      : null;

  return {
    generatedAt: now,
    shopBaseline: mergedLayers?.shopBaseline ?? null,
    categoryTerminologyPack: mergedLayers?.categoryTerminologyPack ?? null,
    seriesArticleTerminologyPack: mergedLayers?.seriesArticleTerminologyPack ?? null,
    productFamilyProtectedTerms: mergedLayers?.productFamilyProtectedTerms ?? null,
    regionalStyleProfile,
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

function mergeLocalizationLayers(
  derived: LocalizationContextLayers | null,
  strategy: TerminologyStrategy | null,
): LocalizationContextLayers | null {
  const shopBaseline = derived?.shopBaseline
    ? {
        ...derived.shopBaseline,
        globalProtectedTerms: uniqueNonEmpty([
          ...derived.shopBaseline.globalProtectedTerms,
          ...(strategy?.brandTerms ?? []),
        ]).slice(0, 20),
        globalDoNotTranslateTerms: uniqueNonEmpty([
          ...derived.shopBaseline.globalDoNotTranslateTerms,
          ...(strategy?.doNotTranslateTerms ?? []),
        ]).slice(0, 20),
      }
    : strategy && (strategy.brandTerms.length > 0 || strategy.doNotTranslateTerms.length > 0)
      ? {
          brandTone: null,
          brandPositioning: null,
          globalProtectedTerms: uniqueNonEmpty(strategy.brandTerms).slice(0, 20),
          globalDoNotTranslateTerms: uniqueNonEmpty(strategy.doNotTranslateTerms).slice(0, 20),
        }
      : null;

  const categoryTerminologyPack = mergeProfessionalPack(
    derived?.categoryTerminologyPack ?? null,
    strategy?.preferredTerms ?? [],
    20,
  );
  const seriesArticleTerminologyPack = mergeProfessionalPack(
    derived?.seriesArticleTerminologyPack ?? null,
    [],
    16,
  );

  const productFamilyProtectedTerms = derived?.productFamilyProtectedTerms
    ? {
        terms: uniqueNonEmpty([
          ...derived.productFamilyProtectedTerms.terms,
          ...(strategy?.brandTerms ?? []).filter((term) => term.includes(" ")),
          ...(strategy?.doNotTranslateTerms ?? []).filter((term) => term.includes(" ")),
        ]).slice(0, 20),
      }
    : strategy &&
        [...strategy.brandTerms, ...strategy.doNotTranslateTerms].some((term) => term.includes(" "))
      ? {
          terms: uniqueNonEmpty([
            ...strategy.brandTerms.filter((term) => term.includes(" ")),
            ...strategy.doNotTranslateTerms.filter((term) => term.includes(" ")),
          ]).slice(0, 20),
        }
      : null;

  if (!shopBaseline && !categoryTerminologyPack && !seriesArticleTerminologyPack && !productFamilyProtectedTerms) {
    return null;
  }

  return {
    shopBaseline,
    categoryTerminologyPack,
    seriesArticleTerminologyPack,
    productFamilyProtectedTerms,
  };
}

function mergeProfessionalPack(
  pack: CategoryTerminologyPack | SeriesArticleTerminologyPack | null,
  appendedTerms: Array<{ source: string; note: string | null }>,
  limit: number,
): CategoryTerminologyPack | SeriesArticleTerminologyPack | null {
  const professionalTerms = mergePreferredTerms(
    pack?.professionalTerms ?? [],
    appendedTerms,
  ).slice(0, limit);
  if (professionalTerms.length === 0) return pack ? { ...pack, professionalTerms: [] } : null;
  if (!pack) {
    return {
      key: null,
      professionalTerms,
    };
  }
  return {
    ...pack,
    professionalTerms,
  };
}

function buildLegacyTerminologyProfile(
  layers: LocalizationContextLayers | null,
): TranslationContextProfile["terminologyProfile"] {
  if (!layers) return null;
  const brandTerms = uniqueNonEmpty([
    ...(layers.shopBaseline?.globalProtectedTerms ?? []),
    ...(layers.productFamilyProtectedTerms?.terms ?? []),
  ]).slice(0, 20);
  const doNotTranslateTerms = uniqueNonEmpty([
    ...(layers.shopBaseline?.globalDoNotTranslateTerms ?? []),
    ...(layers.productFamilyProtectedTerms?.terms ?? []),
  ]).slice(0, 20);
  const preferredTerms = mergePreferredTerms(
    layers.categoryTerminologyPack?.professionalTerms ?? [],
    layers.seriesArticleTerminologyPack?.professionalTerms ?? [],
  ).slice(0, 20);

  if (brandTerms.length === 0 && doNotTranslateTerms.length === 0 && preferredTerms.length === 0) {
    return null;
  }

  return {
    brandTerms,
    doNotTranslateTerms,
    preferredTerms,
  };
}

function buildRegionalStyleProfile(args: {
  strategy: TerminologyStrategy | null;
  mergedLayers: LocalizationContextLayers | null;
}): TranslationContextProfile["regionalStyleProfile"] {
  const guidanceNotes = uniqueNonEmpty([
    ...(args.strategy?.regionalStyleGuidance ?? []),
    args.mergedLayers?.categoryTerminologyPack?.professionalTerms.length
      ? "Use established local industry wording instead of literal English phrasing."
      : "",
    args.mergedLayers?.seriesArticleTerminologyPack?.professionalTerms.length
      ? "For editorial and guide content, prefer wording that reads like locally written expert content."
      : "",
    args.mergedLayers?.productFamilyProtectedTerms?.terms.length
      ? "Keep protected product family names stable and unchanged across the whole text."
      : "",
  ]).slice(0, 8);

  return guidanceNotes.length > 0 ? { guidanceNotes } : null;
}
