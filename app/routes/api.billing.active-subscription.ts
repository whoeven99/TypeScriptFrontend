import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { GetLatestActiveSubscribeId } from "~/api/JavaServer";
import { authenticate } from "~/shopify.server";
import { getTsfActiveSubscriptionId } from "~/server/billing/pricing/handleTsfPricingAction.server";
import { isTsfBillingShop } from "~/server/billing/isTsfBillingShop.server";

/** GET /api/billing/active-subscription —— 当前可取消的 Shopify 订阅 GID。 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  if (await isTsfBillingShop(shop)) {
    const subscriptionId = await getTsfActiveSubscriptionId(shop);
    if (!subscriptionId) {
      return json({ success: false, errorCode: 1, errorMsg: "NO_ACTIVE_SUBSCRIPTION", response: null });
    }
    return json({ success: true, errorCode: 0, errorMsg: "", response: subscriptionId });
  }

  const server = process.env.SERVER_URL || "";
  const data = await GetLatestActiveSubscribeId({ shop, server });
  return json(data);
};
