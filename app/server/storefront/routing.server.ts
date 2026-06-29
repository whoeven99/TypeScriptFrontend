import { isShopMigrated } from "~/server/translateV4/migration.server";

/**
 * 店面读 API 灰度路由：migratedToTsf 且命中 TRANSLATE_V4_SHOP_ALLOWLIST 时走 TSF，
 * 否则透明代理到 Java。
 */
export async function routeStorefrontRead<T>(
  shop: string,
  readFromTsf: () => Promise<T>,
  proxyToJava: () => Promise<T>,
): Promise<T> {
  if (await isShopMigrated(shop)) {
    return readFromTsf();
  }
  return proxyToJava();
}
