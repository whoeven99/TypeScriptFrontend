import { blobRead, blobWrite } from "../blobV4.js";
import { shopScanAiConfigured, SHOP_SCAN_AI_MODEL } from "./ai.js";
import {
  fetchShopMarkets,
  fetchShopProfileFacts,
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
import { buildTranslationContextProfile } from "./translationContextProfile.js";
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
  const publishedLocales = locales
    .filter((locale) => locale.published)
    .map((locale) => locale.locale);
  const scannedAt = new Date().toISOString();

  if (!enableAi || !shopScanAiConfigured() || !hasMaterial) {
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
    await blobWrite(
      `${blobPrefix}/translation-context-profile.json`,
      buildTranslationContextProfile({
        publishedLocales,
        markets,
        facts,
        signals,
        understanding: null,
        strategy: null,
        themeSceneProfile,
        generatedAt: scannedAt,
      }),
    );
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
    await blobWrite(
      `${blobPrefix}/translation-context-profile.json`,
      buildTranslationContextProfile({
        publishedLocales,
        markets,
        facts,
        signals,
        understanding: null,
        strategy: induction.strategy,
        themeSceneProfile,
        generatedAt: scannedAt,
      }),
    );
    return { status: "skipped", reason: "ai_understanding_failed" };
  }

  const { understanding, strategy } = induction;

  await blobWrite(
    `${blobPrefix}/translation-context-profile.json`,
    buildTranslationContextProfile({
      publishedLocales,
      markets,
      facts,
      signals,
      understanding,
      strategy,
      themeSceneProfile,
      generatedAt: scannedAt,
    }),
  );

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
  const [storedFacts, storedThemeProfile] = await Promise.all([
    blobRead<StoredProfileFactsBlob>(`${prefix}profile-facts.json`),
    blobRead<StoredThemeKeyProfileBlob>(`${prefix}theme-key-profile.json`),
  ]);
  await heartbeat();

  const facts = storedFacts?.facts ?? null;
  const markets = Array.isArray(storedFacts?.markets) ? storedFacts!.markets : [];
  const themeTexts = Array.isArray(storedFacts?.themeTexts)
    ? storedFacts!.themeTexts.map((sample) => ({
        text: String(sample?.text ?? ""),
        module: String(sample?.module ?? ""),
        key: String(sample?.key ?? ""),
        resourceId: String(sample?.resourceId ?? ""),
        weight: Number(sample?.weight ?? 0),
      }))
    : [];
  const signals =
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
  const publishedLocales = locales
    .filter((locale) => locale.published)
    .map((locale) => locale.locale);
  const scannedAt = new Date().toISOString();

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
    await blobWrite(
      `${targetBlobPrefix}/translation-context-profile.json`,
      buildTranslationContextProfile({
        publishedLocales,
        markets,
        facts,
        signals,
        understanding: null,
        strategy: induction.strategy,
        themeSceneProfile,
        generatedAt: scannedAt,
      }),
    );
    return { status: "skipped", reason: "ai_understanding_failed" };
  }

  await blobWrite(
    `${targetBlobPrefix}/translation-context-profile.json`,
    buildTranslationContextProfile({
      publishedLocales,
      markets,
      facts,
      signals,
      understanding: induction.understanding,
      strategy: induction.strategy,
      themeSceneProfile,
      generatedAt: scannedAt,
    }),
  );

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
