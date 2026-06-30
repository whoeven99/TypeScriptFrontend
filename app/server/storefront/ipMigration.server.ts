import { isShopMigrated } from "~/server/translateV4/migration.server";

const ALLOWLIST_CACHE_TTL_MS = 5 * 60 * 1000;
let _cachedAllowlist: Set<string> | null = null;
let _cacheExpiry = 0;

/**
 * 读取 TRANSLATE_V4_SHOP_ALLOWLIST 环境变量（逗号分隔的 shop 域名）。
 * 5 分钟内存缓存，避免每次请求都重新解析。
 */
function getAllowlist(): Set<string> {
  const now = Date.now();
  if (_cachedAllowlist && now < _cacheExpiry) return _cachedAllowlist;

  const raw = process.env.TRANSLATE_V4_SHOP_ALLOWLIST ?? "";
  _cachedAllowlist = new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
  _cacheExpiry = now + ALLOWLIST_CACHE_TTL_MS;
  return _cachedAllowlist;
}

/**
 * 判断该店铺的 IP 功能是否已完成灰度迁移到 TSF。
 *
 * 规则（两个条件都要满足）：
 *   1. ShopTranslationSettings.migratedToTsf === true
 *   2. shop 在环境变量 TRANSLATE_V4_SHOP_ALLOWLIST 白名单中
 *
 * 对比 isShopMigrated()（只检查条件1），IP 迁移要求额外配置白名单，
 * 是一道独立的灰度阀门，可按节奏逐步放量。
 */
export async function isShopIpMigrated(shop: string): Promise<boolean> {
  const migrated = await isShopMigrated(shop);
  if (!migrated) return false;
  return getAllowlist().has(shop);
}

/** 白名单变更（如重新部署）后可调用此函数立即清除缓存。 */
export function invalidateIpAllowlistCache(): void {
  _cachedAllowlist = null;
  _cacheExpiry = 0;
}
