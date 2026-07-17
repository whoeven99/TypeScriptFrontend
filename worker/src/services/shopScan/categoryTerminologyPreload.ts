import type { ShopSignalBundle } from "./signalExtraction.js";
import type { ShopUnderstanding } from "./profileInduction.js";
import type { ShopProfileFacts } from "./shopContext.js";

export type LocalizationTerm = {
  source: string;
  note: string | null;
};

export type ShopBaselineLayer = {
  brandTone: string | null;
  brandPositioning: string | null;
  globalProtectedTerms: string[];
  globalDoNotTranslateTerms: string[];
};

export type CategoryTerminologyPack = {
  key: string | null;
  professionalTerms: LocalizationTerm[];
};

export type SeriesArticleTerminologyPack = {
  key: string | null;
  professionalTerms: LocalizationTerm[];
};

export type ProductFamilyProtectedTerms = {
  terms: string[];
};

export type LocalizationContextLayers = {
  shopBaseline: ShopBaselineLayer | null;
  categoryTerminologyPack: CategoryTerminologyPack | null;
  seriesArticleTerminologyPack: SeriesArticleTerminologyPack | null;
  productFamilyProtectedTerms: ProductFamilyProtectedTerms | null;
};

export type PreloadedTerminology = {
  brandTerms: string[];
  doNotTranslateTerms: string[];
  preferredTerms: Array<{ source: string; note: string | null }>;
} | null;

const MAX_PRELOADED_BRAND_TERMS = 12;
const MAX_PRELOADED_LOCKED_TERMS = 16;
const MAX_PRELOADED_PREFERRED_TERMS = 16;
const MAX_PRELOADED_SERIES_TERMS = 12;

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "at",
  "by",
  "for",
  "from",
  "in",
  "into",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
  "your",
  "our",
  "new",
  "best",
  "top",
  "sale",
  "shop",
  "all",
]);

const LINKING_TOKENS = new Set(["and", "for", "in", "of", "on", "to", "with"]);

const VARIANT_STOPWORDS = new Set([
  "bundle",
  "bundles",
  "color",
  "colours",
  "colors",
  "gram",
  "grams",
  "inch",
  "inches",
  "length",
  "pack",
  "packs",
  "pc",
  "pcs",
  "piece",
  "pieces",
  "size",
  "sizes",
]);

const CATEGORY_TERM_NOTE =
  "Category term. Use one canonical localized term consistently across related product content; do not switch between synonyms.";
const SERIES_TERM_NOTE =
  "Series/article term. Prefer locally natural editorial wording that stays consistent across related guides and articles.";

type DisplayToken = {
  original: string;
  normalized: string;
};

export function buildCategoryTerminologyPreload(args: {
  facts: ShopProfileFacts | null | undefined;
  signals?: ShopSignalBundle | null;
  understanding?: ShopUnderstanding | null;
}): PreloadedTerminology {
  const layers = buildLocalizationContextLayers(args);
  if (!layers) return null;

  const brandTerms = uniqueNonEmpty([
    ...(layers.shopBaseline?.globalProtectedTerms ?? []),
    ...(layers.productFamilyProtectedTerms?.terms ?? []),
  ]).slice(0, MAX_PRELOADED_BRAND_TERMS);

  const doNotTranslateTerms = uniqueNonEmpty([
    ...(layers.shopBaseline?.globalDoNotTranslateTerms ?? []),
    ...(layers.productFamilyProtectedTerms?.terms ?? []),
  ]).slice(0, MAX_PRELOADED_LOCKED_TERMS);

  const preferredTerms = uniqueLocalizationTerms([
    ...(layers.categoryTerminologyPack?.professionalTerms ?? []),
    ...(layers.seriesArticleTerminologyPack?.professionalTerms ?? []),
  ]).slice(0, MAX_PRELOADED_PREFERRED_TERMS);

  if (brandTerms.length === 0 && doNotTranslateTerms.length === 0 && preferredTerms.length === 0) {
    return null;
  }

  return {
    brandTerms,
    doNotTranslateTerms,
    preferredTerms,
  };
}

export function buildLocalizationContextLayers(args: {
  facts: ShopProfileFacts | null | undefined;
  signals?: ShopSignalBundle | null;
  understanding?: ShopUnderstanding | null;
}): LocalizationContextLayers | null {
  const { facts, signals, understanding } = args;
  if (!facts) return null;

  const vendors = uniqueNonEmpty(facts.vendors).filter(looksStableBrandTerm);
  const collectionTerms = uniqueNonEmpty(facts.collectionTitles).filter(looksCategoryCollectionTitle);
  const baseCategoryTerms = uniqueNonEmpty([
    ...facts.productTypes,
    ...collectionTerms,
    ...(signals?.categoryTerms ?? []),
    ...(understanding?.coreProductTypes ?? []),
  ]).filter(looksUsefulCategoryTerm);
  const categoryTermKeys = new Set(baseCategoryTerms.map(normalizeKey));
  const titleHeadTerms = extractProductTitleHeadTerms(
    facts.topProductTitles,
    vendors,
    categoryTermKeys,
  );
  const lockedBrandPhrases = extractLockedBrandPhrases(facts.topProductTitles, vendors);
  const articleSeriesKey = extractArticleSeriesKey(facts.articleTitles);
  const articleSeriesTerms = extractArticleSeriesTerms(facts, signals);

  const shopBaseline: ShopBaselineLayer | null =
    vendors.length > 0 || understanding?.voiceStyle || understanding?.brandPositioning
      ? {
          brandTone: understanding?.voiceStyle?.trim() || null,
          brandPositioning: understanding?.brandPositioning?.trim() || null,
          globalProtectedTerms: vendors.slice(0, MAX_PRELOADED_BRAND_TERMS),
          globalDoNotTranslateTerms: vendors.slice(0, MAX_PRELOADED_LOCKED_TERMS),
        }
      : null;

  const categoryProfessionalTerms = uniqueLocalizationTerms([
    ...toLocalizationTerms(baseCategoryTerms, CATEGORY_TERM_NOTE),
    ...toLocalizationTerms(titleHeadTerms, CATEGORY_TERM_NOTE),
  ]).slice(0, MAX_PRELOADED_PREFERRED_TERMS);
  const categoryTerminologyPack: CategoryTerminologyPack | null =
    categoryProfessionalTerms.length > 0
      ? {
          key:
            firstNonEmpty([
              understanding?.subIndustry ?? null,
              understanding?.industry ?? null,
              facts.productTypes[0] ?? null,
              collectionTerms[0] ?? null,
            ]) ?? null,
          professionalTerms: categoryProfessionalTerms,
        }
      : null;

  const seriesProfessionalTerms = uniqueLocalizationTerms([
    ...toLocalizationTerms(articleSeriesTerms, SERIES_TERM_NOTE),
  ]).slice(0, MAX_PRELOADED_SERIES_TERMS);
  const seriesArticleTerminologyPack: SeriesArticleTerminologyPack | null =
    seriesProfessionalTerms.length > 0
      ? {
          key: articleSeriesKey,
          professionalTerms: seriesProfessionalTerms,
        }
      : null;

  const productFamilyTerms = uniqueNonEmpty([
    ...lockedBrandPhrases,
  ]).slice(0, MAX_PRELOADED_LOCKED_TERMS);
  const productFamilyProtectedTerms: ProductFamilyProtectedTerms | null =
    productFamilyTerms.length > 0
      ? {
          terms: productFamilyTerms,
        }
      : null;

  if (
    !shopBaseline &&
    !categoryTerminologyPack &&
    !seriesArticleTerminologyPack &&
    !productFamilyProtectedTerms
  ) {
    return null;
  }

  return {
    shopBaseline,
    categoryTerminologyPack,
    seriesArticleTerminologyPack,
    productFamilyProtectedTerms,
  };
}

function extractProductTitleHeadTerms(
  titles: string[],
  vendors: string[],
  knownCategoryKeys: Set<string>,
): string[] {
  const vendorTokenKeys = new Set(
    vendors.flatMap((vendor) => tokenizeDisplay(vendor).map((token) => token.normalized)),
  );
  const counts = new Map<string, { phrase: string; count: number }>();

  for (const title of titles) {
    const tokens = tokenizeDisplay(title);
    if (tokens.length === 0) continue;

    const cropped = stripVendorPrefix(tokens, vendorTokenKeys);
    const headPhrase = buildHeadPhrase(cropped);
    if (!headPhrase) continue;

    const key = normalizeKey(headPhrase);
    if (!key) continue;
    if (!knownCategoryKeys.has(key)) {
      const next = counts.get(key);
      if (next) next.count += 1;
      else counts.set(key, { phrase: headPhrase, count: 1 });
      continue;
    }

    counts.set(key, {
      phrase: headPhrase,
      count: Math.max(2, counts.get(key)?.count ?? 0),
    });
  }

  return [...counts.values()]
    .filter(({ phrase, count }) => count >= 2 || knownCategoryKeys.has(normalizeKey(phrase)))
    .sort((left, right) => right.count - left.count || right.phrase.length - left.phrase.length)
    .map((entry) => entry.phrase)
    .filter(looksUsefulCategoryTerm)
    .slice(0, MAX_PRELOADED_PREFERRED_TERMS);
}

function extractLockedBrandPhrases(titles: string[], vendors: string[]): string[] {
  const out: string[] = [];
  for (const vendor of vendors) {
    const vendorTokens = tokenizeDisplay(vendor);
    if (vendorTokens.length === 0) continue;
    const vendorKey = vendorTokens.map((token) => token.normalized).join(" ");

    for (const title of titles) {
      const tokens = tokenizeDisplay(title);
      const titleKey = tokens
        .slice(0, vendorTokens.length)
        .map((token) => token.normalized)
        .join(" ");
      if (titleKey !== vendorKey) continue;

      const phraseTokens: DisplayToken[] = [...vendorTokens];
      for (const token of tokens.slice(vendorTokens.length)) {
        if (isHardVariantBoundary(token.normalized)) break;
        if (phraseTokens.length >= 4) break;
        if (token.normalized.length < 2) break;
        phraseTokens.push(token);
      }

      if (phraseTokens.length <= vendorTokens.length) continue;
      out.push(phraseTokens.map((token) => token.original).join(" "));
    }
  }
  return uniqueNonEmpty(out);
}

function extractArticleSeriesKey(articleTitles: string[]): string | null {
  const phrases = extractArticleTitleHeadTerms(articleTitles);
  return phrases[0] ?? null;
}

function extractArticleSeriesTerms(
  facts: ShopProfileFacts,
  signals?: ShopSignalBundle | null,
): string[] {
  const titleTerms = extractArticleTitleHeadTerms(facts.articleTitles);
  const phraseTerms =
    signals?.weightedTopPhrases
      ?.filter((term) =>
        term.sources.some((source) => source === "article_title" || source === "article_summary"),
      )
      .map((term) => term.term) ?? [];
  return uniqueNonEmpty([...titleTerms, ...phraseTerms]).filter(looksUsefulSeriesTerm);
}

function extractArticleTitleHeadTerms(titles: string[]): string[] {
  const counts = new Map<string, { phrase: string; count: number }>();
  for (const title of titles) {
    const tokens = tokenizeDisplay(title);
    const headPhrase = buildHeadPhrase(tokens);
    if (!headPhrase) continue;
    const key = normalizeKey(headPhrase);
    if (!key) continue;
    const next = counts.get(key);
    if (next) next.count += 1;
    else counts.set(key, { phrase: headPhrase, count: 1 });
  }

  return [...counts.values()]
    .filter(({ phrase, count }) => count >= 2 || phrase.split(/\s+/).length >= 3)
    .sort((left, right) => right.count - left.count || right.phrase.length - left.phrase.length)
    .map((entry) => entry.phrase)
    .filter(looksUsefulSeriesTerm)
    .slice(0, MAX_PRELOADED_SERIES_TERMS);
}

function buildHeadPhrase(tokens: DisplayToken[]): string | null {
  const phraseTokens: DisplayToken[] = [];
  for (const token of tokens) {
    if (isHardVariantBoundary(token.normalized)) {
      if (phraseTokens.length > 0) break;
      continue;
    }

    if (token.normalized.length < 2) {
      if (phraseTokens.length > 0) break;
      continue;
    }

    if (STOPWORDS.has(token.normalized)) {
      if (phraseTokens.length === 0) continue;
      if (!LINKING_TOKENS.has(token.normalized)) break;
    }

    phraseTokens.push(token);
    if (phraseTokens.length >= 4) break;
  }

  const phrase = phraseTokens.map((token) => token.original).join(" ").trim();
  if (!looksUsefulCategoryTerm(phrase)) return null;
  return phrase;
}

function stripVendorPrefix(tokens: DisplayToken[], vendorTokenKeys: Set<string>): DisplayToken[] {
  let index = 0;
  while (index < tokens.length && vendorTokenKeys.has(tokens[index]?.normalized ?? "")) {
    index += 1;
  }
  return tokens.slice(index);
}

function tokenizeDisplay(input: string): DisplayToken[] {
  const matches = input.match(/[\p{L}\p{N}]+/gu) ?? [];
  return matches
    .map((part) => ({
      original: part.trim(),
      normalized: normalizeKey(part),
    }))
    .filter((token) => token.original && token.normalized);
}

function uniquePreferredTerms(values: string[]): Array<{ source: string; note: string | null }> {
  return uniqueLocalizationTerms(toLocalizationTerms(values, CATEGORY_TERM_NOTE));
}

function uniqueNonEmpty(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const normalized = normalizeSpaces(value);
    const key = normalizeKey(normalized);
    if (!normalized || !key || seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }
  return out;
}

function looksCategoryCollectionTitle(value: string): boolean {
  const normalized = normalizeSpaces(value);
  if (!looksUsefulCategoryTerm(normalized)) return false;
  const tokens = tokenizeDisplay(normalized);
  if (tokens.length === 0 || tokens.length > 6) return false;
  if (/[.!?;:]/.test(normalized)) return false;
  return true;
}

function looksUsefulCategoryTerm(value: string): boolean {
  const normalized = normalizeSpaces(value);
  if (!normalized) return false;
  if (normalized.length < 3 || normalized.length > 80) return false;

  const tokens = tokenizeDisplay(normalized).map((token) => token.normalized);
  if (tokens.length === 0 || tokens.length > 6) return false;
  if (tokens.every((token) => STOPWORDS.has(token))) return false;
  if (tokens.every((token) => isHardVariantBoundary(token))) return false;
  return true;
}

function looksUsefulSeoTerm(value: string): boolean {
  if (!looksUsefulCategoryTerm(value)) return false;
  const tokens = tokenizeDisplay(value).map((token) => token.normalized);
  return !tokens.every((token) => VARIANT_STOPWORDS.has(token));
}

function looksUsefulSeriesTerm(value: string): boolean {
  const normalized = normalizeSpaces(value);
  if (!normalized) return false;
  if (normalized.length < 4 || normalized.length > 120) return false;
  const tokens = tokenizeDisplay(normalized);
  if (tokens.length === 0 || tokens.length > 8) return false;
  return !tokens.every((token) => STOPWORDS.has(token.normalized));
}

function looksStableBrandTerm(value: string): boolean {
  const normalized = normalizeSpaces(value);
  if (!normalized) return false;
  if (normalized.length < 2 || normalized.length > 60) return false;
  return tokenizeDisplay(normalized).length > 0;
}

function isHardVariantBoundary(token: string): boolean {
  if (!token) return true;
  if (/^\d+$/.test(token)) return true;
  if (/^\d+(cm|mm|g|kg|oz|ml|inch|inches)$/.test(token)) return true;
  if (VARIANT_STOPWORDS.has(token)) return true;
  return false;
}

function normalizeSpaces(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeKey(value: string): string {
  return normalizeSpaces(value)
    .toLowerCase()
    .replace(/['’"]/g, "")
    .trim();
}

function toLocalizationTerms(values: string[], note: string): LocalizationTerm[] {
  return values.map((source) => ({ source, note }));
}

function uniqueLocalizationTerms(values: LocalizationTerm[]): LocalizationTerm[] {
  const seen = new Map<string, LocalizationTerm>();
  for (const value of values) {
    const source = normalizeSpaces(value.source);
    const key = normalizeKey(source);
    if (!source || !key) continue;
    if (!seen.has(key)) {
      seen.set(key, {
        source,
        note: value.note?.trim() || null,
      });
      continue;
    }
    const existing = seen.get(key);
    if (existing && !existing.note && value.note?.trim()) {
      existing.note = value.note.trim();
    }
  }
  return [...seen.values()];
}

function firstNonEmpty(values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return null;
}
