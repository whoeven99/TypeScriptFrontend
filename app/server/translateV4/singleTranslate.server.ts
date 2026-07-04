/**
 * 单字段手动翻译 —— 委托 worker 的 translateResources 管线，与自动任务逻辑一致。
 */
import { translateSingleField } from "@worker/services/syncTranslate";
import { deductShopQuota } from "~/server/taskTokenUsage/shopQuota.server";
import { llmTokensToQuotaCredits } from "./quotaMultiplier.server";

export type TranslateSingleTextArgs = {
  shop: string;
  target: string;
  text: string;
  source?: string;
  fieldKey?: string;
  shopifyType?: string;
  aiModel?: string;
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
  });
  return { translatedText, usedTokens };
}

/** 扣额度（TSF Turso 或 Java /quota/deduct；tokens 为 LLM 原始用量，内部 × QUOTA_TOKEN_MULTIPLIER）。 */
export async function deductQuota(shop: string, rawLlmTokens: number): Promise<void> {
  const tokens = llmTokensToQuotaCredits(rawLlmTokens);
  if (tokens <= 0) return;
  await deductShopQuota(shop, tokens);
}
