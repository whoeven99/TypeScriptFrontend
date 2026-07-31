/**
 * 语言级覆盖率汇总 → Turso ShopTargetLocale（与 autoTranslate 同表）。
 * 权威源：语言页 / Spark 总览读此；Redis items_count 仅作 module 明细加速。
 */
import prisma from "~/db.server";

export type LocaleCoverageSource = "finalize" | "refresh" | "shop_scan";

export type LocaleCoverageInput = {
  shop: string;
  locale: string;
  translated: number;
  total: number;
  source: LocaleCoverageSource;
};

/** 与 coverage.server ratioPercent 一致：0–100 整数；total<=0 为 null。 */
export function coveragePercentOf(
  translated: number,
  total: number,
): number | null {
  if (total <= 0) return null;
  return Math.min(100, Math.round((translated / total) * 100));
}

/**
 * Upsert 语言级覆盖率。无行时创建（autoTranslate=false）。
 * 不改动已有 autoTranslate。
 */
export async function upsertLocaleCoverage(
  input: LocaleCoverageInput,
): Promise<void> {
  const shop = input.shop.trim();
  const locale = input.locale.trim();
  if (!shop || !locale) return;

  const translated = Math.max(0, Math.floor(input.translated));
  const total = Math.max(0, Math.floor(input.total));
  const coveragePercent = coveragePercentOf(translated, total);
  const coverageUpdatedAt = new Date();

  await prisma.shopTargetLocale.upsert({
    where: { shop_locale: { shop, locale } },
    create: {
      shop,
      locale,
      autoTranslate: false,
      coverageTranslated: translated,
      coverageTotal: total,
      coveragePercent,
      coverageUpdatedAt,
      coverageSource: input.source,
    },
    update: {
      coverageTranslated: translated,
      coverageTotal: total,
      coveragePercent,
      coverageUpdatedAt,
      coverageSource: input.source,
    },
  });
}
