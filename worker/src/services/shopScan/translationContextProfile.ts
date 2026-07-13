import type { TerminologyStrategy, ShopUnderstanding } from "./profileInduction.js";
import type { ShopMarket } from "./shopContext.js";
import type { ThemeSceneProfile } from "./themeKeyIntelligence.js";

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
  understanding: ShopUnderstanding | null;
  strategy: TerminologyStrategy | null;
  themeSceneProfile: ThemeSceneProfile | null;
  generatedAt?: string;
}): TranslationContextProfile {
  const {
    publishedLocales,
    markets,
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

  const terminologyProfile = strategy
    ? {
        brandTerms: strategy.brandTerms.slice(0, 20),
        doNotTranslateTerms: strategy.doNotTranslateTerms.slice(0, 20),
        preferredTerms: strategy.preferredTerms.slice(0, 20),
        seoTerms: strategy.seoTerms.slice(0, 15),
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
