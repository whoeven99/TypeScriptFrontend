/**
 * 单字段手动翻译 —— 委托 worker 的 translateResources 管线。
 * 手动点击时跳过 TM 缓存读取、强制走 LLM，译后写回缓存供后续自动任务复用。
 */
import { translateSingleField } from "@worker/services/syncTranslate";
import { deductShopCredits } from "~/server/billing/quota/quotaRouter.server";
import { llmTokensToQuotaCredits } from "./quotaMultiplier.server";

export type TranslateSingleTextArgs = {
  shop: string;
  target: string;
  text: string;
  source?: string;
  fieldKey?: string;
  shopifyType?: string;
  aiModel?: string;
  /** 用户自定义提示词：描述本次翻译方向/风格，注入 system prompt。 */
  customPrompt?: string;
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
    customPrompt: args.customPrompt,
  });
  return { translatedText, usedTokens };
}

/** 扣额度（tokens 为 LLM 原始用量，内部 × QUOTA_TOKEN_MULTIPLIER；按 binding 分叉 tsf/Java）。 */
export async function deductQuota(shop: string, rawLlmTokens: number): Promise<void> {
  const credits = llmTokensToQuotaCredits(rawLlmTokens);
  if (credits <= 0) return;
  await deductShopCredits(shop, credits);
}
