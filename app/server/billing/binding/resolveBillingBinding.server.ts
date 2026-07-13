import prisma from "../../../db.server";
import { ensureAccount } from "../account/ensureAccount.server";
import { BILLING_SYSTEM, type BillingSystem } from "../types.server";

export type BindingResolution = {
  billingSystem: BillingSystem;
  /** 本次是否新建了 binding（首次判定）。 */
  bound: boolean;
  /** 判定是否落库。 */
  persisted: boolean;
};

/**
 * 判定并锁定某 shop 的账本归属（幂等）。
 * - 已有 binding：直接返回。
 * - 无 binding：默认绑定 tsf，并 ensureAccount（不再问 Java /user/exists）。
 *   存量付费用户已由 migration:billing 迁完；新装/未判定店一律走新账本。
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
      billingSystem: existing.billingSystem as BillingSystem,
      bound: false,
      persisted: true,
    };
  }

  await prisma.shopBillingBinding.upsert({
    where: { shop },
    create: {
      shop,
      billingSystem: BILLING_SYSTEM.TSF,
      boundReason: "default_tsf",
    },
    update: {},
  });

  await ensureAccount(shop);

  return {
    billingSystem: BILLING_SYSTEM.TSF,
    bound: true,
    persisted: true,
  };
}

/** 读取 binding；无则返回 null（不触发判定）。 */
export async function getBillingBinding(
  shop: string,
): Promise<BillingSystem | null> {
  const row = await prisma.shopBillingBinding.findUnique({ where: { shop } });
  return row ? (row.billingSystem as BillingSystem) : null;
}

/** 便捷判断：该 shop 是否走新系统（tsf）。未判定/老用户均为 false。 */
export async function isTsfBillingShop(shop: string): Promise<boolean> {
  const system = await getBillingBinding(shop);
  return system === BILLING_SYSTEM.TSF;
}
