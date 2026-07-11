import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";
import { APP_SUBSCRIPTION_STATUS } from "~/server/billing/types.server";

/**
 * GET /api/billing/active-subscription?shopName= —— 当前生效订阅的 Shopify GID（取消套餐用，按 binding 分叉）。
 * tsf：读 Turso AppSubscription；legacy：转发 Java getLatestActiveSubscribeId。
 * 返回 { ok, subscriptionId }。
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const shop = url.searchParams.get("shopName")?.trim() || session.shop;

  const sub = await prisma.appSubscription.findUnique({ where: { shop } });
  const subscriptionId =
    sub && sub.status === APP_SUBSCRIPTION_STATUS.ACTIVE
      ? sub.shopifySubscriptionId
      : null;
  return json({ ok: Boolean(subscriptionId), subscriptionId });
};
