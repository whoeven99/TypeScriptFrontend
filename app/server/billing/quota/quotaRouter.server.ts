import {
  normalizeShopQuota,
  type ShopQuota,
} from "~/lib/translationQuota";
import { deductCredits } from "./deductCredits.server";
import { getAccountQuota } from "./getAccountQuota.server";
import {
  recordCreditUsage,
  type CreditUsageSource,
} from "./recordCreditUsage.server";

/** 额度出入口：读写 Turso Account 三池账本。 */

export type DeductShopCreditsAudit = {
  source: CreditUsageSource;
  referenceId?: string;
  metadata?: Record<string, unknown>;
};

/** 查询 TSF 账本额度（总/已用/剩余）。 */
export async function getShopCreditQuota(shop: string): Promise<ShopQuota | null> {
  const quota = await getAccountQuota(shop);
  if (!quota) return null;
  return normalizeShopQuota({
    shopName: shop,
    maxToken: quota.totalCredits,
    usedToken: quota.usedCredits,
    remaining: quota.remainingCredits,
  });
}

/**
 * 扣减 TSF Turso 账本额度（credits 为已乘系数的积分）。
 * 传入 audit 时额外写 CreditUsage（失败不阻断扣费）。
 */
export async function deductShopCredits(
  shop: string,
  credits: number,
  audit?: DeductShopCreditsAudit,
): Promise<void> {
  const amount = Math.max(0, Math.floor(credits));
  if (amount <= 0) return;

  await deductCredits(shop, amount);
  if (audit) {
    await recordCreditUsage({
      shop,
      source: audit.source,
      credits: amount,
      referenceId: audit.referenceId,
      metadata: audit.metadata,
    });
  }
}
