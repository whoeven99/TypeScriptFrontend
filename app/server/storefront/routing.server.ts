import { isStorefrontGrayEligible } from "./storefrontGray.server";

/**
 * 店面读 API 路由：默认走 TSF（v4）；v2PageWhitelist 中的店铺走 Java。
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
