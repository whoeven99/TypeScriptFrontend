import prisma from "~/db.server";
import { BILLING_INTERVAL, PLAN_KIND } from "~/server/billing/types.server";
import type {
  CreditPackOffer,
  OnboardingUpgradeOffer,
  RecommendedSubscriptionOffer,
} from "~/lib/expandMarket";
import { matchPackForCredits } from "~/lib/expandMarket";

/** 按商品目录体量推荐现有月付档（Basic / Pro / Premium）。 */
export function recommendSubscriptionTier(args: {
  productCredits: number;
  productCount: number;
}): "Basic" | "Pro" | "Premium" {
  const credits = Math.max(0, Math.floor(args.productCredits));
  if (credits > 0) {
    if (credits <= 1_500_000) return "Basic";
    if (credits <= 3_000_000) return "Pro";
    return "Premium";
  }
  const n = Math.max(0, Math.floor(args.productCount));
  if (n <= 50) return "Basic";
  if (n <= 200) return "Pro";
  return "Premium";
}

async function loadMonthlySubscription(
  tier: "Basic" | "Pro" | "Premium",
): Promise<RecommendedSubscriptionOffer | null> {
  try {
    const row = await prisma.planCatalog.findFirst({
      where: {
        kind: PLAN_KIND.SUBSCRIPTION,
        billingInterval: BILLING_INTERVAL.MONTHLY,
        enabled: true,
        shopifyPlanName: tier,
      },
      select: {
        planKey: true,
        shopifyPlanName: true,
        credits: true,
        priceAmount: true,
        currencyCode: true,
      },
    });
    if (!row?.shopifyPlanName) return null;
    const monthlyPrice = Number(row.priceAmount);
    return {
      planKey: row.planKey,
      title: row.shopifyPlanName,
      monthlyPrice: Number.isFinite(monthlyPrice) ? monthlyPrice : 0,
      creditsPerMonth: row.credits,
      currencyCode: row.currencyCode || "USD",
    };
  } catch (err) {
    console.error("[onboardingOffer] loadMonthlySubscription failed:", err);
    return null;
  }
}

/** 定价页硬编码兜底（PlanCatalog 不可用时）。 */
function fallbackSubscription(
  tier: "Basic" | "Pro" | "Premium",
): RecommendedSubscriptionOffer {
  const table: Record<
    "Basic" | "Pro" | "Premium",
    { planKey: string; monthlyPrice: number; creditsPerMonth: number }
  > = {
    Basic: {
      planKey: "basic-monthly",
      monthlyPrice: 7.99,
      creditsPerMonth: 1_500_000,
    },
    Pro: {
      planKey: "pro-monthly",
      monthlyPrice: 19.99,
      creditsPerMonth: 3_000_000,
    },
    Premium: {
      planKey: "premium-monthly",
      monthlyPrice: 39.99,
      creditsPerMonth: 8_000_000,
    },
  };
  const row = table[tier];
  return {
    planKey: row.planKey,
    title: tier,
    monthlyPrice: row.monthlyPrice,
    creditsPerMonth: row.creditsPerMonth,
    currencyCode: "USD",
  };
}

/**
 * 新手引导升级报价：荐订阅档 + 全店多模块建仓包（订后再推）。
 */
export async function buildOnboardingUpgradeOffer(args: {
  productCount: number;
  productCredits: number;
  fullStoreCredits: number;
  usedShopScan: boolean;
  packs: CreditPackOffer[];
}): Promise<OnboardingUpgradeOffer> {
  const productCredits = Math.max(0, Math.floor(args.productCredits));
  const fullStoreCredits = Math.max(
    productCredits,
    Math.floor(args.fullStoreCredits),
  );
  const productCount = Math.max(0, Math.floor(args.productCount));
  const tier = recommendSubscriptionTier({ productCredits, productCount });
  const recommendedSubscription =
    (await loadMonthlySubscription(tier)) ?? fallbackSubscription(tier);
  const recommendedFullStorePack = matchPackForCredits(
    args.packs,
    fullStoreCredits,
  );

  return {
    productCount,
    productCredits,
    fullStoreCredits,
    usedShopScan: args.usedShopScan,
    recommendedSubscription,
    packs: args.packs,
    recommendedFullStorePack,
  };
}
