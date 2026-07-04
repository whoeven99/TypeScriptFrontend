const TOKEN_PACK_PLAN_KEYS: Record<string, string> = {
  "500K": "tsf_pack_500k",
  "1M": "tsf_pack_1m",
  "2M": "tsf_pack_2m",
  "3M": "tsf_pack_3m",
  "5M": "tsf_pack_5m",
  "10M": "tsf_pack_10m",
  "20M": "tsf_pack_20m",
  "30M": "tsf_pack_30m",
};

const SUBSCRIPTION_TIER_KEYS: Record<string, { monthly: string; annual: string }> =
  {
    basic: {
      monthly: "tsf_basic_monthly",
      annual: "tsf_basic_annual",
    },
    pro: {
      monthly: "tsf_pro_monthly",
      annual: "tsf_pro_annual",
    },
    premium: {
      monthly: "tsf_premium_monthly",
      annual: "tsf_premium_annual",
    },
  };

/** 购包 UI `payInfo.name`（如 "500K"）→ PlanCatalog planKey。 */
export function resolveTokenPackPlanKey(packName: string): string | null {
  const key = packName.trim();
  return TOKEN_PACK_PLAN_KEYS[key] ?? null;
}

/** 订阅 UI `payForPlan.title` + yearly → PlanCatalog planKey。 */
export function resolveSubscriptionPlanKey(
  title: string,
  yearly: boolean,
): string | null {
  const tier = title.trim().toLowerCase();
  const entry = SUBSCRIPTION_TIER_KEYS[tier];
  if (!entry) return null;
  return yearly ? entry.annual : entry.monthly;
}
