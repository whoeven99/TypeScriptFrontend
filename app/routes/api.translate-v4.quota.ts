import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { getShopQuota } from "~/server/translateV4/quota.server";

/** GET /api/translate-v4/quota?shopName= —— 当前店铺额度（总/已用/剩余）。 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const shopName = url.searchParams.get("shopName")?.trim() || session.shop;

  const quota = await getShopQuota(shopName);
  return json({ ok: true, quota });
};
