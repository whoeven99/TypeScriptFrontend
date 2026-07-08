import { loadAppBootstrapJavaData } from "~/server/appBootstrap.server";
import { getNormalizedQuotaRemaining } from "~/lib/translationQuota";
import { isTsfBillingShop } from "../binding/resolveBillingBinding.server";
import { getShopCreditQuota } from "./quotaRouter.server";

export type CreateTaskQuotaGuardResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

/**
 * 建任务额度校验。
 * - tsf（新账本）：remaining > 0 才允许（与 Java /quota/query 展示一致，无付费 bypass）。
 * - legacy（老系统）：remaining > 0，或付费套餐 / 免费试用期内可建任务（沿用 Java 口径）。
 */
export async function evaluateCreateTaskQuotaGuard(
  shopName: string,
): Promise<CreateTaskQuotaGuardResult> {
  const quota = await getShopCreditQuota(shopName);
  const remainingCredits = getNormalizedQuotaRemaining(quota);
  if (remainingCredits == null) {
    return {
      ok: false,
      status: 503,
      error: "v4.create.quotaUnavailable",
    };
  }
  if (remainingCredits > 0) {
    return { ok: true };
  }

  const isTsf = await isTsfBillingShop(shopName);
  const bootstrap = await loadAppBootstrapJavaData({
    shop: shopName,
    server: process.env.SERVER_URL || "",
  });

  if (isTsf) {
    if (bootstrap.isNew === null) {
      return {
        ok: false,
        status: 409,
        error: "v4.create.quotaCheckPending",
      };
    }
    return {
      ok: false,
      status: 403,
      error: bootstrap.isNew
        ? "v4.create.noCreditsTrial"
        : "v4.create.noCreditsPricing",
    };
  }

  const normalizedPlanType = bootstrap.plan.type?.trim().toLowerCase() || "";
  const hasPaidPlan =
    normalizedPlanType !== "" && normalizedPlanType !== "free";
  if (hasPaidPlan || bootstrap.plan.isInFreePlanTime) {
    return { ok: true };
  }

  if (bootstrap.isNew === null) {
    return {
      ok: false,
      status: 409,
      error: "v4.create.quotaCheckPending",
    };
  }

  return {
    ok: false,
    status: 403,
    error: bootstrap.isNew
      ? "v4.create.noCreditsTrial"
      : "v4.create.noCreditsPricing",
  };
}
