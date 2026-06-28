import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { getShopQuota } from "~/server/translateV4/quota.server";
import { isTranslateV4ShopAllowed } from "~/server/translateV4/feature.server";

async function reportTranslateV4QuotaDebug(
  hypothesisId: "A" | "D",
  location: string,
  msg: string,
  data: Record<string, unknown>,
) {
  // #region debug-point D:translate-v4-quota
  await fetch("http://127.0.0.1:7777/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: "translate-v4-500",
      runId: "pre-fix",
      hypothesisId,
      location,
      msg: `[DEBUG] ${msg}`,
      data,
      ts: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}

/** GET /api/translate-v4/quota?shopName= —— 当前店铺额度（总/已用/剩余）。 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);
    const url = new URL(request.url);
    const shopName = url.searchParams.get("shopName")?.trim() || session.shop;

    await reportTranslateV4QuotaDebug("D", "api.translate-v4.quota:entry", "quota loader entry", {
      requestShop: shopName,
      sessionShop: session.shop,
    });

    if (!isTranslateV4ShopAllowed(shopName)) {
      return json({ ok: false, error: "功能未开放" }, { status: 403 });
    }
    const quota = await getShopQuota(shopName);
    await reportTranslateV4QuotaDebug("A", "api.translate-v4.quota:success", "quota loader success", {
      requestShop: shopName,
      hasQuota: quota != null,
    });
    return json({ ok: true, quota });
  } catch (err) {
    await reportTranslateV4QuotaDebug("A", "api.translate-v4.quota:error", "quota loader threw", {
      url: request.url,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
};
