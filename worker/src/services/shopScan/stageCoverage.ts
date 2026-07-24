import { AUTO_TRANSLATE_V4_MODULES } from "../moduleCatalog.js";
import { setItemsCount } from "../redisV4.js";
import { countModuleScan } from "./scanCounts.js";
import { upsertTargetLocales } from "./tsfWrite.js";
import { upsertShopProfileLatestScan } from "./shopProfileArtifact.js";
import type { ShopLocaleRow } from "./shopContext.js";

/**
 * 阶段3：把非主语言同步到 ShopTargetLocale，并逐语言统计翻译覆盖率。
 * 语言集合与 v4「刷新统计」一致：店铺内所有非主语言（含未发布）。
 * 逐模块回填 Redis items_count 缓存（v4 首页覆盖率直接受益）；
 * Blob 只在 latest-scan.json 留轻量 locale 汇总（无 perModule）。
 *
 * 覆盖率统计的模块 = 管理翻译汇总页全部卡片对应的 module，因此回填的缓存可被
 * 管理翻译页 getItemsCountByLabel 直接命中（预热），各卡片「已翻译/总数」秒出。
 * 相比自动翻译模块（AUTO_TRANSLATE_V4_MODULES）额外补齐两个仅手动翻译的 module：
 *   - EMAIL_TEMPLATE（管理翻译「电子邮件通知」卡片）
 *   - ONLINE_STORE_THEME_LOCALE_CONTENT（主题语言内容，Theme 卡片累加项之一）
 */
const COVERAGE_MODULES: readonly string[] = [
  ...AUTO_TRANSLATE_V4_MODULES,
  "EMAIL_TEMPLATE",
  "ONLINE_STORE_THEME_LOCALE_CONTENT",
];

export type CoverageRow = {
  locale: string;
  published: boolean;
  translated: number;
  total: number;
  percent: number | null;
};

export type CoverageStageResult = {
  status: "done" | "skipped";
  reason?: string;
  coverage: CoverageRow[];
  syncedLocales: number;
};

/** 与 App `selectShopTargetLocales` 同口径：所有非主语言（含未发布）。 */
function selectCoverageTargetLocales(
  locales: ShopLocaleRow[],
  primaryLocale: string,
): ShopLocaleRow[] {
  const source = primaryLocale.trim().toLowerCase();
  return locales.filter(
    (l) =>
      !l.primary &&
      Boolean(l.locale.trim()) &&
      l.locale.trim().toLowerCase() !== source,
  );
}

export async function runCoverageStage(args: {
  shop: string;
  accessToken: string;
  primaryLocale: string;
  locales: ShopLocaleRow[];
  scanId?: string;
  trigger?: string;
  /** @deprecated 稳定产物写 shop-profile/{shop}/latest-scan.json。 */
  blobPrefix?: string;
  heartbeat: () => Promise<void>;
}): Promise<CoverageStageResult> {
  const { shop, accessToken, primaryLocale, locales, scanId, trigger, heartbeat } = args;

  const targetLocales = selectCoverageTargetLocales(locales, primaryLocale);

  if (targetLocales.length === 0) {
    return { status: "skipped", reason: "no_target_locales", coverage: [], syncedLocales: 0 };
  }

  // 1. 同步目标语言到 ShopTargetLocale（只增不删，默认 autoTranslate=0）
  const syncedLocales = await upsertTargetLocales(
    shop,
    targetLocales.map((l) => l.locale),
  );
  await heartbeat();

  // 2. 逐语言统计覆盖率 + 回填 Redis；Blob 只写轻量汇总
  const coverage: CoverageRow[] = [];
  for (const target of targetLocales) {
    let translated = 0;
    let total = 0;

    for (const module of COVERAGE_MODULES) {
      const c = await countModuleScan(shop, accessToken, module, target.locale, heartbeat);
      total += c.total;
      translated += c.translated;
      // 回填 Redis items_count 缓存（与 v4 首页/汇总页同 key）
      await setItemsCount(shop, target.locale, module, {
        total: c.total,
        translated: c.translated,
      });
      await heartbeat();
    }

    const percent = total > 0 ? Math.round((translated / total) * 1000) / 10 : null;
    coverage.push({
      locale: target.locale,
      published: target.published,
      translated,
      total,
      percent,
    });
  }

  await upsertShopProfileLatestScan(shop, {
    scanId,
    trigger,
    coverage: coverage.map((row) => ({
      locale: row.locale,
      published: row.published,
      translated: row.translated,
      total: row.total,
      percent: row.percent,
    })),
  });

  return { status: "done", coverage, syncedLocales };
}
