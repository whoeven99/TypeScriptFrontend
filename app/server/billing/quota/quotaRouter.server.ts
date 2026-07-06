import { getShopQuota, type ShopQuota } from "~/server/translateV4/quota.server";
import { isTsfBillingShop } from "../binding/resolveBillingBinding.server";
import { deductCredits } from "./deductCredits.server";
import { getAccountQuota } from "./getAccountQuota.server";

/**
 * 额度出入口路由（灰度分叉）：
 *   - tsf 用户（新系统）：读写 Turso Account 三池账本。
 *   - legacy 用户（老系统）：转发 Java /quota 服务。
 * 上游调用方无需感知归属，统一走这两个函数。
 */

/** 查询额度（总/已用/剩余）。归属未判定或老用户走 Java。 */
export async function getShopCreditQuota(shop: string): Promise<ShopQuota | null> {
  if (await isTsfBillingShop(shop)) {
    const quota = await getAccountQuota(shop);
    if (!quota) return null;
    return {
      shopName: shop,
      maxToken: quota.totalCredits,
      usedToken: quota.usedCredits,
      remaining: quota.remainingCredits,
    };
  }
  return getShopQuota(shop);
}

/** Java 额度扣减（老系统）。credits 为已乘系数的积分。 */
async function deductLegacyQuota(shop: string, credits: number): Promise<void> {
  const base = (
    process.env.TSF_SERVER_URL?.trim() ||
    process.env.SERVER_URL?.trim() ||
    ""
  ).replace(/\/+$/, "");
  if (!base) return;
  try {
    await fetch(
      `${base}/quota/deduct?shopName=${encodeURIComponent(shop)}&tokens=${credits}`,
      { method: "POST" },
    );
  } catch (err) {
    console.error(`[quotaRouter] legacy deduct failed shop=${shop}:`, err);
  }
}

/** 扣减额度（credits 为已乘系数的积分）。tsf 写 Turso，legacy 转发 Java。 */
export async function deductShopCredits(
  shop: string,
  credits: number,
): Promise<void> {
  const amount = Math.max(0, Math.floor(credits));
  if (amount <= 0) return;

  if (await isTsfBillingShop(shop)) {
    await deductCredits(shop, amount);
    return;
  }
  await deductLegacyQuota(shop, amount);
}
