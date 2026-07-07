import type { Prisma } from "../../../generated/prisma";
import prisma from "../../../db.server";
import { APP_SUBSCRIPTION_STATUS, BILLING_LOG_EVENT } from "../types.server";

/**
 * 取消 / 过期：清订阅池、删订阅行与周期归档。
 * 加量包（purchasedCredits）与试用（trialCredits）池保留，商家降级后仍可用。
 */
export async function cancelSubscription(params: {
  shop: string;
  shopifySubscriptionId: string;
  status: string; // CANCELLED | EXPIRED
}): Promise<void> {
  const sub = await prisma.appSubscription.findUnique({
    where: { shop: params.shop },
  });
  if (!sub || sub.shopifySubscriptionId !== params.shopifySubscriptionId) {
    return;
  }

  const isTerminal =
    params.status === APP_SUBSCRIPTION_STATUS.CANCELLED ||
    params.status === APP_SUBSCRIPTION_STATUS.EXPIRED;

  if (!isTerminal) {
    await prisma.appSubscription.update({
      where: { shop: params.shop },
      data: { status: params.status },
    });
    return;
  }

  await prisma.$transaction(async (tx) => {
    const account = await tx.account.findUnique({
      where: { shop: params.shop },
    });
    const previous = Math.max(0, account?.subscriptionCredits ?? 0);
    const removed = Math.min(previous, Math.max(0, sub.creditsPerPeriod));

    await tx.billingLog.create({
      data: {
        shop: params.shop,
        eventType: BILLING_LOG_EVENT.SUBSCRIPTION_CANCELLED,
        planKey: sub.planKey,
        referenceId: sub.shopifySubscriptionId,
        creditsDelta: -removed,
        metadata: {
          status: params.status,
          previousSubscriptionCredits: previous,
          cancelledAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
      },
    });

    if (account) {
      await tx.account.update({
        where: { shop: params.shop },
        data: { subscriptionCredits: previous - removed },
      });
    }

    await tx.accountPeriodUsage.deleteMany({
      where: { appSubscriptionId: sub.shopifySubscriptionId },
    });

    await tx.appSubscription.delete({ where: { shop: params.shop } });
  });
}
