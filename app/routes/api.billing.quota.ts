import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import {
  deductShopQuota,
  getShopQuota,
  type ShopQuota,
} from "~/server/taskTokenUsage/shopQuota.server";

type QuotaEnvelope = {
  success: boolean;
  errorCode: number;
  errorMsg: string;
  response: ShopQuota | null;
};

function quotaEnvelope(
  success: boolean,
  response: ShopQuota | null,
  errorMsg = "",
): QuotaEnvelope {
  return {
    success,
    errorCode: success ? 0 : 1,
    errorMsg,
    response,
  };
}

/** GET /api/billing/quota —— 当前店铺额度（TSF Turso 或 Java）。 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const shopName = url.searchParams.get("shopName")?.trim() || session.shop;

  const quota = await getShopQuota(shopName);
  if (!quota) {
    return json(quotaEnvelope(false, null, "quota not found"), { status: 404 });
  }
  return json(quotaEnvelope(true, quota));
};

/**
 * POST /api/billing/quota?tokens=N —— 扣减额度（对齐 Java /quota/deduct）。
 * TSF 用户走 Turso；老用户走 Java。
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const shopName = url.searchParams.get("shopName")?.trim() || session.shop;
  const tokens = Number(url.searchParams.get("tokens"));

  if (!Number.isFinite(tokens) || tokens <= 0) {
    return json(quotaEnvelope(false, null, "tokens must be > 0"), { status: 400 });
  }

  const result = await deductShopQuota(shopName, tokens);
  if (!result.ok || !result.quota) {
    return json(quotaEnvelope(false, null, "deduct failed"), { status: 502 });
  }
  return json(quotaEnvelope(true, result.quota));
};
