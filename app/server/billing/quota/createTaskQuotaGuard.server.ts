import { getAccountQuota } from "./getAccountQuota.server";

export type CreateTaskQuotaGuardResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

/** 建任务额度校验：Turso 账本 remaining > 0 才允许（负数/零一律拒绝）。 */
export async function evaluateCreateTaskQuotaGuard(
  shopName: string,
): Promise<CreateTaskQuotaGuardResult> {
  const quota = await getAccountQuota(shopName);
  if (!quota) {
    return {
      ok: false,
      status: 503,
      error: "v4.create.quotaUnavailable",
    };
  }
  // 直接读账本剩余，避免 normalize 把负数夹成 0 后掩盖真实透支状态。
  if (quota.remainingCredits > 0) {
    return { ok: true };
  }

  return {
    ok: false,
    status: 403,
    error: "v4.create.noCreditsPricing",
  };
}
