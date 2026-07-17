import { blobRead, blobWrite } from "../blobV4.js";
import type { TerminologyStrategy, ShopUnderstanding } from "./profileInduction.js";
import type { ShopSignalBundle } from "./signalExtraction.js";
import type {
  ShopCatalogFacts,
  ShopEditorialFacts,
  ShopIdentityFacts,
  ShopLocaleRow,
  ShopMarket,
  ShopProfileFacts,
} from "./shopContext.js";
import type { ThemeSceneProfile } from "./themeKeyIntelligence.js";
import type { ThemeTextSample } from "./translationSamples.js";
import {
  buildTranslationContextProfile,
  type TranslationContextProfile,
} from "./translationContextProfile.js";

const MODULE_DIR = "scan-modules";
const MODULE_FILES = {
  identitySource: "shop-identity-source.json",
  marketSource: "market-locale-source.json",
  catalogSource: "catalog-source.json",
  editorialSource: "editorial-source.json",
  styleSource: "style-source.json",
  signalBundle: "signal-bundle.json",
  identityContext: "shop-identity-context.json",
  marketContext: "market-locale-context.json",
  catalogContext: "catalog-context.json",
  editorialContext: "editorial-context.json",
  styleContext: "style-context.json",
} as const;

type OptionalInduction = {
  understanding: ShopUnderstanding | null;
  strategy: TerminologyStrategy | null;
} | null;

export type ProfileModuleSources = {
  facts: ShopProfileFacts | null;
  markets: ShopMarket[];
  themeTexts: ThemeTextSample[];
  signals: ShopSignalBundle | null;
};

type ShopIdentitySourceBlob = {
  stage: "shopIdentitySource";
  shop: string;
  scannedAt: string;
  sourceBlobPrefix?: string;
  facts: Pick<ShopProfileFacts, "shopName" | "primaryDomain" | "currencyCode" | "vendors">;
};

type MarketLocaleSourceBlob = {
  stage: "marketLocaleSource";
  shop: string;
  scannedAt: string;
  sourceBlobPrefix?: string;
  locales: ShopLocaleRow[];
  publishedLocales: string[];
  markets: ShopMarket[];
};

type CatalogSourceBlob = {
  stage: "catalogSource";
  shop: string;
  scannedAt: string;
  sourceBlobPrefix?: string;
  facts: Pick<
    ShopProfileFacts,
    | "productTypes"
    | "vendors"
    | "topProductTitles"
    | "collectionTitles"
    | "collectionDescriptions"
    | "menuTitles"
    | "tags"
  >;
};

type EditorialSourceBlob = {
  stage: "editorialSource";
  shop: string;
  scannedAt: string;
  sourceBlobPrefix?: string;
  facts: Pick<ShopProfileFacts, "articleTitles" | "articleSummaries">;
};

type StyleSourceBlob = {
  stage: "styleSource";
  shop: string;
  scannedAt: string;
  sourceBlobPrefix?: string;
  themeTexts: ThemeTextSample[];
};

type SignalBundleBlob = {
  stage: "signalBundle";
  shop: string;
  scannedAt: string;
  sourceBlobPrefix?: string;
  signals: ShopSignalBundle | null;
};

function modulePath(blobPrefix: string, fileName: string): string {
  const prefix = blobPrefix.endsWith("/") ? blobPrefix.slice(0, -1) : blobPrefix;
  return `${prefix}/${MODULE_DIR}/${fileName}`;
}

function toPublishedLocales(locales: ShopLocaleRow[]): string[] {
  return locales.filter((locale) => locale.published).map((locale) => locale.locale);
}

export async function writeProfileModuleArtifacts(args: {
  blobPrefix: string;
  shop: string;
  locales: ShopLocaleRow[];
  facts: ShopProfileFacts;
  markets: ShopMarket[];
  themeTexts: ThemeTextSample[];
  signals: ShopSignalBundle | null;
  themeSceneProfile: ThemeSceneProfile | null;
  induction: OptionalInduction;
  scannedAt: string;
  sourceBlobPrefix?: string;
}): Promise<TranslationContextProfile> {
  const {
    blobPrefix,
    shop,
    locales,
    facts,
    markets,
    themeTexts,
    signals,
    themeSceneProfile,
    induction,
    scannedAt,
    sourceBlobPrefix,
  } = args;

  const publishedLocales = toPublishedLocales(locales);
  const translationContextProfile = buildTranslationContextProfile({
    publishedLocales,
    markets,
    facts,
    signals,
    understanding: induction?.understanding ?? null,
    strategy: induction?.strategy ?? null,
    themeSceneProfile,
    generatedAt: scannedAt,
  });

  const writes = [
    blobWrite(modulePath(blobPrefix, MODULE_FILES.identitySource), {
      stage: "shopIdentitySource",
      shop,
      scannedAt,
      sourceBlobPrefix,
      facts: {
        shopName: facts.shopName,
        primaryDomain: facts.primaryDomain,
        currencyCode: facts.currencyCode,
        vendors: facts.vendors,
      },
    } satisfies ShopIdentitySourceBlob),
    blobWrite(modulePath(blobPrefix, MODULE_FILES.marketSource), {
      stage: "marketLocaleSource",
      shop,
      scannedAt,
      sourceBlobPrefix,
      locales,
      publishedLocales,
      markets,
    } satisfies MarketLocaleSourceBlob),
    blobWrite(modulePath(blobPrefix, MODULE_FILES.catalogSource), {
      stage: "catalogSource",
      shop,
      scannedAt,
      sourceBlobPrefix,
      facts: {
        productTypes: facts.productTypes,
        vendors: facts.vendors,
        topProductTitles: facts.topProductTitles,
        collectionTitles: facts.collectionTitles,
        collectionDescriptions: facts.collectionDescriptions,
        menuTitles: facts.menuTitles,
        tags: facts.tags,
      },
    } satisfies CatalogSourceBlob),
    blobWrite(modulePath(blobPrefix, MODULE_FILES.editorialSource), {
      stage: "editorialSource",
      shop,
      scannedAt,
      sourceBlobPrefix,
      facts: {
        articleTitles: facts.articleTitles,
        articleSummaries: facts.articleSummaries,
      },
    } satisfies EditorialSourceBlob),
    blobWrite(modulePath(blobPrefix, MODULE_FILES.styleSource), {
      stage: "styleSource",
      shop,
      scannedAt,
      sourceBlobPrefix,
      themeTexts,
    } satisfies StyleSourceBlob),
    blobWrite(modulePath(blobPrefix, MODULE_FILES.signalBundle), {
      stage: "signalBundle",
      shop,
      scannedAt,
      sourceBlobPrefix,
      signals,
    } satisfies SignalBundleBlob),
    blobWrite(modulePath(blobPrefix, MODULE_FILES.identityContext), {
      stage: "shopIdentityContext",
      shop,
      scannedAt,
      sourceBlobPrefix,
      understanding: induction?.understanding ?? null,
      shopBaseline: translationContextProfile.shopBaseline,
      shopContext: translationContextProfile.shopContext,
    }),
    blobWrite(modulePath(blobPrefix, MODULE_FILES.marketContext), {
      stage: "marketLocaleContext",
      shop,
      scannedAt,
      sourceBlobPrefix,
      publishedLocales,
      markets,
      marketProfile: translationContextProfile.marketProfile,
    }),
    blobWrite(modulePath(blobPrefix, MODULE_FILES.catalogContext), {
      stage: "catalogContext",
      shop,
      scannedAt,
      sourceBlobPrefix,
      categoryTerminologyPack: translationContextProfile.categoryTerminologyPack,
      productFamilyProtectedTerms: translationContextProfile.productFamilyProtectedTerms,
      terminologyProfile: translationContextProfile.terminologyProfile,
    }),
    blobWrite(modulePath(blobPrefix, MODULE_FILES.editorialContext), {
      stage: "editorialContext",
      shop,
      scannedAt,
      sourceBlobPrefix,
      seriesArticleTerminologyPack: translationContextProfile.seriesArticleTerminologyPack,
    }),
    blobWrite(modulePath(blobPrefix, MODULE_FILES.styleContext), {
      stage: "styleContext",
      shop,
      scannedAt,
      sourceBlobPrefix,
      understanding: induction?.understanding ?? null,
      strategy: induction?.strategy ?? null,
      regionalStyleProfile: translationContextProfile.regionalStyleProfile,
      modulePolicyProfile: translationContextProfile.modulePolicyProfile,
      themeSceneProfile,
    }),
  ];

  await Promise.all(writes);
  return translationContextProfile;
}

export async function writeProfileDerivedArtifacts(args: {
  blobPrefix: string;
  shop: string;
  locales: ShopLocaleRow[];
  facts: ShopProfileFacts;
  markets: ShopMarket[];
  themeTexts: ThemeTextSample[];
  signals: ShopSignalBundle | null;
  themeSceneProfile: ThemeSceneProfile | null;
  induction: OptionalInduction;
  scannedAt: string;
  sourceBlobPrefix?: string;
}): Promise<TranslationContextProfile> {
  const {
    blobPrefix,
    shop,
    locales,
    facts,
    markets,
    themeTexts,
    signals,
    themeSceneProfile,
    induction,
    scannedAt,
    sourceBlobPrefix,
  } = args;

  const publishedLocales = toPublishedLocales(locales);
  const translationContextProfile = buildTranslationContextProfile({
    publishedLocales,
    markets,
    facts,
    signals,
    understanding: induction?.understanding ?? null,
    strategy: induction?.strategy ?? null,
    themeSceneProfile,
    generatedAt: scannedAt,
  });

  await Promise.all([
    blobWrite(modulePath(blobPrefix, MODULE_FILES.signalBundle), {
      stage: "signalBundle",
      shop,
      scannedAt,
      sourceBlobPrefix,
      signals,
    } satisfies SignalBundleBlob),
    blobWrite(modulePath(blobPrefix, MODULE_FILES.identityContext), {
      stage: "shopIdentityContext",
      shop,
      scannedAt,
      sourceBlobPrefix,
      understanding: induction?.understanding ?? null,
      shopBaseline: translationContextProfile.shopBaseline,
      shopContext: translationContextProfile.shopContext,
    }),
    blobWrite(modulePath(blobPrefix, MODULE_FILES.marketContext), {
      stage: "marketLocaleContext",
      shop,
      scannedAt,
      sourceBlobPrefix,
      publishedLocales,
      markets,
      marketProfile: translationContextProfile.marketProfile,
    }),
    blobWrite(modulePath(blobPrefix, MODULE_FILES.catalogContext), {
      stage: "catalogContext",
      shop,
      scannedAt,
      sourceBlobPrefix,
      categoryTerminologyPack: translationContextProfile.categoryTerminologyPack,
      productFamilyProtectedTerms: translationContextProfile.productFamilyProtectedTerms,
      terminologyProfile: translationContextProfile.terminologyProfile,
    }),
    blobWrite(modulePath(blobPrefix, MODULE_FILES.editorialContext), {
      stage: "editorialContext",
      shop,
      scannedAt,
      sourceBlobPrefix,
      seriesArticleTerminologyPack: translationContextProfile.seriesArticleTerminologyPack,
    }),
    blobWrite(modulePath(blobPrefix, MODULE_FILES.styleContext), {
      stage: "styleContext",
      shop,
      scannedAt,
      sourceBlobPrefix,
      understanding: induction?.understanding ?? null,
      strategy: induction?.strategy ?? null,
      regionalStyleProfile: translationContextProfile.regionalStyleProfile,
      modulePolicyProfile: translationContextProfile.modulePolicyProfile,
      themeSceneProfile,
    }),
  ]);

  return translationContextProfile;
}

export async function writeShopIdentitySourceModule(args: {
  blobPrefix: string;
  shop: string;
  facts: ShopIdentityFacts;
  scannedAt: string;
  sourceBlobPrefix?: string;
}): Promise<void> {
  await blobWrite(modulePath(args.blobPrefix, MODULE_FILES.identitySource), {
    stage: "shopIdentitySource",
    shop: args.shop,
    scannedAt: args.scannedAt,
    sourceBlobPrefix: args.sourceBlobPrefix,
    facts: args.facts,
  } satisfies ShopIdentitySourceBlob);
}

export async function writeMarketLocaleSourceModule(args: {
  blobPrefix: string;
  shop: string;
  locales: ShopLocaleRow[];
  markets: ShopMarket[];
  scannedAt: string;
  sourceBlobPrefix?: string;
}): Promise<void> {
  await blobWrite(modulePath(args.blobPrefix, MODULE_FILES.marketSource), {
    stage: "marketLocaleSource",
    shop: args.shop,
    scannedAt: args.scannedAt,
    sourceBlobPrefix: args.sourceBlobPrefix,
    locales: args.locales,
    publishedLocales: toPublishedLocales(args.locales),
    markets: args.markets,
  } satisfies MarketLocaleSourceBlob);
}

export async function writeCatalogSourceModule(args: {
  blobPrefix: string;
  shop: string;
  facts: ShopCatalogFacts;
  scannedAt: string;
  sourceBlobPrefix?: string;
}): Promise<void> {
  await blobWrite(modulePath(args.blobPrefix, MODULE_FILES.catalogSource), {
    stage: "catalogSource",
    shop: args.shop,
    scannedAt: args.scannedAt,
    sourceBlobPrefix: args.sourceBlobPrefix,
    facts: args.facts,
  } satisfies CatalogSourceBlob);
}

export async function writeEditorialSourceModule(args: {
  blobPrefix: string;
  shop: string;
  facts: ShopEditorialFacts;
  scannedAt: string;
  sourceBlobPrefix?: string;
}): Promise<void> {
  await blobWrite(modulePath(args.blobPrefix, MODULE_FILES.editorialSource), {
    stage: "editorialSource",
    shop: args.shop,
    scannedAt: args.scannedAt,
    sourceBlobPrefix: args.sourceBlobPrefix,
    facts: args.facts,
  } satisfies EditorialSourceBlob);
}

export async function writeStyleSourceModule(args: {
  blobPrefix: string;
  shop: string;
  themeTexts: ThemeTextSample[];
  scannedAt: string;
  sourceBlobPrefix?: string;
}): Promise<void> {
  await blobWrite(modulePath(args.blobPrefix, MODULE_FILES.styleSource), {
    stage: "styleSource",
    shop: args.shop,
    scannedAt: args.scannedAt,
    sourceBlobPrefix: args.sourceBlobPrefix,
    themeTexts: args.themeTexts,
  } satisfies StyleSourceBlob);
}

export async function readProfileModuleSources(
  blobPrefix: string,
): Promise<ProfileModuleSources | null> {
  const [identitySource, marketSource, catalogSource, editorialSource, styleSource, signalBundle] =
    await Promise.all([
      blobRead<ShopIdentitySourceBlob>(modulePath(blobPrefix, MODULE_FILES.identitySource)),
      blobRead<MarketLocaleSourceBlob>(modulePath(blobPrefix, MODULE_FILES.marketSource)),
      blobRead<CatalogSourceBlob>(modulePath(blobPrefix, MODULE_FILES.catalogSource)),
      blobRead<EditorialSourceBlob>(modulePath(blobPrefix, MODULE_FILES.editorialSource)),
      blobRead<StyleSourceBlob>(modulePath(blobPrefix, MODULE_FILES.styleSource)),
      blobRead<SignalBundleBlob>(modulePath(blobPrefix, MODULE_FILES.signalBundle)),
    ]);

  if (!identitySource) return null;

  return {
    facts: {
      shopName: identitySource.facts.shopName,
      primaryDomain: identitySource.facts.primaryDomain,
      currencyCode: identitySource.facts.currencyCode,
      productTypes: catalogSource?.facts.productTypes ?? [],
      vendors: [
        ...identitySource.facts.vendors,
        ...(catalogSource?.facts.vendors ?? []),
      ].filter(Boolean),
      topProductTitles: catalogSource?.facts.topProductTitles ?? [],
      collectionTitles: catalogSource?.facts.collectionTitles ?? [],
      collectionDescriptions: catalogSource?.facts.collectionDescriptions ?? [],
      articleTitles: editorialSource?.facts.articleTitles ?? [],
      articleSummaries: editorialSource?.facts.articleSummaries ?? [],
      menuTitles: catalogSource?.facts.menuTitles ?? [],
      tags: catalogSource?.facts.tags ?? [],
    },
    markets: marketSource?.markets ?? [],
    themeTexts: styleSource?.themeTexts ?? [],
    signals: signalBundle?.signals ?? null,
  };
}
