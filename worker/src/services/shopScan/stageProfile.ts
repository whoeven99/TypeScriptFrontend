import { blobWrite } from "../blobV4.js";
import { shopScanAiConfigured, shopScanChatJson, SHOP_SCAN_AI_MODEL } from "./ai.js";
import { fetchShopProfileFacts, type ShopProfileFacts } from "./shopContext.js";
import { upsertShopProfile } from "./tsfWrite.js";

/**
 * 阶段2：采集店铺基本信息与素材，AI 生成店铺画像（行业/关键词/描述/品牌语气），
 * upsert 到 Turso ShopProfile 供未来翻译注入上下文。
 *
 * 返回是否成功生成画像；AI 未配置或素材为空时返回 skipped。
 */

export type ProfileStageResult =
  | { status: "done" }
  | { status: "skipped"; reason: string };

type AiProfileResponse = {
  industry?: string;
  keywords?: string[];
  description?: string;
  brandTone?: string;
};

function buildPrompt(facts: ShopProfileFacts): string {
  return [
    `店铺名称：${facts.shopName}`,
    facts.primaryDomain ? `域名：${facts.primaryDomain}` : "",
    facts.currencyCode ? `货币：${facts.currencyCode}` : "",
    facts.productTypes.length ? `商品类型：${facts.productTypes.join(", ")}` : "",
    facts.vendors.length ? `品牌/供应商：${facts.vendors.join(", ")}` : "",
    facts.collectionTitles.length ? `集合：${facts.collectionTitles.join(", ")}` : "",
    facts.tags.length ? `标签：${facts.tags.slice(0, 30).join(", ")}` : "",
    facts.topProductTitles.length
      ? `热门商品：\n${facts.topProductTitles.map((t) => `- ${t}`).join("\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function runProfileStage(args: {
  shop: string;
  accessToken: string;
  primaryLocale: string;
  scanId: string;
  blobPrefix: string;
  heartbeat: () => Promise<void>;
}): Promise<ProfileStageResult> {
  const { shop, accessToken, primaryLocale, scanId, blobPrefix, heartbeat } = args;

  const facts = await fetchShopProfileFacts(shop, accessToken);
  await heartbeat();

  const hasMaterial =
    facts.productTypes.length > 0 ||
    facts.topProductTitles.length > 0 ||
    facts.collectionTitles.length > 0;

  if (!shopScanAiConfigured() || !hasMaterial) {
    // 素材/AI 缺失也把原始事实存档，便于后续人工/重跑
    await blobWrite(`${blobPrefix}/profile-facts.json`, {
      stage: "profile",
      shop,
      facts,
      ai: null,
      scannedAt: new Date().toISOString(),
    });
    return {
      status: "skipped",
      reason: !shopScanAiConfigured() ? "ai_not_configured" : "no_material",
    };
  }

  const messages = [
    {
      role: "system" as const,
      content:
        "你是电商店铺分析助手。基于给定的店铺素材，输出简洁准确的店铺画像，用于后续多语言翻译时补充上下文。" +
        '严格输出 JSON：{"industry": string, "keywords": string[], "description": string, "brandTone": string}。' +
        "industry 为行业/品类；keywords 为 5-15 个最能代表店铺的关键词；description 为 1-3 句店铺描述；brandTone 为品牌语气（如 专业、活泼、高端）。" +
        "description 与 industry 用店铺主要语言书写。",
    },
    { role: "user" as const, content: buildPrompt(facts) },
  ];

  const { parsed, raw } = await shopScanChatJson<AiProfileResponse>(messages);
  await heartbeat();

  await blobWrite(`${blobPrefix}/profile-facts.json`, {
    stage: "profile",
    shop,
    facts,
    ai: { model: SHOP_SCAN_AI_MODEL, raw, parsed },
    scannedAt: new Date().toISOString(),
  });

  if (!parsed) {
    return { status: "skipped", reason: "ai_parse_failed" };
  }

  const keywords = Array.isArray(parsed.keywords)
    ? parsed.keywords.map((k) => String(k).trim()).filter(Boolean).slice(0, 20)
    : [];

  await upsertShopProfile({
    shop,
    shopName: facts.shopName,
    primaryLocale,
    industry: parsed.industry?.trim() || null,
    keywords: keywords.length ? keywords : null,
    description: parsed.description?.trim() || null,
    brandTone: parsed.brandTone?.trim() || null,
    aiModel: SHOP_SCAN_AI_MODEL,
    lastScanId: scanId,
  });

  return { status: "done" };
}
