import { isShopMigrated } from "~/server/translateV4/migration.server";

function normalizeShop(shop: string): string {
  return shop.trim().toLowerCase();
}

/**
 * 解析 TRANSLATE_V4_SHOP_ALLOWLIST（逗号 / 分号 / 空白分隔的 myshopify 域名）。
 * 进程启动后缓存一次；若环境变量未设置或为空，返回 null（allowlist 未启用）。
 */
let _cachedAllowlist: Set<string> | null | undefined = undefined;

function getTranslateV4ShopAllowlist(): Set<string> | null {
  if (_cachedAllowlist !== undefined) return _cachedAllowlist;
  const raw = process.env.TRANSLATE_V4_SHOP_ALLOWLIST?.trim();
  if (!raw) {
    _cachedAllowlist = null;
    return null;
  }
  const shops = new Set(
    raw
      .split(/[,;\s]+/)
      .map(normalizeShop)
      .filter(Boolean),
  );
  _cachedAllowlist = shops.size > 0 ? shops : null;
  return _cachedAllowlist;
}

/** 本店是否在 TRANSLATE_V4_SHOP_ALLOWLIST 中；未配置或为空则一律 false。 */
export function isShopInTranslateV4Allowlist(shop: string): boolean {
  const list = getTranslateV4ShopAllowlist();
  if (!list) return false;
  return list.has(normalizeShop(shop));
}

/**
 * PageFly 灰度资格：migratedToTsf=true 且 shop 在 TRANSLATE_V4_SHOP_ALLOWLIST 中。
 *
 * allowlist 未配置时一律返回 false（强制要求显式开放，防止意外全量切流）。
 * 其他店面功能（Liquid 等）仅需 migratedToTsf=true，无需此函数。
 */
export async function isPageFlyGrayEligible(shop: string): Promise<boolean> {
  if (!isShopInTranslateV4Allowlist(shop)) return false;
  return isShopMigrated(shop);
}
