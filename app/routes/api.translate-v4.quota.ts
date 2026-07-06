import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { getShopCreditQuota } from "~/server/billing/quota/quotaRouter.server";

/** GET /api/translate-v4/quota?shopName= —— 当前店铺额度（总/已用/剩余，按 binding 分叉）。 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const shopName = url.searchParams.get("shopName")?.trim() || session.shop;

  const quota = await getShopCreditQuota(shopName);
  return json({ ok: true, quota });
};
