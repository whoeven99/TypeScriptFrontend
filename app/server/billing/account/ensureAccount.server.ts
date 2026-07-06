import type { Account } from "../../../generated/prisma";
import prisma from "../../../db.server";

/** 确保 tsf 账户存在（幂等）。仅新用户系统调用。 */
export async function ensureAccount(shop: string): Promise<Account> {
  return prisma.account.upsert({
    where: { shop },
    create: { shop },
    update: {},
  });
}
