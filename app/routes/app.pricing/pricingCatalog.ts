/**
 * Pricing 页唯一数据源 —— PlanCatalog 种子、checkout、UI 均以此为准。
 * 修改价格/积分时只改本文件，并重新执行 billing-plan-catalog-seed.sql。
 */

/** 购包 base 价 + 各订阅 tier 折扣价（与页面 priceTable 一致）。 */
export const TOKEN_PACK_PRICE_TABLE: Record<
  string,
  { base: number; Premium: number; Pro: number; Basic: number }
> = {
  "500K": { base: 3.99, Premium: 1.99, Pro: 2.99, Basic: 3.59 },
  "1M": { base: 7.99, Premium: 3.99, Pro: 5.99, Basic: 7.19 },
  "2M": { base: 15.99, Premium: 7.99, Pro: 11.99, Basic: 14.39 },
  "3M": { base: 23.99, Premium: 11.99, Pro: 17.99, Basic: 21.79 },
  "5M": { base: 39.99, Premium: 19.99, Pro: 29.99, Basic: 35.99 },
  "10M": { base: 79.99, Premium: 39.99, Pro: 59.99, Basic: 71.99 },
  "20M": { base: 159.99, Premium: 79.99, Pro: 119.99, Basic: 143.99 },
  "30M": { base: 239.99, Premium: 119.99, Pro: 179.99, Basic: 215.99 },
};

export type SubscriptionPlanDefinition = {
  title: string;
  yearlyTitle: string;
  monthlyPrice: number;
  yearlyPrice: number;
  yearlyBillingAmount: number;
  /** 页面展示的 credits/month */
  monthlyCredits: number;
  glossaryCount: number;
  isRecommended?: boolean;
  planKeyMonthly: string;
  planKeyAnnual: string;
};

/** 订阅卡片（月度/年度价格与每月赠送积分）。 */
export const SUBSCRIPTION_PLAN_DEFINITIONS: SubscriptionPlanDefinition[] = [
  {
    title: "Basic",
    yearlyTitle: "Basic - Yearly",
    monthlyPrice: 7.99,
    yearlyPrice: 6.39,
    yearlyBillingAmount: 76.68,
    monthlyCredits: 1_500_000,
    glossaryCount: 10,
    planKeyMonthly: "tsf_basic_monthly",
    planKeyAnnual: "tsf_basic_annual",
  },
  {
    title: "Pro",
    yearlyTitle: "Pro - Yearly",
    monthlyPrice: 19.99,
    yearlyPrice: 15.99,
    yearlyBillingAmount: 191.88,
    monthlyCredits: 3_000_000,
    glossaryCount: 50,
    planKeyMonthly: "tsf_pro_monthly",
    planKeyAnnual: "tsf_pro_annual",
  },
  {
    title: "Premium",
    yearlyTitle: "Premium - Yearly",
    monthlyPrice: 39.99,
    yearlyPrice: 31.99,
    yearlyBillingAmount: 383.88,
    monthlyCredits: 8_000_000,
    glossaryCount: 100,
    isRecommended: true,
    planKeyMonthly: "tsf_premium_monthly",
    planKeyAnnual: "tsf_premium_annual",
  },
];

export type TokenPackDefinition = {
  name: string;
  credits: number;
  planKey: string;
  basePrice: number;
  shopifyPlanName: string;
};

/** 购包档位（Free 用户 base 价；订阅折扣见 TOKEN_PACK_PRICE_TABLE）。 */
export const TOKEN_PACK_DEFINITIONS: TokenPackDefinition[] = [
  { name: "500K", credits: 500_000, planKey: "tsf_pack_500k", basePrice: 3.99, shopifyPlanName: "500K Credits" },
  { name: "1M", credits: 1_000_000, planKey: "tsf_pack_1m", basePrice: 7.99, shopifyPlanName: "1M Credits" },
  { name: "2M", credits: 2_000_000, planKey: "tsf_pack_2m", basePrice: 15.99, shopifyPlanName: "2M Credits" },
  { name: "3M", credits: 3_000_000, planKey: "tsf_pack_3m", basePrice: 23.99, shopifyPlanName: "3M Credits" },
  { name: "5M", credits: 5_000_000, planKey: "tsf_pack_5m", basePrice: 39.99, shopifyPlanName: "5M Credits" },
  { name: "10M", credits: 10_000_000, planKey: "tsf_pack_10m", basePrice: 79.99, shopifyPlanName: "10M Credits" },
  { name: "20M", credits: 20_000_000, planKey: "tsf_pack_20m", basePrice: 159.99, shopifyPlanName: "20M Credits" },
  { name: "30M", credits: 30_000_000, planKey: "tsf_pack_30m", basePrice: 239.99, shopifyPlanName: "30M Credits" },
];

export const SUBSCRIPTION_TRIAL_DAYS = 5;

export function formatCreditsLabel(credits: number): string {
  return credits.toLocaleString("en-US");
}

export function eNumPlanType({
  planType,
  optionName,
  isInTrial,
}: {
  planType: string;
  optionName: string;
  isInTrial: boolean;
}) {
  const findTableData = TOKEN_PACK_PRICE_TABLE[optionName];

  if (!findTableData) {
    return {
      currentPrice: 239.99,
      comparedPrice: 239.99,
      currencyCode: "USD",
    };
  }

  if (isInTrial) {
    return {
      currentPrice: findTableData.base,
      comparedPrice: findTableData.base,
      currencyCode: "USD",
    };
  }

  const map: Record<string, number> = {
    Premium: findTableData.Premium,
    Pro: findTableData.Pro,
    Basic: findTableData.Basic,
  };

  const currentPrice = map[planType ?? ""] ?? findTableData.base;

  return {
    currentPrice,
    comparedPrice: findTableData.base,
    currencyCode: "USD",
  };
}
