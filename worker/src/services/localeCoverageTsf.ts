/**
 * 语言级覆盖率汇总 → Turso ShopTargetLocale（worker 侧 libsql）。
 */
import { coveragePercentOf } from "./coverageSummary.js";
import { tsfExecute } from "./tsfDb.js";

export type LocaleCoverageSource = "finalize" | "refresh" | "shop_scan";

/**
 * Upsert 语言级覆盖率。无行时创建（autoTranslate=0）；已有行不改自动翻译开关。
 */
export async function upsertLocaleCoverage(input: {
  shop: string;
  locale: string;
  translated: number;
  total: number;
  source: LocaleCoverageSource;
}): Promise<void> {
  const shop = input.shop.trim();
  const locale = input.locale.trim();
  if (!shop || !locale) return;

  const translated = Math.max(0, Math.floor(input.translated));
  const total = Math.max(0, Math.floor(input.total));
  const percent = coveragePercentOf(translated, total);

  await tsfExecute({
    sql: `
      INSERT INTO ShopTargetLocale (
        shop, locale, autoTranslate,
        coverageTranslated, coverageTotal, coveragePercent, coverageUpdatedAt, coverageSource,
        createdAt, updatedAt
      ) VALUES (?, ?, 0, ?, ?, ?, datetime('now'), ?, datetime('now'), datetime('now'))
      ON CONFLICT(shop, locale) DO UPDATE SET
        coverageTranslated = excluded.coverageTranslated,
        coverageTotal = excluded.coverageTotal,
        coveragePercent = excluded.coveragePercent,
        coverageUpdatedAt = excluded.coverageUpdatedAt,
        coverageSource = excluded.coverageSource,
        updatedAt = datetime('now')
    `,
    args: [shop, locale, translated, total, percent, input.source],
  });
}
