import prisma from "../../../db.server";
import { CheckUserExists } from "~/api/JavaServer";
import { ensureAccount } from "../account/ensureAccount.server";
import { BILLING_SYSTEM, type BillingSystem } from "../types.server";

export type BindingResolution = {
  billingSystem: BillingSystem;
  /** 本次是否新建了 binding（首次判定）。 */
  bound: boolean;
  /** 判定是否落库（Java 未确定时为 false，本次按 legacy 处理但不锁定）。 */
  persisted: boolean;
};

/**
 * 判定并锁定某 shop 的账本归属（幂等）。
 * - 已有 binding：直接返回，不再问 Java。
 * - 无 binding：调 Java /user/exists。
 *   - 查无此 shop（legacy=false）→ 绑定 tsf：仅 ensureAccount（试用改由订阅 trialDays 承载，不单发 trialCredits）。
 *   - 已存在（legacy=true）→ 绑定 legacy。
 *   - Java 未确定（调用失败）→ 不写 binding，本次按 legacy 处理，下次进入重试。
 */
export async function resolveBillingBinding(
  shop: string,
): Promise<BindingResolution> {
  const existing = await prisma.shopBillingBinding.findUnique({
    where: { shop },
  });
  if (existing) {
    return {
      billingSystem: existing.billingSystem as BillingSystem,
      bound: false,
      persisted: true,
    };
  }

  const check = await CheckUserExists({ shop });
  if (!check?.success) {
    // Java 未确定：不锁定，避免把潜在老用户永久错绑到新系统
    return {
      billingSystem: BILLING_SYSTEM.LEGACY,
      bound: false,
      persisted: false,
    };
  }

  const isLegacy = Boolean(check.response?.legacy);
  const billingSystem: BillingSystem = isLegacy
    ? BILLING_SYSTEM.LEGACY
    : BILLING_SYSTEM.TSF;

  await prisma.shopBillingBinding.upsert({
    where: { shop },
    create: {
      shop,
      billingSystem,
      boundReason: isLegacy ? "exists_in_java" : "not_found_in_java",
    },
    update: {},
  });

  if (billingSystem === BILLING_SYSTEM.TSF) {
    // 试用由订阅 trialDays 承载（不再单发 trialCredits）：仅建空账户。
    await ensureAccount(shop);
  }

  return { billingSystem, bound: true, persisted: true };
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
