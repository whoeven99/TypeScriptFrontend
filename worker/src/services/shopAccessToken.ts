import { getOfflineAccessTokenFromTsf } from "./tsfDb.js";

const LOG = "[shop-token]";

/**
 * Shopify Admin API 的唯一 token 来源：Turso Session 表中的 offline session。
 * 不接受 job 快照、调用方兜底值，也不做进程内缓存。
 */
export async function getShopAccessToken(shop: string): Promise<string> {
  const normalizedShop = shop.trim();
  if (!normalizedShop) {
    throw new Error(`${LOG} shop is required`);
  }

  const token = (await getOfflineAccessTokenFromTsf(normalizedShop))?.trim();
  if (!token) {
    throw new Error(
      `${LOG} no offline token in Turso Session for shop=${normalizedShop}`,
    );
  }
  return token;
}
