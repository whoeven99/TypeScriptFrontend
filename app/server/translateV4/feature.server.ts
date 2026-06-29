const TRUTHY = new Set(["true", "1", "yes"]);

function isTruthyEnv(name: string): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  return raw !== undefined && TRUTHY.has(raw);
}

/** 翻译 v4 功能开关：未配置或不为 true/1/yes 时默认关闭（运维级总开关）。 */
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
