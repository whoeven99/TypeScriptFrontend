import { json } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { verifyAppProxyHmac } from "~/server/storefront/auth.server";
import { parseLiquidTranslations } from "~/server/storefront/liquid.server";
import { fail } from "~/server/storefront/response.server";
import { isShopIpMigrated } from "~/server/storefront/ipMigration.server";
import {
  checkUserIp,
  logNoCrawler,
  logIncludeCrawler,
} from "~/server/storefront/ip.server";

/**
 * App Proxy storefront 路由：/api/storefront/*
 *
 * Shopify App Proxy 将 `https://{shop}/apps/ciwi/*` 转发到
 * `https://{tsf-host}/api/storefront/*`，并附带 shop/timestamp/signature。
 *
 * 灰度策略（migratedToTsf）：
 *   已迁移 → 从 Prisma 读取
 *   未迁移 → 透明代理到 Java（保留 Java 代码）
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

  // ── IP 灰度端点 ──────────────────────────────────────────────────────────
  // 路径格式（App Proxy 透传后）：
  //   userIp/checkUserIp
  //   userIp/noCrawlerPrintLog
  //   userIp/includeCrawlerPrintLog
  //
  // 灰度规则：
  //   isShopIpMigrated(shop) === true  →  TSF 本地 Prisma 处理
  //   else                             →  透传到 Java（保持现网行为）
  // ─────────────────────────────────────────────────────────────────────────

  if (path.startsWith("userIp/")) {
    const ipMigrated = await isShopIpMigrated(auth.shop);

    if (!ipMigrated) {
      return proxyToJava(request, auth.shop);
    }

    if (path === "userIp/checkUserIp") {
      const result = await checkUserIp(auth.shop);
      return json(result, { headers: CORS_HEADERS });
    }

    if (path === "userIp/noCrawlerPrintLog") {
      const body = await request.json().catch(() => ({}));
      logNoCrawler(auth.shop, body).catch((e) =>
        console.error("[ip] logNoCrawler error:", e),
      );
      return json(
        { success: true, errorCode: null, errorMsg: null, response: null },
        { headers: CORS_HEADERS },
      );
    }

    if (path === "userIp/includeCrawlerPrintLog") {
      const body = await request.json().catch(() => ({}));
      logIncludeCrawler(auth.shop, body).catch((e) =>
        console.error("[ip] logIncludeCrawler error:", e),
      );
      return json(
        { success: true, errorCode: null, errorMsg: null, response: null },
        { headers: CORS_HEADERS },
      );
    }

    return json(fail(404, "not found"), { status: 404, headers: CORS_HEADERS });
  }

  return json(fail(404, "not found"), { status: 404, headers: CORS_HEADERS });
};

// ────────────────────────────────────────────────────────────────────────────
// 辅助：透传到 Java 后端
// ────────────────────────────────────────────────────────────────────────────

/**
 * 将请求原样转发到 Java（SpringBackend），保留 query string 和 body。
 * 用于未迁移店的灰度回退。
 */
async function proxyToJava(request: Request, shop: string): Promise<Response> {
  const javaBase = process.env.SERVER_URL;
  if (!javaBase) {
    console.error("[storefront] SERVER_URL not configured, cannot proxy to Java");
    return new Response(
      JSON.stringify(fail(503, "java backend not configured")),
      { status: 503, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  const url = new URL(request.url);
  // App Proxy 路径：/api/storefront/{path}  →  Java 路径：/{path}
  const javaPath = url.pathname.replace(/^\/api\/storefront\//, "/");
  const javaUrl = `${javaBase}${javaPath}${url.search}`;

  try {
    let body: string | undefined;
    if (request.method !== "GET" && request.method !== "HEAD") {
      body = await request.text();
    }

    const upstream = await fetch(javaUrl, {
      method: request.method,
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-Shop": shop,
      },
      body,
    });

    const data = await upstream.text();
    return new Response(data, {
      status: upstream.status,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(`[storefront] proxyToJava failed url=${javaUrl}:`, err);
    return new Response(
      JSON.stringify(fail(502, "java backend unreachable")),
      { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }
}
