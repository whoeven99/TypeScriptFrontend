import { blobWrite } from "../blobV4.js";
import { shopScanAiConfigured, SHOP_SCAN_AI_MODEL } from "./ai.js";
import {
  fetchShopMarkets,
  fetchShopProfileFacts,
  type ShopMarket,
  type ShopLocaleRow,
  type ShopProfileFacts,
} from "./shopContext.js";
import { runProfileInduction } from "./profileInduction.js";
import {
  extractShopSignals,
  type ShopSignalBundle,
} from "./signalExtraction.js";
import { sampleThemeTexts } from "./translationSamples.js";
import { upsertShopProfile } from "./tsfWrite.js";

/**
 * 阶段2：采集店铺素材 → 信号提取 → AI 两步归纳（理解 + 术语策略）→
 * upsert ShopProfile 供翻译上下文消费。
 *
 * 返回是否成功生成画像；AI 未配置或素材为空时返回 skipped。
 * 第二步术语策略失败不阻断画像落库（best-effort）。
 */

export type ProfileStageResult =
  | { status: "done" }
  | { status: "skipped"; reason: string };

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
}): Promise<ProfileStageResult> {
  const { shop, accessToken, primaryLocale, locales, scanId, blobPrefix, heartbeat } = args;

  const [facts, markets, themeTexts] = await Promise.all([
    fetchShopProfileFacts(shop, accessToken),
    fetchShopMarkets(shop, accessToken, locales),
    sampleThemeTexts(shop, accessToken, undefined, heartbeat),
  ]);
  await heartbeat();

  const signals = extractShopSignals(facts, themeTexts);
  const hasMaterial = hasProfileMaterial(facts, markets, signals);

  if (!shopScanAiConfigured() || !hasMaterial) {
    await blobWrite(`${blobPrefix}/profile-facts.json`, {
      stage: "profile",
      shop,
      facts,
      markets,
      themeTexts,
      signals,
      induction: null,
      scannedAt: new Date().toISOString(),
    });
    return {
      status: "skipped",
      reason: !shopScanAiConfigured() ? "ai_not_configured" : "no_material",
    };
  }

  const induction = await runProfileInduction({
    facts,
    markets,
    signals,
    primaryLocale,
  });
  await heartbeat();

  await blobWrite(`${blobPrefix}/profile-facts.json`, {
    stage: "profile",
    shop,
    facts,
    markets,
    themeTexts,
    signals,
    induction,
    scannedAt: new Date().toISOString(),
  });

  if (!induction.understanding) {
    return { status: "skipped", reason: "ai_understanding_failed" };
  }

  const { understanding, strategy } = induction;

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

  return { status: "done" };
}
