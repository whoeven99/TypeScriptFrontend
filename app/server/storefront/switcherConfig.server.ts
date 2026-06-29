import axios from "axios";
import { routeStorefrontRead } from "./routing.server";
import { ok, fail, type BaseResponse } from "./response.server";
import {
  readSwitcherConfigPayload,
  type WidgetConfigResponse,
} from "./switcherData.server";

/**
 * 灰度入口：migratedToTsf 且 shop 在 TRANSLATE_V4_SHOP_ALLOWLIST 内时从 Prisma 读；allowlist 未配置则走 Java。
 * 对应 Java POST /widgetConfigurations/getData。
 */
export async function getSwitcherConfig(
  shop: string,
): Promise<BaseResponse<WidgetConfigResponse>> {
  return routeStorefrontRead(
    shop,
    () => readFromPrisma(shop),
    () => proxyToJava(shop),
  );
}

/** migratedToTsf 路径：从 Prisma SwitcherConfiguration + IpRedirection 读取 */
async function readFromPrisma(shop: string): Promise<BaseResponse<WidgetConfigResponse>> {
  const payload = await readSwitcherConfigPayload(shop);
  if (!payload) {
    return fail(10001, "query error");
  }
  return ok(payload);
}

/** migratedToTsf=false：透明代理到 Java，保留 Java 代码 */
async function proxyToJava(shop: string): Promise<BaseResponse<WidgetConfigResponse>> {
  const base = process.env.SERVER_URL?.trim().replace(/\/+$/, "");
  if (!base) {
    console.error("[storefront/switcherConfig] SERVER_URL not configured, cannot proxy to Java");
    return fail(10001, "upstream not available");
  }
  try {
    const res = await axios.post<BaseResponse<WidgetConfigResponse>>(
      `${base}/widgetConfigurations/getData`,
      { shopName: shop },
      { timeout: 10_000 },
    );
    return res.data;
  } catch (err) {
    console.error(`[storefront/switcherConfig] proxyToJava failed shop=${shop}:`, err);
    return fail(10001, "upstream error");
  }
}
