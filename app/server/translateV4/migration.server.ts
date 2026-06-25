import prisma from "~/db.server";

/**
 * 该店是否已迁移到 TSF 新版翻译。已迁移的店，术语表/语言等读写走 TSF Prisma，
 * 否则走旧的 Java。短期内存缓存，避免每次请求都查库。
 */
const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { value: boolean; expiresAt: number }>();

export async function isShopMigrated(shop: string): Promise<boolean> {
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
    console.error(`[migration] isShopMigrated 查询失败 shop=${shop}:`, err);
    migrated = false;
  }

  cache.set(shop, { value: migrated, expiresAt: now + CACHE_TTL_MS });
  return migrated;
}

/** 迁移状态变更后调用，清掉缓存让下次读最新值。 */
export function invalidateMigrationCache(shop: string): void {
  cache.delete(shop);
}
