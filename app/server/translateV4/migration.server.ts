import prisma from "~/db.server";
import { isTranslateV4ShopAllowed } from "~/server/translateV4/feature.server";

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { value: boolean; expiresAt: number }>();

/**
 * Turso 中 migratedToTsf 是否为 true（不含 allowlist，用于展示真实迁移状态）。
 */
export async function hasShopMigratedToTsf(shop: string): Promise<boolean> {
  const now = Date.now();
  const cached = cache.get(shop);
  if (cached && cached.expiresAt > now) return cached.value;

  let migrated = false;
  try {
    const row = await prisma.shopTranslationSettings.findUnique({
      where: { shop },
      select: { migratedToTsf: true },
    });
    migrated = row?.migratedToTsf ?? false;
  } catch (err) {
    console.error(`[migration] hasShopMigratedToTsf 查询失败 shop=${shop}:`, err);
    migrated = false;
  }

  cache.set(shop, { value: migrated, expiresAt: now + CACHE_TTL_MS });
  return migrated;
}

/**
 * 该店是否走 TSF 数据路径（Liquid/术语表/店面等）。
 * 需同时满足：Turso migratedToTsf=true，且店铺命中 TRANSLATE_V4_SHOP_ALLOWLIST（或全员开放）。
 */
export async function isShopMigrated(shop: string): Promise<boolean> {
  if (!isTranslateV4ShopAllowed(shop)) return false;
  return hasShopMigratedToTsf(shop);
}

/** 迁移状态变更后调用，清掉缓存让下次读最新值。 */
export function invalidateMigrationCache(shop: string): void {
  cache.delete(shop);
}
