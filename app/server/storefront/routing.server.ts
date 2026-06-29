import { isStorefrontGrayEligible } from "./storefrontGray.server";

/**
 * 店面读 API 灰度路由：migratedToTsf 且 shop 在 TRANSLATE_V4_SHOP_ALLOWLIST 内时走 TSF；allowlist 未配置则走 Java。
 */
export async function routeStorefrontRead<T>(
  shop: string,
  readFromTsf: () => Promise<T>,
  proxyToJava: () => Promise<T>,
): Promise<T> {
  if (await isStorefrontGrayEligible(shop)) {
    return readFromTsf();
  }
  return proxyToJava();
}
