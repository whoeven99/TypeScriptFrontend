import {
  normalizeShopQuota,
  type ShopQuota,
} from "~/lib/translationQuota";
import { deductCredits } from "./deductCredits.server";
import { getAccountQuota } from "./getAccountQuota.server";

/**
 * 额度出入口路由（灰度分叉）：
 *   - tsf 用户（新系统）：读写 Turso Account 三池账本。
 *   - legacy 用户（老系统）：转发 Java /quota 服务。
 * 上游调用方无需感知归属，统一走这两个函数。
 */

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

/** 扣减 TSF Turso 账本额度（credits 为已乘系数的积分）。 */
export async function deductShopCredits(
  shop: string,
  credits: number,
): Promise<void> {
  const amount = Math.max(0, Math.floor(credits));
  if (amount <= 0) return;

  await deductCredits(shop, amount);
}
