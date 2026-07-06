import { blobWrite } from "../blobV4.js";
import { AUTO_TRANSLATE_V4_MODULES } from "../moduleCatalog.js";
import { setItemsCount } from "../redisV4.js";
import { countModuleScan } from "./scanCounts.js";
import { upsertTargetLocales } from "./tsfWrite.js";
import type { ShopLocaleRow } from "./shopContext.js";

/**
 * 阶段3：把已发布的非主语言同步到 ShopTargetLocale，并逐语言统计翻译覆盖率。
 * 逐模块回填 Redis items_count 缓存（v4 首页覆盖率直接受益），逐语言明细写 Blob。
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

export async function runCoverageStage(args: {
  shop: string;
  accessToken: string;
  primaryLocale: string;
  locales: ShopLocaleRow[];
  blobPrefix: string;
  heartbeat: () => Promise<void>;
}): Promise<CoverageStageResult> {
  const { shop, accessToken, primaryLocale, locales, blobPrefix, heartbeat } = args;

  const publishedTargets = locales.filter(
    (l) =>
      l.published &&
      !l.primary &&
      l.locale.trim() &&
      l.locale.trim().toLowerCase() !== primaryLocale.trim().toLowerCase(),
  );

  if (publishedTargets.length === 0) {
    return { status: "skipped", reason: "no_published_targets", coverage: [], syncedLocales: 0 };
  }

  // 1. 同步已发布语言到 ShopTargetLocale（只增不删，默认 autoTranslate=0）
  const syncedLocales = await upsertTargetLocales(
    shop,
    publishedTargets.map((l) => l.locale),
  );
  await heartbeat();

  // 2. 逐语言统计覆盖率 + 回填 Redis + 明细写 Blob
  const coverage: CoverageRow[] = [];
  for (const target of publishedTargets) {
    const perModule: Record<string, { total: number; translated: number }> = {};
    let translated = 0;
    let total = 0;

    for (const module of COVERAGE_MODULES) {
      const c = await countModuleScan(shop, accessToken, module, target.locale, heartbeat);
      perModule[module] = { total: c.total, translated: c.translated };
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

    await blobWrite(`${blobPrefix}/coverage/${target.locale}.json`, {
      stage: "coverage",
      shop,
      locale: target.locale,
      translated,
      total,
      percent,
      perModule,
      scannedAt: new Date().toISOString(),
    });
  }

  return { status: "done", coverage, syncedLocales };
}
