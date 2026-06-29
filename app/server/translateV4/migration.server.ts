import prisma from "~/db.server";

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { value: boolean; expiresAt: number }>();

/**
 * Turso 中 migratedToTsf 是否为 true。
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
 * 该店是否已切到 v4（由迁移脚本或迁移 API 写入 migratedToTsf 标记）。
 */
export async function isShopMigrated(shop: string): Promise<boolean> {
  return hasShopMigratedToTsf(shop);
}

/** 迁移状态变更后调用，清掉缓存让下次读最新值。 */
export function invalidateMigrationCache(shop: string): void {
  cache.delete(shop);
}
