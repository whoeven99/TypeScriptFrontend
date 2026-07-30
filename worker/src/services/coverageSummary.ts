/**
 * 语言级覆盖率汇总口径（与 App COVERAGE_COUNT_LABELS / LOCAL_COUNT_SPEC 对齐，不含 Policies）。
 * Turso ShopTargetLocale.coverage* 与语言页总览共用此 module 集合。
 */
export const COVERAGE_SUMMARY_MODULES = [
  "PRODUCT",
  "COLLECTION",
  "PAGE",
  "ARTICLE",
  "BLOG",
  "FILTER",
  "METAOBJECT",
  "METAFIELD",
  "DELIVERY_METHOD_DEFINITION",
  "SHOP",
  "MENU",
  "LINK",
  "EMAIL_TEMPLATE",
  "PACKING_SLIP_TEMPLATE",
  "ONLINE_STORE_THEME_JSON_TEMPLATE",
  "ONLINE_STORE_THEME_SECTION_GROUP",
  "ONLINE_STORE_THEME_SETTINGS_CATEGORY",
  "ONLINE_STORE_THEME_SETTINGS_DATA_SECTIONS",
  "ONLINE_STORE_THEME_LOCALE_CONTENT",
] as const;

export type ModuleCount = { translated: number; total: number };

/** 按 COVERAGE_SUMMARY_MODULES 从 module → count 映射加总。 */
export function sumCoverageSummaryModules(
  moduleCounts: ReadonlyMap<string, ModuleCount>,
): ModuleCount {
  let translated = 0;
  let total = 0;
  for (const module of COVERAGE_SUMMARY_MODULES) {
    const c = moduleCounts.get(module);
    if (!c) continue;
    translated += c.translated;
    total += c.total;
  }
  return { translated, total };
}

/** 0–100 整数；total<=0 为 null（与 App coveragePercentOf 一致）。 */
export function coveragePercentOf(
  translated: number,
  total: number,
): number | null {
  if (total <= 0) return null;
  return Math.min(100, Math.round((translated / total) * 100));
}
