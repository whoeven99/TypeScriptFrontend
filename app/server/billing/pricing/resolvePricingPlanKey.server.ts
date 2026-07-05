import {
  SUBSCRIPTION_PLAN_DEFINITIONS,
  TOKEN_PACK_DEFINITIONS,
} from "~/routes/app.pricing/pricingCatalog";
import { PLAN_CATALOG_KIND } from "./types.server";

const TOKEN_PACK_PLAN_KEYS = Object.fromEntries(
  TOKEN_PACK_DEFINITIONS.map((pack) => [pack.name, pack.planKey]),
) as Record<string, string>;

const SUBSCRIPTION_TIER_KEYS = Object.fromEntries(
  SUBSCRIPTION_PLAN_DEFINITIONS.map((plan) => [
    plan.title.toLowerCase(),
    { monthly: plan.planKeyMonthly, annual: plan.planKeyAnnual },
  ]),
) as Record<string, { monthly: string; annual: string }>;

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
