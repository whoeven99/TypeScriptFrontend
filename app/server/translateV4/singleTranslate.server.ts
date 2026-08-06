/**
 * 单字段手动翻译 —— 委托 worker 的 translateResources 管线。
 * 手动点击时跳过 TM 缓存读取、强制走 LLM，译后写回缓存供后续自动任务复用。
 */
import "./translationCoreRuntime.server";
import { translateSingleField } from "@ciwi/translation-core";
import { deductShopCredits } from "~/server/billing/quota/quotaRouter.server";
import { llmTokensToQuotaCredits } from "./quotaMultiplier.server";
import { loadShopProfilePromptBlock } from "./shopProfileContext.server";

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
  const profileBlock = await loadShopProfilePromptBlock(args.shop);
  const { translatedText, usedTokens } = await translateSingleField({
    shop: args.shop,
    target: args.target,
    text: args.text,
    source: args.source,
    fieldKey: args.fieldKey,
    shopifyType: args.shopifyType,
    aiModel: args.aiModel,
    profileBlock,
    customPrompt: args.customPrompt,
  });
  return { translatedText, usedTokens };
}

/** 单字段扣费时附带的审计上下文（写入 CreditUsage.metadata）。 */
export type DeductQuotaAuditMeta = {
  target?: string;
  sourceLocale?: string;
  fieldKey?: string;
  shopifyType?: string;
  textLength?: number;
};

/** 扣额度（tokens 为 LLM 原始用量，内部按模型 × 系数）并写 CreditUsage。 */
export async function deductQuota(
  shop: string,
  rawLlmTokens: number,
  meta?: DeductQuotaAuditMeta,
  aiModel?: string | null,
): Promise<void> {
  const credits = llmTokensToQuotaCredits(rawLlmTokens, aiModel);
  if (credits <= 0) return;
  await deductShopCredits(shop, credits, {
    source: "single",
    metadata: {
      rawTokens: Math.max(0, Math.floor(rawLlmTokens)),
      aiModel: aiModel ?? null,
      target: meta?.target ?? null,
      sourceLocale: meta?.sourceLocale ?? null,
      fieldKey: meta?.fieldKey ?? null,
      shopifyType: meta?.shopifyType ?? null,
      textLength: meta?.textLength ?? null,
    },
  });
}
