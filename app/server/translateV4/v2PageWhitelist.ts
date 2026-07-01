/** 仍使用 v2 翻译页/首页的店铺；其余店铺默认进入 v4。 */
const V2_PAGE_WHITELIST = new Set(["f31a06.myshopify.com"]);

export function isV2PageWhitelistShop(shop: string): boolean {
  return V2_PAGE_WHITELIST.has(shop);
}
