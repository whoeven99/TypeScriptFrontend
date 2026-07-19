/**
 * v4 页「语言覆盖率」与左上汇总 —— 口径与管理翻译汇总页各卡片累加一致
 * （COVERAGE_COUNT_LABELS，不含 Policies / handle）。
 * 优先读 Redis 缓存；缺失时由 API 触发现算。
 *
 * 就绪带双口径：
 * - product*：仅 Products 卡片（商品起步包）
 * - storePercent：全模块完整缓存时的语言覆盖率；cacheMissing 时为 null（不展示假 100%）
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

/** 就绪带「商品覆盖率」：与管理翻译 Products 卡片一致。 */
const PRODUCT_COVERAGE_LABELS = ["Products"] as const;

export type LocaleCoverageRow = {
  locale: string;
  label: string;
  /** Shopify 店铺语言是否已发布到店面。 */
  published: boolean;
  translated: number;
  total: number;
  /**
   * 已扫描模块累加百分比（缓存缺 module 时分母偏小，可能虚高）。
   * CoverageCard 沿用；就绪带请用 storePercent / productPercent。
   */
  percent: number | null;
  /** 全模块缓存未齐时为 true */
  cacheMissing: boolean;
  /** 仅 Products；起步包完成后的诚实商品口径 */
  productTranslated: number;
  productTotal: number;
  productPercent: number | null;
  /** Products 缓存未命中 */
  productCacheMissing: boolean;
  /**
   * 全模块语言覆盖率：仅当 !cacheMissing 时有值。
   * 缓存不齐时为 null，避免把「仅商品 100%」当成全店 100%。
   */
  storePercent: number | null;
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

type LocaleInput = { value: string; label: string; published?: boolean };

type CountAgg = { translated: number; total: number; cacheMissing: boolean };

function buildLocaleCoverageCounts(
  locale: string,
  label: string,
  storeAgg: CountAgg,
  productAgg: CountAgg,
): Pick<
  LocaleCoverageRow,
  | "locale"
  | "label"
  | "translated"
  | "total"
  | "percent"
  | "cacheMissing"
  | "productTranslated"
  | "productTotal"
  | "productPercent"
  | "productCacheMissing"
  | "storePercent"
> {
  return {
    locale,
    label,
    translated: storeAgg.translated,
    total: storeAgg.total,
    percent: ratioPercent(storeAgg.translated, storeAgg.total),
    cacheMissing: storeAgg.cacheMissing,
    productTranslated: productAgg.translated,
    productTotal: productAgg.total,
    productPercent: ratioPercent(productAgg.translated, productAgg.total),
    productCacheMissing: productAgg.cacheMissing,
    storePercent: storeAgg.cacheMissing
      ? null
      : ratioPercent(storeAgg.translated, storeAgg.total),
  };
}

async function loadLocaleCoverageCountsFromCache(
  shop: string,
  locale: string,
  label: string,
): Promise<ReturnType<typeof buildLocaleCoverageCounts>> {
  const [storeAgg, productAgg] = await Promise.all([
    sumItemsCountByLabelsFromCache(shop, locale, COVERAGE_COUNT_LABELS),
    sumItemsCountByLabelsFromCache(shop, locale, PRODUCT_COVERAGE_LABELS),
  ]);
  return buildLocaleCoverageCounts(locale, label, storeAgg, productAgg);
}

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
  targetLocales,
  includeRuntimeSignals = true,
}: {
  shop: string;
  targetLocales: LocaleInput[];
  /** true=完整信号；false=跳过；'minimal'=仅 autoTranslate/isTranslating */
  includeRuntimeSignals?: boolean | "minimal";
}): Promise<CoverageSummary> {
  const rows = await Promise.all(
    targetLocales.map(async (loc) => {
      const counts = await loadLocaleCoverageCountsFromCache(
        shop,
        loc.value,
        loc.label,
      );
      return {
        ...counts,
        published: Boolean(loc.published),
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
  targetLocales,
  forceRefresh = false,
  localesToRefresh,
}: {
  admin: AdminGraphqlClient;
  shop: string;
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
    let counts: ReturnType<typeof buildLocaleCoverageCounts>;

    try {
      if (forceRefresh) {
        counts = await loadLocaleCoverageCountsFromCache(
          shop,
          loc.value,
          loc.label,
        );
      } else {
        const [storeComputed, productComputed] = await Promise.all([
          sumItemsCountByLabels({
            admin,
            shop,
            target: loc.value,
            labels: COVERAGE_COUNT_LABELS,
          }),
          sumItemsCountByLabels({
            admin,
            shop,
            target: loc.value,
            labels: PRODUCT_COVERAGE_LABELS,
          }),
        ]);
        counts = buildLocaleCoverageCounts(
          loc.value,
          loc.label,
          { ...storeComputed, cacheMissing: false },
          { ...productComputed, cacheMissing: false },
        );
      }
    } catch (err) {
      console.error(
        `[translateV4] coverage locale failed shop=${shop} locale=${loc.value}:`,
        err,
      );
      counts = await loadLocaleCoverageCountsFromCache(
        shop,
        loc.value,
        loc.label,
      );
      if (counts.total === 0) {
        counts = {
          ...counts,
          cacheMissing: true,
          storePercent: null,
        };
      }
    }

    locales.push({
      ...counts,
      published: Boolean(loc.published),
      autoTranslate: false,
      isTranslating: false,
      lastAutoUpdateAt: null,
      nextAutoUpdateAt: null,
    });
    translatedItems += counts.translated;
    totalItems += counts.total;
  }

  return enrichCoverageWithRuntimeSignals(shop, {
    languageCount: targetLocales.length,
    translatedItems,
    totalItems,
    overallPercent: ratioPercent(translatedItems, totalItems),
    locales,
  });
}
