/**
 * 单字段手动翻译 —— 委托 worker 的 translateResources 管线。
 * 手动点击时跳过 TM 缓存读取、强制走 LLM，译后写回缓存供后续自动任务复用。
 */
import "./translationCoreRuntime.server";
import { translateSingleField } from "@ciwi/translation-core";
import prisma from "~/db.server";
import { loadShopScanArtifacts } from "~/server/shopScan/artifacts.server";
import { getLatestShopScanJob } from "~/server/shopScan/cosmos.server";
import { deductShopCredits } from "~/server/billing/quota/quotaRouter.server";
import { llmTokensToQuotaCredits } from "./quotaMultiplier.server";

export type TranslateSingleTextArgs = {
  shop: string;
  target: string;
  text: string;
  source?: string;
  fieldKey?: string;
  module?: string;
  resourceId?: string | null;
  shopifyType?: string;
  aiModel?: string;
  /** 用户自定义提示词：描述本次翻译方向/风格，注入 system prompt。 */
  customPrompt?: string;
};

export async function translateSingleText(
  args: TranslateSingleTextArgs,
): Promise<{ translatedText: string; usedTokens: number }> {
  const [profile, latestScan] = await Promise.all([
    prisma.shopProfile.findUnique({
      where: { shop: args.shop },
      select: {
        industry: true,
        description: true,
        brandTone: true,
        keywords: true,
      },
    }),
    getLatestShopScanJob(args.shop).catch(() => null),
  ]);
  const artifacts = await loadShopScanArtifacts(
    latestScan?.blobPrefix,
    latestScan?.summary,
  ).catch((error) => {
    console.warn(
      `[single] ${args.shop} failed to load scan artifacts, fallback to base context:`,
      error,
    );
    return {
      strategy: null,
      glossarySuggestions: [],
      understanding: null,
      markets: [],
      signals: null,
      themeSceneProfile: null,
      translationContextProfile: null,
      source: "none" as const,
    };
  });
  const scanContext = artifacts.translationContextProfile;
  const normalizedModule = args.module?.trim().toUpperCase() || null;
  const modulePolicy =
    normalizedModule && scanContext?.modulePolicyProfile?.moduleHints
      ? scanContext.modulePolicyProfile.moduleHints.find(
          (hint) => hint.module.trim().toUpperCase() === normalizedModule,
        ) ?? null
      : null;

  const { translatedText, usedTokens } = await translateSingleField({
    shop: args.shop,
    target: args.target,
    text: args.text,
    source: args.source,
    fieldKey: args.fieldKey,
    module: args.module,
    resourceId: args.resourceId ?? undefined,
    shopifyType: args.shopifyType,
    aiModel: args.aiModel,
    customPrompt: args.customPrompt,
    shopContext:
      scanContext?.shopContext ??
      (profile
        ? {
            description: profile.description,
            brandTone: profile.brandTone,
            keywords: Array.isArray(profile.keywords) ? (profile.keywords as string[]) : [],
          }
        : null),
    terminology: scanContext?.terminologyProfile ?? null,
    localizationContext: scanContext
      ? {
          shopBaseline: scanContext.shopBaseline,
          categoryTerminologyPack: scanContext.categoryTerminologyPack,
          seriesArticleTerminologyPack: scanContext.seriesArticleTerminologyPack,
          productFamilyProtectedTerms: scanContext.productFamilyProtectedTerms,
          regionalStyleProfile: scanContext.regionalStyleProfile,
        }
      : profile
        ? {
            shopBaseline: {
              brandTone: profile.brandTone,
              brandPositioning: null,
              globalProtectedTerms: [],
              globalDoNotTranslateTerms: [],
            },
          }
        : null,
    market: scanContext?.marketProfile
      ? {
          publishedLocales: scanContext.marketProfile.publishedLocales,
          marketNotes: scanContext.marketProfile.marketNotes,
          currencyContext: scanContext.marketProfile.currencyContext,
        }
      : null,
    themeSceneProfile: scanContext?.themeSceneProfile
      ? {
          sceneHints: scanContext.themeSceneProfile.sceneHints,
        }
      : null,
    modulePolicy,
  });
  return { translatedText, usedTokens };
}

/** 扣额度（tokens 为 LLM 原始用量，内部 × QUOTA_TOKEN_MULTIPLIER；按 binding 分叉 tsf/Java）。 */
export async function deductQuota(shop: string, rawLlmTokens: number): Promise<void> {
  const credits = llmTokensToQuotaCredits(rawLlmTokens);
  if (credits <= 0) return;
  await deductShopCredits(shop, credits);
}
