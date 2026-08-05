/**
 * 单字段手动翻译积分预估：拼与线上一致的 system prompt（含 glossary / profile），
 * 再按字符粗估 token，最后 × QUOTA_TOKEN_MULTIPLIER。
 */
import "./translationCoreRuntime.server";
import {
  estimateSingleTranslateLlmTokens,
  loadGlossaryLines,
} from "@ciwi/translation-core";
import { loadShopProfilePromptBlock } from "./shopProfileContext.server";
import { llmTokensToQuotaCredits } from "./quotaMultiplier.server";

export type SingleTranslateCreditEstimate = {
  estimatedCredits: number;
  estimatedTokens: number;
  inputTokens: number;
  outputTokens: number;
  systemPromptChars: number;
  userMessageChars: number;
};

export async function estimateSingleTranslateCredits(args: {
  shop: string;
  sourceText: string;
  target: string;
  fieldKey?: string;
  customPrompt?: string;
}): Promise<SingleTranslateCreditEstimate> {
  const sourceText = args.sourceText ?? "";
  const target = args.target.trim();
  if (!sourceText.trim() || !target) {
    return {
      estimatedCredits: 0,
      estimatedTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
      systemPromptChars: 0,
      userMessageChars: 0,
    };
  }

  const [profileBlock, glossaryLines] = await Promise.all([
    loadShopProfilePromptBlock(args.shop),
    loadGlossaryLines(args.shop, target),
  ]);

  const tokenEst = estimateSingleTranslateLlmTokens({
    sourceText,
    target,
    fieldKey: args.fieldKey,
    glossaryLines,
    profileBlock,
    customPrompt: args.customPrompt,
  });

  return {
    estimatedCredits: llmTokensToQuotaCredits(tokenEst.estimatedTokens),
    estimatedTokens: tokenEst.estimatedTokens,
    inputTokens: tokenEst.inputTokens,
    outputTokens: tokenEst.outputTokens,
    systemPromptChars: tokenEst.systemPromptChars,
    userMessageChars: tokenEst.userMessageChars,
  };
}
