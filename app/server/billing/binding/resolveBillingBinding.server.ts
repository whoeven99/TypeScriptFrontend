import prisma from "../../../db.server";
import { ensureAccount } from "../account/ensureAccount.server";

export type BindingResolution = {
  /** 本次是否新建了 binding（首次判定）。 */
  bound: boolean;
  /** 判定是否落库。 */
  persisted: boolean;
};

/**
 * 判定并锁定某 shop 的 TSF 账本初始化（幂等）。
 * - 已有 binding：直接返回。
 * - 无 binding：写入初始化标记，并 ensureAccount。
 */
export async function resolveBillingBinding(
  shop: string,
): Promise<BindingResolution> {
  const existing = await prisma.shopBillingBinding.findUnique({
    where: { shop },
  });
  if (existing) {
    // 重装/已有 binding 时仍需恢复可能被软删的账户
    await ensureAccount(shop);
    return {
      bound: false,
      persisted: true,
    };
  }

  await prisma.shopBillingBinding.upsert({
    where: { shop },
    create: {
      shop,
    },
    update: {},
  });

  await ensureAccount(shop);

  return {
    bound: true,
    persisted: true,
  };
}
