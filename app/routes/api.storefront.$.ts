import { json } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { verifyAppProxyHmac } from "~/server/storefront/auth.server";
import { parseLiquidTranslations } from "~/server/storefront/liquid.server";
import { getSwitcherConfig } from "~/server/storefront/switcherConfig.server";
import { readPageFlyTranslations } from "~/server/storefront/pagefly.server";
import { fail } from "~/server/storefront/response.server";

/**
 * App Proxy storefront 路由：/api/storefront/*
 *
 * Shopify App Proxy 将 `https://{shop}/apps/ciwi/*` 转发到
 * `https://{tsf-host}/api/storefront/*`，并附带 shop/timestamp/signature。
 *
 * 路由策略：默认走 TSF（v4/Prisma）；v2PageWhitelist 中的店铺透明代理到 Java。
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

/** 校验 App Proxy HMAC 并返回 shop。 */
function authenticate(
  request: Request,
): { ok: true; shop: string } | { ok: false } {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") ?? "";
  if (!shop) return { ok: false };

  const timestampRaw = url.searchParams.get("timestamp");
  const timestamp = timestampRaw ? Number(timestampRaw) : Number.NaN;
  if (!Number.isFinite(timestamp)) return { ok: false };
  const MAX_SKEW_MS = 5 * 60 * 1000;
  if (Math.abs(Date.now() - timestamp * 1000) > MAX_SKEW_MS) return { ok: false };

  const apiSecret = process.env.SHOPIFY_API_SECRET ?? "";
  if (!apiSecret) {
    console.error("[storefront] SHOPIFY_API_SECRET not set");
    return { ok: false };
  }
  if (!verifyAppProxyHmac(url, apiSecret)) return { ok: false };
  return { ok: true, shop };
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const auth = authenticate(request);
  if (!auth.ok) {
    return json(fail(401, "unauthorized"), { status: 401, headers: CORS_HEADERS });
  }
  return json(fail(404, "not found"), { status: 404, headers: CORS_HEADERS });
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  if (request.method.toUpperCase() === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const auth = authenticate(request);
  if (!auth.ok) {
    return json(fail(401, "unauthorized"), { status: 401, headers: CORS_HEADERS });
  }

  const path = (params["*"] ?? "").replace(/^\/+/, "");
  const url = new URL(request.url);

  // POST /api/storefront/liquid/parseLiquidDataByShopNameAndLanguage
  if (path === "liquid/parseLiquidDataByShopNameAndLanguage") {
    const shopName = url.searchParams.get("shopName") ?? auth.shop;
    const languageCode = url.searchParams.get("languageCode") ?? "";

    // 防止跨店读取
    if (shopName !== auth.shop) {
      return json(fail(403, "forbidden"), { status: 403, headers: CORS_HEADERS });
    }

    try {
      const result = await parseLiquidTranslations(shopName, languageCode);
      return json(result, { headers: CORS_HEADERS });
    } catch (err) {
      console.error(`[storefront] liquid parse failed shop=${shopName}:`, err);
      return json(fail(10001, "internal error"), {
        status: 500,
        headers: CORS_HEADERS,
      });
    }
  }

  // POST /api/storefront/widgetConfigurations/getData
  if (path === "widgetConfigurations/getData") {
    let shop = auth.shop;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const shopName = typeof body.shopName === "string" ? body.shopName : "";
    if (shopName && shopName !== auth.shop) {
      return json(fail(403, "forbidden"), { status: 403, headers: CORS_HEADERS });
    }
    if (shopName) shop = shopName;

    try {
      const result = await getSwitcherConfig(shop);
      return json(result, { headers: CORS_HEADERS });
    } catch (err) {
      console.error(`[storefront] getSwitcherConfig failed shop=${shop}:`, err);
      return json(fail(10001, "internal error"), {
        status: 500,
        headers: CORS_HEADERS,
      });
    }
  }

  // POST /api/storefront/userPageFly/readTranslatedText
  // 默认走 v4（Prisma）；v2PageWhitelist 中的店铺透明代理 Java
  if (path === "userPageFly/readTranslatedText") {
    const shopName = url.searchParams.get("shopName") ?? auth.shop;
    const languageCode = url.searchParams.get("languageCode") ?? "";

    if (shopName !== auth.shop) {
      return json(fail(403, "forbidden"), { status: 403, headers: CORS_HEADERS });
    }

    try {
      const result = await readPageFlyTranslations(shopName, languageCode);
      return json(result, { headers: CORS_HEADERS });
    } catch (err) {
      console.error(`[storefront] pagefly read failed shop=${shopName}:`, err);
      return json(fail(10001, "internal error"), {
        status: 500,
        headers: CORS_HEADERS,
      });
    }
  }

  return json(fail(404, "not found"), { status: 404, headers: CORS_HEADERS });
};
