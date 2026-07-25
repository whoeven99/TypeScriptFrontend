import type { Prisma } from "../../../generated/prisma";
import prisma from "../../../db.server";
import { ensureAccount } from "../account/ensureAccount.server";
import { appendBillingLog } from "../billingLog.server";
import { APP_SUBSCRIPTION_STATUS, BILLING_LOG_EVENT } from "../types.server";
import {
  archivePeriodAndRenew,
  isSubscriptionRenewal,
  type SubscriptionPeriodSnapshot,
} from "./renewal.server";

export type ApplyActiveSubscriptionParams = {
  shop: string;
  /** Shopify AppSubscription GID（与老系统一致，迁移时复用同一 id）。 */
  shopifySubscriptionId: string;
  planKey: string;
  billingInterval: string;
  creditsPerPeriod: number;
  trialEndsAt?: Date | null;
  period: SubscriptionPeriodSnapshot;
  rawPayload?: Record<string, unknown>;
};

/**
 * 订阅 ACTIVE 入口：首次激活写订阅 + 发放周期额度；续费则走归档刷新。
 * 幂等：重复的激活 webhook 不重复发放（仅 pending→active 首次记 log）。
 */
export async function applyActiveSubscription(
  params: ApplyActiveSubscriptionParams,
): Promise<void> {
  const {
    shop,
    shopifySubscriptionId,
    planKey,
    billingInterval,
    creditsPerPeriod,
    trialEndsAt,
    period,
    rawPayload,
  } = params;

  await ensureAccount(shop);

  const existing = await prisma.appSubscription.findUnique({ where: { shop } });
  const account = await prisma.account.findUniqueOrThrow({ where: { shop } });

  if (
    existing &&
    existing.shopifySubscriptionId === shopifySubscriptionId &&
    isSubscriptionRenewal(existing, period.currentPeriodEnd)
  ) {
    await archivePeriodAndRenew({
      shop,
      subscription: existing,
      account,
      next: { ...period, planKey, creditsPerPeriod },
    });
    return;
  }

  const wasPending =
    !existing ||
    existing.status === APP_SUBSCRIPTION_STATUS.PENDING ||
    existing.shopifySubscriptionId !== shopifySubscriptionId;

  await prisma.appSubscription.upsert({
    where: { shop },
    create: {
      shop,
      planKey,
      shopifySubscriptionId,
      billingInterval,
      status: APP_SUBSCRIPTION_STATUS.ACTIVE,
      creditsPerPeriod,
      trialEndsAt: trialEndsAt ?? null,
      currentPeriodStart: period.currentPeriodStart,
      currentPeriodEnd: period.currentPeriodEnd,
      rawPayload: rawPayload as Prisma.InputJsonValue,
    },
    update: {
      planKey,
      shopifySubscriptionId,
      billingInterval,
      status: APP_SUBSCRIPTION_STATUS.ACTIVE,
      creditsPerPeriod,
      trialEndsAt: trialEndsAt ?? null,
      currentPeriodStart: period.currentPeriodStart,
      currentPeriodEnd: period.currentPeriodEnd,
      cancelledAt: null,
      rawPayload: rawPayload as Prisma.InputJsonValue,
    },
  });

  await prisma.account.update({
    where: { shop },
    data: { subscriptionCredits: creditsPerPeriod },
  });

  if (wasPending) {
    await appendBillingLog({
      shop,
      eventType: BILLING_LOG_EVENT.SUBSCRIPTION_ACTIVATED,
      planKey,
      referenceId: shopifySubscriptionId,
      creditsDelta: creditsPerPeriod,
      metadata: {
        billingInterval,
        // 额度周期锚点：Shopify/本地 currentPeriodEnd（禁止用 createdAt）
        billingPeriodEnd: period.currentPeriodEnd?.toISOString() ?? null,
        grantKind: "shopify_period",
      },
    });
  }
}
