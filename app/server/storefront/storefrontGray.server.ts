import { isShopMigrated } from "~/server/translateV4/migration.server";

function normalizeShop(shop: string): string {
  return shop.trim().toLowerCase();
}

/**
 * 解析 TRANSLATE_V4_SHOP_ALLOWLIST（逗号 / 分号 / 空白分隔的 myshopify 域名）。
 * 未配置或解析后为空 → 返回 null（店面 Widget/Liquid/Switcher 不走灰度）。
 */
function parseTranslateV4ShopAllowlist(): Set<string> | null {
  const raw = process.env.TRANSLATE_V4_SHOP_ALLOWLIST?.trim();
  if (!raw) return null;

  const shops = new Set(
    raw
      .split(/[,;\s]+/)
      .map((entry) => normalizeShop(entry))
      .filter(Boolean),
  );
  if (shops.size === 0) return null;
  return shops;
}

/** 本店是否在 TRANSLATE_V4_SHOP_ALLOWLIST 中；未配置或为空则一律 false。 */
export function isShopInTranslateV4Allowlist(shop: string): boolean {
  const allowlist = parseTranslateV4ShopAllowlist();
  if (!allowlist) return false;
  return allowlist.has(normalizeShop(shop));
}

/**
 * Widget / Liquid / Switcher 是否走 TSF 灰度：
 * `migratedToTsf=true` 且 shop 在 TRANSLATE_V4_SHOP_ALLOWLIST 中（allowlist 必须配置）。
 */
export async function isStorefrontGrayEligible(shop: string): Promise<boolean> {
  if (!(await isShopMigrated(shop))) return false;
  return isShopInTranslateV4Allowlist(shop);
}
