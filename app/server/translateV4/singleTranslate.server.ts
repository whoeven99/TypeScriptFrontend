/**
 * 单字段手动翻译 —— 委托 worker 的 translateResources 管线。
 * 手动点击时跳过 TM 缓存读取、强制走 LLM，译后写回缓存供后续自动任务复用。
 */
import "./translationCoreRuntime.server";
import { translateSingleField } from "@ciwi/translation-core";
import prisma from "~/db.server";
import { loadShopScanArtifacts } from "~/server/shopScan/artifacts.server";
import {
  getLatestShopScanJob,
  getLatestShopScanJobsByTask,
  type ShopScanJob,
} from "~/server/shopScan/cosmos.server";
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
  const [profile, latestByTask, latestScan] = await Promise.all([
    prisma.shopProfile.findUnique({
      where: { shop: args.shop },
      select: {
        industry: true,
        description: true,
        brandTone: true,
        keywords: true,
      },
    }),
    getLatestShopScanJobsByTask(args.shop).catch(() => ({})),
    getLatestShopScanJob(args.shop).catch(() => null),
  ]);
  const latestProfileSourceJob = (
    [
      latestByTask.profile_material,
      latestByTask.profile_identity,
      latestByTask.market_locale,
      latestByTask.catalog_material,
      latestByTask.editorial_material,
      latestByTask.style_material,
    ].filter(Boolean) as ShopScanJob[]
  ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0] ?? null;
  const selectedScan =
    latestByTask.profile_ai ?? latestProfileSourceJob ?? latestScan;
  const artifacts = await loadShopScanArtifacts(
    selectedScan?.blobPrefix,
    selectedScan?.summary,
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
  const fallbackStrategy = artifacts.strategy;
  const fallbackUnderstanding = artifacts.understanding;
  const normalizedModule = args.module?.trim().toUpperCase() || null;
  const fallbackModulePolicy =
    normalizedModule && fallbackStrategy?.moduleHints
      ? fallbackStrategy.moduleHints.find(
          (hint) => hint.module.trim().toUpperCase() === normalizedModule,
        ) ?? null
      : null;
  const modulePolicy =
    normalizedModule && scanContext?.modulePolicyProfile?.moduleHints
      ? scanContext.modulePolicyProfile.moduleHints.find(
          (hint) => hint.module.trim().toUpperCase() === normalizedModule,
        ) ?? null
      : fallbackModulePolicy;

  const fallbackShopContext = fallbackUnderstanding
    ? {
        industry: fallbackUnderstanding.industry,
        subIndustry: fallbackUnderstanding.subIndustry,
        brandTone: fallbackUnderstanding.voiceStyle,
        brandPositioning: fallbackUnderstanding.brandPositioning,
        description: fallbackUnderstanding.description || null,
        keywords: fallbackUnderstanding.keywords,
        sellingPoints: fallbackUnderstanding.sellingPoints,
        priceRange: fallbackUnderstanding.priceRange,
      }
    : null;
  const fallbackTerminology = fallbackStrategy
    ? {
        brandTerms: fallbackStrategy.brandTerms,
        doNotTranslateTerms: fallbackStrategy.doNotTranslateTerms,
        preferredTerms: fallbackStrategy.preferredTerms,
      }
    : null;
  const fallbackLocalizationContext =
    fallbackUnderstanding || fallbackStrategy
      ? {
          shopBaseline: {
            brandTone: fallbackUnderstanding?.voiceStyle ?? profile?.brandTone ?? null,
            brandPositioning: fallbackUnderstanding?.brandPositioning ?? null,
            globalProtectedTerms: fallbackStrategy?.brandTerms ?? [],
            globalDoNotTranslateTerms: fallbackStrategy?.doNotTranslateTerms ?? [],
          },
          categoryTerminologyPack:
            fallbackStrategy?.preferredTerms?.length
              ? {
                  key: fallbackUnderstanding?.subIndustry ?? fallbackUnderstanding?.industry ?? null,
                  professionalTerms: fallbackStrategy.preferredTerms,
                }
              : null,
          seriesArticleTerminologyPack: null,
          productFamilyProtectedTerms:
            fallbackStrategy &&
            [...fallbackStrategy.brandTerms, ...fallbackStrategy.doNotTranslateTerms].length > 0
              ? {
                  terms: [
                    ...fallbackStrategy.brandTerms.filter((term) => term.includes(" ")),
                    ...fallbackStrategy.doNotTranslateTerms.filter((term) => term.includes(" ")),
                  ],
                }
              : null,
          regionalStyleProfile:
            fallbackStrategy?.regionalStyleGuidance?.length
              ? {
                  guidanceNotes: fallbackStrategy.regionalStyleGuidance,
                }
              : null,
        }
      : null;
  const localizationContext = scanContext
    ? {
        shopBaseline:
          scanContext.shopBaseline ?? fallbackLocalizationContext?.shopBaseline ?? null,
        categoryTerminologyPack:
          scanContext.categoryTerminologyPack ??
          fallbackLocalizationContext?.categoryTerminologyPack ??
          null,
        seriesArticleTerminologyPack:
          scanContext.seriesArticleTerminologyPack ??
          fallbackLocalizationContext?.seriesArticleTerminologyPack ??
          null,
        productFamilyProtectedTerms:
          scanContext.productFamilyProtectedTerms ??
          fallbackLocalizationContext?.productFamilyProtectedTerms ??
          null,
        regionalStyleProfile:
          scanContext.regionalStyleProfile ??
          fallbackLocalizationContext?.regionalStyleProfile ??
          null,
      }
    : fallbackLocalizationContext ??
      (profile
        ? {
            shopBaseline: {
              brandTone: profile.brandTone,
              brandPositioning: null,
              globalProtectedTerms: [],
              globalDoNotTranslateTerms: [],
            },
          }
        : null);

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
      fallbackShopContext ??
      (profile
        ? {
            description: profile.description,
            brandTone: profile.brandTone,
            keywords: Array.isArray(profile.keywords) ? (profile.keywords as string[]) : [],
          }
        : null),
    terminology: scanContext?.terminologyProfile ?? fallbackTerminology ?? null,
    localizationContext,
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
