import type { Account } from "../../../generated/prisma";
import prisma from "../../../db.server";

/**
 * 确保 tsf 账户存在且非软删除状态（幂等）。
 * 卸载 → 重装：恢复账户，但额度清零（全新开始，避免重复试用）。
 */
export async function ensureAccount(shop: string): Promise<Account> {
  const existing = await prisma.account.findUnique({ where: { shop } });
  if (existing && existing.deletedAt) {
    // 卸载后重装：恢复账户，清空所有额度
    return prisma.account.update({
      where: { shop },
      data: {
        deletedAt: null,
        subscriptionCredits: 0,
        purchasedCredits: 0,
        trialCredits: 0,
        usedCredits: 0,
      },
    });
  }
  return prisma.account.upsert({
    where: { shop },
    create: { shop },
    update: { deletedAt: null },
  });
}
