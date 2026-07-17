import { blobRead, blobWrite } from "../blobV4.js";
import { shopScanAiConfigured, SHOP_SCAN_AI_MODEL } from "./ai.js";
import {
  fetchShopCatalogFacts,
  fetchShopEditorialFacts,
  fetchShopIdentityFacts,
  fetchShopMarkets,
  fetchShopProfileFacts,
  mergeShopProfileFacts,
  type ShopMarket,
  type ShopLocaleRow,
  type ShopProfileFacts,
} from "./shopContext.js";
import { runProfileInduction, type TerminologyStrategy } from "./profileInduction.js";
import {
  extractShopSignals,
  type ShopSignalBundle,
} from "./signalExtraction.js";
import { sampleThemeTexts } from "./translationSamples.js";
import { buildThemeSceneProfile } from "./themeKeyIntelligence.js";
import {
  readProfileModuleSources,
  writeCatalogSourceModule,
  writeEditorialSourceModule,
  writeMarketLocaleSourceModule,
  writeProfileDerivedArtifacts,
  writeProfileModuleArtifacts,
  writeShopIdentitySourceModule,
  writeStyleSourceModule,
} from "./profileModules.js";
import { upsertShopProfile } from "./tsfWrite.js";

/**
 * 阶段2：采集店铺素材 → 信号提取 → AI 两步归纳（理解 + 术语策略）→
 * upsert ShopProfile 供翻译上下文消费。
 *
 * 返回是否成功生成画像；AI 未配置或素材为空时返回 skipped。
 * 第二步术语策略失败不阻断画像落库（best-effort）。
 */

export type ProfileStageResult =
  | { status: "done"; profileStrategy: TerminologyStrategy | null }
  | { status: "skipped"; reason: string };

export type ProfileSourceStageResult =
  | { status: "done" }
  | { status: "skipped"; reason: string };

type StoredProfileFactsBlob = {
  facts?: ShopProfileFacts;
  markets?: ShopMarket[];
  themeTexts?: Array<{
    text?: string;
    module?: string;
    key?: string;
    resourceId?: string;
    weight?: number;
  }>;
  signals?: ShopSignalBundle;
};

type StoredThemeKeyProfileBlob = {
  themeSceneProfile?: ReturnType<typeof buildThemeSceneProfile> | null;
};

const PROFILE_STAGE_HEARTBEAT_INTERVAL_MS = Math.max(
  5_000,
  Number(process.env.SHOP_SCAN_PROFILE_HEARTBEAT_INTERVAL_MS) || 15_000,
);

async function runWithHeartbeat<T>(
  heartbeat: () => Promise<void>,
  task: () => Promise<T>,
): Promise<T> {
  const timer = setInterval(() => {
    void heartbeat().catch((error) => {
      console.warn("[shopScan] profile heartbeat failed:", error);
    });
  }, PROFILE_STAGE_HEARTBEAT_INTERVAL_MS);

  try {
    return await task();
  } finally {
    clearInterval(timer);
    await heartbeat();
  }
}

function hasProfileMaterial(
  facts: ShopProfileFacts,
  markets: ShopMarket[],
  signals: ShopSignalBundle,
): boolean {
  return (
    signals.weightedTopTerms.length > 0 ||
    signals.representativeSamples.length > 0 ||
    signals.brandTerms.length > 0 ||
    signals.categoryTerms.length > 0 ||
    facts.topProductTitles.length > 0 ||
    markets.length > 0
  );
}

async function rebuildProfileWorkspaceArtifacts(args: {
  shop: string;
  blobPrefix: string;
  locales: ShopLocaleRow[];
  scannedAt: string;
  induction?: {
    understanding: Awaited<ReturnType<typeof runProfileInduction>>["understanding"] | null;
    strategy: TerminologyStrategy | null;
  } | null;
  sourceBlobPrefix?: string;
}): Promise<ShopProfileFacts | null> {
  const moduleSources = await readProfileModuleSources(args.blobPrefix);
  const facts = moduleSources?.facts ?? null;
  if (!facts) return null;
  const themeTexts = moduleSources?.themeTexts ?? [];
  const signals = extractShopSignals(facts, themeTexts);
  const themeSceneProfile = buildThemeSceneProfile(themeTexts);
  const translationContextProfile = await writeProfileDerivedArtifacts({
    blobPrefix: args.blobPrefix,
    shop: args.shop,
    locales: args.locales,
    facts,
    markets: moduleSources?.markets ?? [],
    themeTexts,
    signals,
    themeSceneProfile,
    induction: args.induction ?? null,
    scannedAt: args.scannedAt,
    sourceBlobPrefix: args.sourceBlobPrefix,
  });
  await blobWrite(`${args.blobPrefix}/theme-key-profile.json`, {
    stage: "themeKeyIntelligence",
    shop: args.shop,
    themeSceneProfile,
    scannedAt: args.scannedAt,
    sourceBlobPrefix: args.sourceBlobPrefix,
  });
  await blobWrite(`${args.blobPrefix}/translation-context-profile.json`, translationContextProfile);
  return facts;
}

export async function runProfileIdentityStage(args: {
  shop: string;
  accessToken: string;
  locales: ShopLocaleRow[];
  blobPrefix: string;
  heartbeat: () => Promise<void>;
}): Promise<ProfileSourceStageResult> {
  const scannedAt = new Date().toISOString();
  const facts = await fetchShopIdentityFacts(args.shop, args.accessToken);
  await writeShopIdentitySourceModule({
    blobPrefix: args.blobPrefix,
    shop: args.shop,
    facts,
    scannedAt,
  });
  await rebuildProfileWorkspaceArtifacts({
    shop: args.shop,
    blobPrefix: args.blobPrefix,
    locales: args.locales,
    scannedAt,
  });
  await args.heartbeat();
  return { status: "done" };
}

export async function runMarketLocaleStage(args: {
  shop: string;
  accessToken: string;
  locales: ShopLocaleRow[];
  blobPrefix: string;
  heartbeat: () => Promise<void>;
}): Promise<ProfileSourceStageResult> {
  const scannedAt = new Date().toISOString();
  const markets = await fetchShopMarkets(args.shop, args.accessToken, args.locales);
  await writeMarketLocaleSourceModule({
    blobPrefix: args.blobPrefix,
    shop: args.shop,
    locales: args.locales,
    markets,
    scannedAt,
  });
  await rebuildProfileWorkspaceArtifacts({
    shop: args.shop,
    blobPrefix: args.blobPrefix,
    locales: args.locales,
    scannedAt,
  });
  await args.heartbeat();
  return { status: "done" };
}

export async function runCatalogSourceStage(args: {
  shop: string;
  accessToken: string;
  locales: ShopLocaleRow[];
  blobPrefix: string;
  heartbeat: () => Promise<void>;
}): Promise<ProfileSourceStageResult> {
  const scannedAt = new Date().toISOString();
  const facts = await fetchShopCatalogFacts(args.shop, args.accessToken);
  await writeCatalogSourceModule({
    blobPrefix: args.blobPrefix,
    shop: args.shop,
    facts,
    scannedAt,
  });
  await rebuildProfileWorkspaceArtifacts({
    shop: args.shop,
    blobPrefix: args.blobPrefix,
    locales: args.locales,
    scannedAt,
  });
  await args.heartbeat();
  return { status: "done" };
}

export async function runEditorialSourceStage(args: {
  shop: string;
  accessToken: string;
  locales: ShopLocaleRow[];
  blobPrefix: string;
  heartbeat: () => Promise<void>;
}): Promise<ProfileSourceStageResult> {
  const scannedAt = new Date().toISOString();
  const facts = await fetchShopEditorialFacts(args.shop, args.accessToken);
  await writeEditorialSourceModule({
    blobPrefix: args.blobPrefix,
    shop: args.shop,
    facts,
    scannedAt,
  });
  await rebuildProfileWorkspaceArtifacts({
    shop: args.shop,
    blobPrefix: args.blobPrefix,
    locales: args.locales,
    scannedAt,
  });
  await args.heartbeat();
  return { status: "done" };
}

export async function runStyleSourceStage(args: {
  shop: string;
  accessToken: string;
  locales: ShopLocaleRow[];
  blobPrefix: string;
  heartbeat: () => Promise<void>;
}): Promise<ProfileSourceStageResult> {
  const scannedAt = new Date().toISOString();
  const themeTexts = await sampleThemeTexts(args.shop, args.accessToken, undefined, args.heartbeat);
  await writeStyleSourceModule({
    blobPrefix: args.blobPrefix,
    shop: args.shop,
    themeTexts,
    scannedAt,
  });
  await rebuildProfileWorkspaceArtifacts({
    shop: args.shop,
    blobPrefix: args.blobPrefix,
    locales: args.locales,
    scannedAt,
  });
  await args.heartbeat();
  return { status: "done" };
}

export async function runProfileStage(args: {
  shop: string;
  accessToken: string;
  primaryLocale: string;
  locales: ShopLocaleRow[];
  scanId: string;
  blobPrefix: string;
  heartbeat: () => Promise<void>;
  enableAi: boolean;
}): Promise<ProfileStageResult> {
  const { shop, accessToken, primaryLocale, locales, scanId, blobPrefix, heartbeat, enableAi } =
    args;

  const [facts, markets, themeTexts] = await runWithHeartbeat(heartbeat, async () =>
    Promise.all([
      fetchShopProfileFacts(shop, accessToken),
      fetchShopMarkets(shop, accessToken, locales),
      sampleThemeTexts(shop, accessToken, undefined, heartbeat),
    ]),
  );

  const signals = extractShopSignals(facts, themeTexts);
  const themeSceneProfile = buildThemeSceneProfile(themeTexts);
  const hasMaterial = hasProfileMaterial(facts, markets, signals);
  const scannedAt = new Date().toISOString();

  if (!enableAi || !shopScanAiConfigured() || !hasMaterial) {
    const translationContextProfile = await writeProfileModuleArtifacts({
      blobPrefix,
      shop,
      locales,
      facts,
      markets,
      themeTexts,
      signals,
      themeSceneProfile,
      induction: null,
      scannedAt,
    });
    await blobWrite(`${blobPrefix}/profile-facts.json`, {
      stage: "profile",
      shop,
      facts,
      markets,
      themeTexts,
      signals,
      induction: null,
      scannedAt,
    });
    await blobWrite(`${blobPrefix}/theme-key-profile.json`, {
      stage: "themeKeyIntelligence",
      shop,
      themeSceneProfile,
      scannedAt,
    });
    await blobWrite(`${blobPrefix}/translation-context-profile.json`, translationContextProfile);
    if (hasMaterial) {
      return {
        status: "done",
        profileStrategy: null,
      };
    }
    return {
      status: "skipped",
      reason: !enableAi
        ? "ai_manual_only"
        : !shopScanAiConfigured()
          ? "ai_not_configured"
          : "no_material",
    };
  }

  const induction = await runWithHeartbeat(heartbeat, () =>
    runProfileInduction({
      facts,
      markets,
      signals,
      primaryLocale,
    }),
  );

  const translationContextProfile = await writeProfileModuleArtifacts({
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
  });

  await blobWrite(`${blobPrefix}/profile-facts.json`, {
    stage: "profile",
    shop,
    facts,
    markets,
    themeTexts,
    signals,
    themeSceneProfile,
    induction,
    scannedAt,
  });
  await blobWrite(`${blobPrefix}/theme-key-profile.json`, {
    stage: "themeKeyIntelligence",
    shop,
    themeSceneProfile,
    scannedAt,
  });

  if (!induction.understanding) {
    await blobWrite(`${blobPrefix}/translation-context-profile.json`, translationContextProfile);
    return { status: "skipped", reason: "ai_understanding_failed" };
  }

  const { understanding, strategy } = induction;

  await blobWrite(`${blobPrefix}/translation-context-profile.json`, translationContextProfile);

  await upsertShopProfile({
    shop,
    shopName: facts.shopName,
    primaryLocale,
    industry: understanding.industry,
    keywords: understanding.keywords.length ? understanding.keywords : null,
    description: understanding.description || null,
    brandTone: understanding.voiceStyle,
    aiModel: SHOP_SCAN_AI_MODEL,
    lastScanId: scanId,
  });

  if (!strategy) {
    console.warn(
      `[shopScan] profile strategy step skipped shop=${shop} scan=${scanId} (understanding ok)`,
    );
  }

  return { status: "done", profileStrategy: strategy };
}

export async function runProfileAiStageFromBlob(args: {
  shop: string;
  accessToken: string;
  primaryLocale: string;
  locales: ShopLocaleRow[];
  scanId: string;
  sourceBlobPrefix: string;
  targetBlobPrefix: string;
  heartbeat: () => Promise<void>;
}): Promise<ProfileStageResult> {
  const {
    shop,
    primaryLocale,
    locales,
    scanId,
    sourceBlobPrefix,
    targetBlobPrefix,
    heartbeat,
  } = args;
  const prefix = sourceBlobPrefix.endsWith("/") ? sourceBlobPrefix : `${sourceBlobPrefix}/`;
  const [moduleSources, storedFacts, storedThemeProfile] = await Promise.all([
    readProfileModuleSources(sourceBlobPrefix),
    blobRead<StoredProfileFactsBlob>(`${prefix}profile-facts.json`),
    blobRead<StoredThemeKeyProfileBlob>(`${prefix}theme-key-profile.json`),
  ]);
  await heartbeat();

  const facts = moduleSources?.facts ?? storedFacts?.facts ?? null;
  const markets =
    moduleSources?.markets ??
    (Array.isArray(storedFacts?.markets) ? storedFacts!.markets : []);
  const themeTexts =
    moduleSources?.themeTexts ??
    (Array.isArray(storedFacts?.themeTexts)
      ? storedFacts!.themeTexts.map((sample) => ({
          text: String(sample?.text ?? ""),
          module: String(sample?.module ?? ""),
          key: String(sample?.key ?? ""),
          resourceId: String(sample?.resourceId ?? ""),
          weight: Number(sample?.weight ?? 0),
        }))
      : []);
  const signals =
    moduleSources?.signals ??
    storedFacts?.signals ??
    (facts ? extractShopSignals(facts, themeTexts) : null);
  const themeSceneProfile =
    storedThemeProfile?.themeSceneProfile ??
    (themeTexts.length > 0 ? buildThemeSceneProfile(themeTexts) : null);

  if (!facts || !signals) {
    return { status: "skipped", reason: "missing_profile_material" };
  }

  const induction = await runWithHeartbeat(heartbeat, () =>
    runProfileInduction({
      facts,
      markets,
      signals,
      primaryLocale,
    }),
  );
  const scannedAt = new Date().toISOString();
  const mergedFacts = moduleSources?.facts
    ? moduleSources.facts
    : mergeShopProfileFacts({
        identity: facts
          ? {
              shopName: facts.shopName,
              primaryDomain: facts.primaryDomain,
              currencyCode: facts.currencyCode,
              vendors: facts.vendors,
            }
          : null,
        catalog: facts
          ? {
              productTypes: facts.productTypes,
              vendors: facts.vendors,
              topProductTitles: facts.topProductTitles,
              collectionTitles: facts.collectionTitles,
              collectionDescriptions: facts.collectionDescriptions,
              menuTitles: facts.menuTitles,
              tags: facts.tags,
            }
          : null,
        editorial: facts
          ? {
              articleTitles: facts.articleTitles,
              articleSummaries: facts.articleSummaries,
            }
          : null,
      });

  const translationContextProfile = await writeProfileDerivedArtifacts({
    blobPrefix: targetBlobPrefix,
    shop,
    locales,
    facts: mergedFacts,
    markets,
    themeTexts,
    signals,
    themeSceneProfile,
    induction,
    scannedAt,
    sourceBlobPrefix,
  });

  await blobWrite(`${targetBlobPrefix}/profile-facts.json`, {
    stage: "profile",
    shop,
    facts,
    markets,
    themeTexts,
    signals,
    themeSceneProfile,
    induction,
    scannedAt,
    sourceBlobPrefix,
  });
  await blobWrite(`${targetBlobPrefix}/theme-key-profile.json`, {
    stage: "themeKeyIntelligence",
    shop,
    themeSceneProfile,
    scannedAt,
    sourceBlobPrefix,
  });

  if (!induction.understanding) {
    await blobWrite(`${targetBlobPrefix}/translation-context-profile.json`, translationContextProfile);
    return { status: "skipped", reason: "ai_understanding_failed" };
  }

  await blobWrite(`${targetBlobPrefix}/translation-context-profile.json`, translationContextProfile);

  await upsertShopProfile({
    shop,
    shopName: facts.shopName,
    primaryLocale,
    industry: induction.understanding.industry,
    keywords: induction.understanding.keywords.length
      ? induction.understanding.keywords
      : null,
    description: induction.understanding.description || null,
    brandTone: induction.understanding.voiceStyle,
    aiModel: SHOP_SCAN_AI_MODEL,
    lastScanId: scanId,
  });

  return { status: "done", profileStrategy: induction.strategy };
}
