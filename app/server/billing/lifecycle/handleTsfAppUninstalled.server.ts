import prisma from "~/db.server";
import { onAppUninstalled } from "~/server/appLifecycle/onAppLifecycle.server";
import { APP_SUBSCRIPTION_STATUS } from "./types.server";
import { markSubscriptionNonActive } from "./subscription/activateSubscription.server";
import { usesTsfBilling } from "./billingRoute.server";

/**
 * TSF 用户卸载：记录 CommonEventLog、取消本地订阅池，不调用 Java Uninstall。
 * Account / BillingLog 保留（重装时 TRIAL_GRANTED 幂等）。
 */
export async function handleTsfAppUninstalled(params: {
  shop: string;
  topic?: string;
}): Promise<void> {
  await onAppUninstalled({
    shop: params.shop,
    topic: params.topic,
  });

  const sub = await prisma.appSubscription.findUnique({
    where: { shop: params.shop },
    select: { shopifySubscriptionId: true },
  });

  if (sub?.shopifySubscriptionId) {
    await markSubscriptionNonActive({
      shop: params.shop,
      shopifySubscriptionId: sub.shopifySubscriptionId,
      status: APP_SUBSCRIPTION_STATUS.CANCELLED,
      rawPayload: { source: "app_uninstalled", topic: params.topic },
    });
  }
}

/** 是否应对该 shop 走 TSF 卸载处理（与 bootstrap/quota 分流一致）。 */
export async function shouldHandleTsfUninstall(shop: string): Promise<boolean> {
  return usesTsfBilling(shop);
}
