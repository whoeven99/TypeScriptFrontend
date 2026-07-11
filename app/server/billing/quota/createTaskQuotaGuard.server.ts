import { getNormalizedQuotaRemaining } from "~/lib/translationQuota";
import { getShopCreditQuota } from "./quotaRouter.server";

export type CreateTaskQuotaGuardResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

/**
 * 建任务额度校验。
 * - TSF 账本：remaining > 0 才允许。
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

  return {
    ok: false,
    status: 403,
    error: "v4.create.noCreditsPricing",
  };
}
