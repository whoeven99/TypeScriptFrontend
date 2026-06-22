const TRUTHY = new Set(["true", "1", "yes"]);

function isTruthyEnv(name: string): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  return raw !== undefined && TRUTHY.has(raw);
}

/** 翻译 v4 功能开关：未配置或不为 true/1/yes 时默认关闭。 */
export function isTranslateV4Enabled(): boolean {
  return isTruthyEnv("TRANSLATE_V4_ENABLED");
}

/** 规范化店铺域名，支持 `ciwishop` 或 `ciwishop.myshopify.com`。 */
export function normalizeShopDomain(shop: string): string {
  const trimmed = shop.trim().toLowerCase();
  if (!trimmed) return "";
  if (trimmed.includes(".")) return trimmed;
  return `${trimmed}.myshopify.com`;
}

/**
 * 解析 `TRANSLATE_V4_SHOP_ALLOWLIST`：逗号/分号/空白分隔的店铺列表。
 * 例：`ciwishop.myshopify.com, beta-store.myshopify.com` 或 `ciwishop,beta-store`
 */
export function parseTranslateV4ShopAllowlist(): Set<string> {
  const raw = process.env.TRANSLATE_V4_SHOP_ALLOWLIST?.trim();
  if (!raw) return new Set();

  const shops = raw
    .split(/[,;\s]+/)
    .map(normalizeShopDomain)
    .filter(Boolean);

  return new Set(shops);
}

/**
 * 首页「极速翻译」卡片 +「一键迁移」是否对本店开放。
 *
 * - 需 `TRANSLATE_V4_ENABLED=true`
 * - `TRANSLATE_V4_SHOP_ALLOWLIST_OPEN=true` 时全员开放（验证完成后放开）
 * - 否则仅 `TRANSLATE_V4_SHOP_ALLOWLIST` 中的店可见；未配置 allowlist 时默认全员关闭
 */
export function isTranslateV4ExpressBetaEnabled(shop: string): boolean {
  if (!isTranslateV4Enabled()) return false;
  if (isTruthyEnv("TRANSLATE_V4_SHOP_ALLOWLIST_OPEN")) return true;

  const allowlist = parseTranslateV4ShopAllowlist();
  if (allowlist.size === 0) return false;

  return allowlist.has(normalizeShopDomain(shop));
}
