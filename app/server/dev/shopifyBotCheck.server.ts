/** 是否跳过 Shopify authenticate 的 isbot 410 拦截（仅用于本地 / 测试环境自动化浏览器）。 */
export function isShopifyBotCheckBypassEnabled(): boolean {
  const raw = process.env.SHOPIFY_ALLOW_BOT_UA?.trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}
