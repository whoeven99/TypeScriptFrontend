/**
 * 单字段手动翻译 —— 委托 worker 的 translateResources 管线。
 * 译文无值时先查 TM 缓存；已有译文时跳过缓存、强制 LLM 重译。
 */
import { translateSingleField } from "@worker/services/syncTranslate";
import { llmTokensToQuotaCredits } from "./quotaMultiplier.server";

export type TranslateSingleTextArgs = {
  shop: string;
  target: string;
  text: string;
  source?: string;
  fieldKey?: string;
  shopifyType?: string;
  aiModel?: string;
  /** 当前已有译文；非空时跳过 TM 缓存。 */
  existingTranslation?: string;
};

export async function translateSingleText(
  args: TranslateSingleTextArgs,
): Promise<{ translatedText: string; usedTokens: number }> {
  const { translatedText, usedTokens } = await translateSingleField({
    shop: args.shop,
    target: args.target,
    text: args.text,
    source: args.source,
    fieldKey: args.fieldKey,
    shopifyType: args.shopifyType,
    aiModel: args.aiModel,
    existingTranslation: args.existingTranslation,
  });
  return { translatedText, usedTokens };
}

/** 扣额度（Spring /quota/deduct；tokens 为 LLM 原始用量，内部 × QUOTA_TOKEN_MULTIPLIER）。 */
export async function deductQuota(shop: string, rawLlmTokens: number): Promise<void> {
  const tokens = llmTokensToQuotaCredits(rawLlmTokens);
  if (tokens <= 0) return;
  const base = (process.env.TSF_SERVER_URL?.trim() || process.env.SERVER_URL?.trim() || "").replace(
    /\/+$/,
    "",
  );
  if (!base) return;
  try {
    await fetch(
      `${base}/quota/deduct?shopName=${encodeURIComponent(shop)}&tokens=${tokens}`,
      { method: "POST" },
    );
  } catch (err) {
    console.error(`[single] 扣额度失败 shop=${shop}:`, err);
  }
}
