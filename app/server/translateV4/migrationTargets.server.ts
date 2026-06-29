import { sameTranslationLocale } from "./locale";

export type ShopifyLocaleRow = {
  locale: string;
  primary?: boolean;
};

export type JavaTranslateRow = {
  target?: string | null;
  autoTranslate?: boolean | null;
};

/** 归一化 locale 比较键（en / en-US 等由 sameTranslationLocale 处理写入时对齐）。 */
export function migrationLocaleKey(locale: string): string {
  return locale.trim().replace(/_/g, "-").toLowerCase();
}

/**
 * 迁移目标语言 = Shopify 全部非主语言 ∪ Java Translates 里出现过的 target。
 * 含未 publish 的语言（长尾店常见：Java 已加语言但 Shopify 尚未发布到店面）。
 */
export function mergeMigrationTargetLocales(
  primaryLocale: string,
  shopifyLocales: ShopifyLocaleRow[],
  javaRows: JavaTranslateRow[],
): string[] {
  const byKey = new Map<string, string>();

  for (const row of shopifyLocales) {
    const locale = row.locale?.trim();
    if (!locale || row.primary) continue;
    if (sameTranslationLocale(locale, primaryLocale)) continue;
    byKey.set(migrationLocaleKey(locale), locale);
  }

  for (const row of javaRows) {
    const target = row.target?.trim();
    if (!target) continue;
    if (sameTranslationLocale(target, primaryLocale)) continue;
    const key = migrationLocaleKey(target);
    if (!byKey.has(key)) byKey.set(key, target);
  }

  return [...byKey.values()].sort((a, b) => a.localeCompare(b));
}

export function javaAutoTranslateByTarget(javaRows: JavaTranslateRow[]): Map<string, boolean> {
  const map = new Map<string, boolean>();
  for (const row of javaRows) {
    const target = row.target?.trim();
    if (!target) continue;
    map.set(target, Boolean(row.autoTranslate));
  }
  return map;
}

export function autoTranslateForTarget(
  target: string,
  autoByTarget: Map<string, boolean>,
): boolean {
  for (const [locale, enabled] of autoByTarget) {
    if (sameTranslationLocale(locale, target)) return enabled;
  }
  return false;
}
