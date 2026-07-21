/**
 * Shopify Admin API 版本（全仓硬编码单一来源）。
 * 与 worker/src/services/shopifyAdminApiVersion.ts 保持同值；升级时两边一起改。
 * 不读 GRAPHQL_VERSION 等环境变量，避免本地/部署漏配变成 /admin/api/undefined/。
 */
export const SHOPIFY_ADMIN_API_VERSION = "2026-07";

export function buildShopifyAdminGraphqlUrl(shopDomain: string): string {
  const shop = shopDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return `https://${shop}/admin/api/${SHOPIFY_ADMIN_API_VERSION}/graphql.json`;
}
