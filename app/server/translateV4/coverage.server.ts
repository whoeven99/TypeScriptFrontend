/**
 * v4 页「语言覆盖率」与左上汇总 —— 口径与管理翻译汇总页各卡片累加一致
 * （COVERAGE_COUNT_LABELS，不含 Policies / handle）。
 * 优先读 Redis 缓存；缺失时由 API 触发现算。
 */
import {
  COVERAGE_COUNT_LABELS,
  refreshItemsCountForLocales,
  sumItemsCountByLabels,
  sumItemsCountByLabelsFromCache,
} from "./itemsCount.server";
import type { AdminGraphqlClient } from "./itemsCount.server";
import { sameTranslationLocale } from "./locale";
import { listTargetLocales } from "./targetLocale.server";
import {
  resolveNextAutoUpdateAt,
  formatNextAutoUpdateHint,
} from "./autoScanSchedule.server";

export type LocaleCoverageRow = {
  locale: string;
  label: string;
  translated: number;
  total: number;
  percent: number | null;
  /** 缓存未命中时为 true */
  cacheMissing: boolean;
  /** 与语言页自动翻译开关同源：ShopTargetLocale.autoTranslate */
  autoTranslate: boolean;
  /** 下一轮 Worker 自动扫描时刻（ISO） */
  nextAutoUpdateAt: string | null;
  /** 覆盖率行：「下次更新时间 HH:mm」 */
  nextAutoUpdateHint: string | null;
};

export type CoverageSummary = {
  languageCount: number;
  translatedItems: number;
  totalItems: number;
  overallPercent: number | null;
  locales: LocaleCoverageRow[];
};

function ratioPercent(translated: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.min(100, Math.round((translated / total) * 100));
}

type LocaleInput = { value: string; label: string };

/** 合并语言页「按语言自动翻译」开关（Prisma ShopTargetLocale）。 */
async function enrichCoverageWithAutoTranslate(
  shop: string,
  summary: CoverageSummary,
): Promise<CoverageSummary> {
  const targetRows = await listTargetLocales(shop);
  const locales = await Promise.all(
    summary.locales.map(async (row) => {
      const match = targetRows.find((t) => sameTranslationLocale(t.locale, row.locale));
      const autoTranslate = match?.autoTranslate ?? false;
      const nextAutoUpdateAt = await resolveNextAutoUpdateAt(autoTranslate);
      const nextAutoUpdateHint = autoTranslate
        ? formatNextAutoUpdateHint(nextAutoUpdateAt)
        : null;
      return {
        ...row,
        autoTranslate,
        nextAutoUpdateAt,
        nextAutoUpdateHint,
      };
    }),
  );
  return { ...summary, locales };
}

/** 仅从 Redis 读缓存，适合 loader 快速路径。 */
export async function getCoverageSummaryFromCache({
  shop,
  primaryLocale,
  targetLocales,
}: {
  shop: string;
  primaryLocale: string;
  targetLocales: LocaleInput[];
}): Promise<CoverageSummary> {
  const locales: LocaleCoverageRow[] = [];
  let translatedItems = 0;
  let totalItems = 0;

  for (const loc of targetLocales) {
    const agg = await sumItemsCountByLabelsFromCache(shop, loc.value, COVERAGE_COUNT_LABELS);

    locales.push({
      locale: loc.value,
      label: loc.label,
      translated: agg.translated,
      total: agg.total,
      percent: ratioPercent(agg.translated, agg.total),
      cacheMissing: agg.cacheMissing,
      autoTranslate: false,
      nextAutoUpdateAt: null,
      nextAutoUpdateHint: null,
    });
    translatedItems += agg.translated;
    totalItems += agg.total;
  }

  return enrichCoverageWithAutoTranslate(shop, {
    languageCount: targetLocales.length,
    translatedItems,
    totalItems,
    overallPercent: ratioPercent(translatedItems, totalItems),
    locales,
  });
}

/** 现算 Shopify 并回写缓存（API 或需要完整数据时调用）。 */
export async function computeCoverageSummary({
  admin,
  shop,
  primaryLocale,
  targetLocales,
  forceRefresh = false,
}: {
  admin: AdminGraphqlClient;
  shop: string;
  primaryLocale: string;
  targetLocales: LocaleInput[];
  /** true：与管理翻译「刷新统计」同效 —— invalidate 后强制现算并写 Redis */
  forceRefresh?: boolean;
}): Promise<CoverageSummary> {
  if (forceRefresh && targetLocales.length > 0) {
    await refreshItemsCountForLocales({
      admin,
      shop,
      locales: targetLocales.map((l) => l.value),
      labels: COVERAGE_COUNT_LABELS,
    });
  }

  const locales: LocaleCoverageRow[] = [];
  let translatedItems = 0;
  let totalItems = 0;

  for (const loc of targetLocales) {
    let translated: number;
    let total: number;
    let cacheMissing = false;

    if (forceRefresh) {
      const cached = await sumItemsCountByLabelsFromCache(
        shop,
        loc.value,
        COVERAGE_COUNT_LABELS,
      );
      translated = cached.translated;
      total = cached.total;
      cacheMissing = cached.cacheMissing;
    } else {
      const computed = await sumItemsCountByLabels({
        admin,
        shop,
        target: loc.value,
        labels: COVERAGE_COUNT_LABELS,
      });
      translated = computed.translated;
      total = computed.total;
    }

    locales.push({
      locale: loc.value,
      label: loc.label,
      translated,
      total,
      percent: ratioPercent(translated, total),
      cacheMissing,
      autoTranslate: false,
      nextAutoUpdateAt: null,
      nextAutoUpdateHint: null,
    });
    translatedItems += translated;
    totalItems += total;
  }

  return enrichCoverageWithAutoTranslate(shop, {
    languageCount: targetLocales.length,
    translatedItems,
    totalItems,
    overallPercent: ratioPercent(translatedItems, totalItems),
    locales,
  });
}
