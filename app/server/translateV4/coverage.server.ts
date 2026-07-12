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
import { listV4Jobs } from "./cosmos.server";
import { sameTranslationLocale } from "./locale";
import { listTargetLocales } from "./targetLocale.server";
import { ACTIVE_V4_STATUSES } from "./types";
import {
  readAutoScanLastAt,
  resolveNextAutoUpdateAt,
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
  /** 当前语言是否有活跃中的 v4 任务 */
  isTranslating: boolean;
  /** Worker 最近一次自动扫描时刻（ISO，全店共用） */
  lastAutoUpdateAt: string | null;
  /** 下一轮 Worker 自动扫描时刻（ISO，由前端按本地时区/相对时间展示） */
  nextAutoUpdateAt: string | null;
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

/** 合并语言页运行态信号：自动翻译开关 + 活跃任务标记。 */
async function enrichCoverageWithRuntimeSignals(
  shop: string,
  summary: CoverageSummary,
): Promise<CoverageSummary> {
  try {
    const [targetRows, jobs, lastAutoUpdateAt] = await Promise.all([
      listTargetLocales(shop),
      listV4Jobs(shop, 100),
      readAutoScanLastAt(),
    ]);
    const activeJobs = jobs.filter((job) => ACTIVE_V4_STATUSES.includes(job.status));
    const locales = await Promise.all(
      summary.locales.map(async (row) => {
        const match = targetRows.find((t) => sameTranslationLocale(t.locale, row.locale));
        const autoTranslate = match?.autoTranslate ?? false;
        const isTranslating = activeJobs.some((job) =>
          sameTranslationLocale(job.target, row.locale),
        );
        const nextAutoUpdateAt = await resolveNextAutoUpdateAt(autoTranslate);
        return {
          ...row,
          autoTranslate,
          isTranslating,
          lastAutoUpdateAt: autoTranslate ? lastAutoUpdateAt : null,
          nextAutoUpdateAt,
        };
      }),
    );
    return { ...summary, locales };
  } catch (err) {
    console.error("[translateV4] enrichCoverageWithRuntimeSignals failed:", err);
    return summary;
  }
}

/** 语言页等轻量场景：只补 autoTranslate / isTranslating，跳过 auto-scan 时刻计算。 */
async function enrichCoverageWithMinimalRuntimeSignals(
  shop: string,
  summary: CoverageSummary,
): Promise<CoverageSummary> {
  try {
    const [targetRows, jobs] = await Promise.all([
      listTargetLocales(shop),
      listV4Jobs(shop, 30),
    ]);
    const activeJobs = jobs.filter((job) => ACTIVE_V4_STATUSES.includes(job.status));
    const locales = summary.locales.map((row) => {
      const match = targetRows.find((t) => sameTranslationLocale(t.locale, row.locale));
      return {
        ...row,
        autoTranslate: match?.autoTranslate ?? false,
        isTranslating: activeJobs.some((job) =>
          sameTranslationLocale(job.target, row.locale),
        ),
        lastAutoUpdateAt: null,
        nextAutoUpdateAt: null,
      };
    });
    return { ...summary, locales };
  } catch (err) {
    console.error("[translateV4] enrichCoverageWithMinimalRuntimeSignals failed:", err);
    return summary;
  }
}

/** 仅从 Redis 读缓存，适合 loader 快速路径。 */
export async function getCoverageSummaryFromCache({
  shop,
  primaryLocale,
  targetLocales,
  includeRuntimeSignals = true,
}: {
  shop: string;
  primaryLocale: string;
  targetLocales: LocaleInput[];
  /** true=完整信号；false=跳过；'minimal'=仅 autoTranslate/isTranslating */
  includeRuntimeSignals?: boolean | "minimal";
}): Promise<CoverageSummary> {
  const rows = await Promise.all(
    targetLocales.map(async (loc) => {
      const agg = await sumItemsCountByLabelsFromCache(
        shop,
        loc.value,
        COVERAGE_COUNT_LABELS,
      );
      return {
        locale: loc.value,
        label: loc.label,
        translated: agg.translated,
        total: agg.total,
        percent: ratioPercent(agg.translated, agg.total),
        cacheMissing: agg.cacheMissing,
        autoTranslate: false,
        isTranslating: false,
        lastAutoUpdateAt: null,
        nextAutoUpdateAt: null,
      } satisfies LocaleCoverageRow;
    }),
  );

  const translatedItems = rows.reduce((sum, row) => sum + row.translated, 0);
  const totalItems = rows.reduce((sum, row) => sum + row.total, 0);

  const summary: CoverageSummary = {
    languageCount: targetLocales.length,
    translatedItems,
    totalItems,
    overallPercent: ratioPercent(translatedItems, totalItems),
    locales: rows,
  };

  if (includeRuntimeSignals === false) {
    return summary;
  }

  if (includeRuntimeSignals === "minimal") {
    return enrichCoverageWithMinimalRuntimeSignals(shop, summary);
  }

  return enrichCoverageWithRuntimeSignals(shop, summary);
}

/** 现算 Shopify 并回写缓存（API 或需要完整数据时调用）。 */
export async function computeCoverageSummary({
  admin,
  shop,
  primaryLocale,
  targetLocales,
  forceRefresh = false,
  localesToRefresh,
}: {
  admin: AdminGraphqlClient;
  shop: string;
  primaryLocale: string;
  targetLocales: LocaleInput[];
  /** true：与管理翻译「刷新统计」同效 —— 现算并写 Redis（不 invalidate，避免翻译进行中清空缓存） */
  forceRefresh?: boolean;
  /** 指定要刷新的语言；省略时 forceRefresh 仅刷新 cacheMissing 的语言 */
  localesToRefresh?: string[];
}): Promise<CoverageSummary> {
  if (forceRefresh && targetLocales.length > 0) {
    let refreshLocales: string[];
    if (localesToRefresh?.length) {
      refreshLocales = localesToRefresh;
    } else {
      const missing: string[] = [];
      for (const loc of targetLocales) {
        const agg = await sumItemsCountByLabelsFromCache(
          shop,
          loc.value,
          COVERAGE_COUNT_LABELS,
        );
        if (agg.cacheMissing) missing.push(loc.value);
      }
      refreshLocales = missing.length > 0 ? missing : targetLocales.map((l) => l.value);
    }
    await refreshItemsCountForLocales({
      admin,
      shop,
      locales: refreshLocales,
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

    try {
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
    } catch (err) {
      console.error(
        `[translateV4] coverage locale failed shop=${shop} locale=${loc.value}:`,
        err,
      );
      const cached = await sumItemsCountByLabelsFromCache(
        shop,
        loc.value,
        COVERAGE_COUNT_LABELS,
      );
      translated = cached.translated;
      total = cached.total;
      cacheMissing = cached.cacheMissing || cached.total === 0;
    }

    locales.push({
      locale: loc.value,
      label: loc.label,
      translated,
      total,
      percent: ratioPercent(translated, total),
      cacheMissing,
      autoTranslate: false,
      isTranslating: false,
      lastAutoUpdateAt: null,
      nextAutoUpdateAt: null,
    });
    translatedItems += translated;
    totalItems += total;
  }

  return enrichCoverageWithRuntimeSignals(shop, {
    languageCount: targetLocales.length,
    translatedItems,
    totalItems,
    overallPercent: ratioPercent(translatedItems, totalItems),
    locales,
  });
}
