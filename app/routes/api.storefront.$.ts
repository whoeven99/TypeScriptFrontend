import { json } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { verifyAppProxyHmac } from "~/server/storefront/auth.server";
import { parseLiquidTranslations } from "~/server/storefront/liquid.server";
import { fail } from "~/server/storefront/response.server";

/**
 * App Proxy storefront 路由：/api/storefront/*
 *
 * Shopify App Proxy 将 `https://{shop}/apps/ciwi/*` 转发到
 * `https://{tsf-host}/api/storefront/*`，并附带 shop/timestamp/signature。
 *
 * 灰度策略（migratedToTsf）：
 *   true  → 从 Prisma 读取
 *   false → 透明代理到 Java（保留 Java 代码）
 */

// 开发环境可设 STOREFRONT_SKIP_HMAC=true 跳过签名校验
const SKIP_HMAC = process.env.STOREFRONT_SKIP_HMAC === "true";

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

  if (SKIP_HMAC) return { ok: true, shop };

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

    const result = await parseLiquidTranslations(shopName, languageCode);
    return json(result, { headers: CORS_HEADERS });
  }

  return json(fail(404, "not found"), { status: 404, headers: CORS_HEADERS });
};
