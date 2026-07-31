import axios from "axios";
import prisma from "../../../db.server";
import { buildShopifyAdminGraphqlUrl } from "../../../lib/shopifyAdminApiVersion";
import { APP_SUBSCRIPTION_STATUS } from "../types.server";
import { cancelSubscription } from "./cancelSubscription.server";

/**
 * 卸载 / GDPR redact：best-effort 取消 Shopify 订阅，并清本地 AppSubscription。
 * 与 APP_SUBSCRIPTIONS_UPDATE(CANCELLED) 互补；两边都调 cancelSubscription，后者对已删行幂等 no-op。
 */
export async function cleanupBillingOnUninstall(params: {
  shop: string;
  accessToken?: string | null;
}): Promise<void> {
  const { shop, accessToken } = params;
  const sub = await prisma.appSubscription.findUnique({ where: { shop } });
  if (!sub) return;

  if (accessToken && sub.shopifySubscriptionId) {
    await cancelShopifySubscriptionBestEffort({
      shop,
      accessToken,
      subscriptionId: sub.shopifySubscriptionId,
    });
  }

  await cancelSubscription({
    shop,
    shopifySubscriptionId: sub.shopifySubscriptionId,
    status: APP_SUBSCRIPTION_STATUS.CANCELLED,
  });
}

async function cancelShopifySubscriptionBestEffort(params: {
  shop: string;
  accessToken: string;
  subscriptionId: string;
}): Promise<void> {
  try {
    const response = await axios({
      url: buildShopifyAdminGraphqlUrl(params.shop),
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": params.accessToken,
        "Content-Type": "application/json",
      },
      data: {
        query: `mutation AppSubscriptionCancel($id: ID!, $prorate: Boolean) {
          appSubscriptionCancel(id: $id, prorate: $prorate) {
            userErrors {
              field
              message
            }
            appSubscription {
              id
              status
            }
          }
        }`,
        variables: {
          id: params.subscriptionId,
          prorate: true,
        },
      },
    });
    const payload = response.data?.data?.appSubscriptionCancel;
    const userErrors = payload?.userErrors;
    if (Array.isArray(userErrors) && userErrors.length > 0) {
      console.warn(
        `[billing uninstall] Shopify cancel userErrors shop=${params.shop}:`,
        userErrors,
      );
      return;
    }
    console.log(
      `[billing uninstall] Shopify cancel ok shop=${params.shop} status=${payload?.appSubscription?.status ?? "unknown"}`,
    );
  } catch (err) {
    console.error(
      `[billing uninstall] Shopify cancel failed shop=${params.shop}:`,
      err,
    );
  }
}
