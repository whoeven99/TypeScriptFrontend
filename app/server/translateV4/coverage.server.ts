/**
 * v4 页「语言覆盖率」与汇总统计 —— 默认模块 PRODUCT/COLLECTION/PAGE/ARTICLE，口径与 countModuleItems 一致。
 * 优先读 Redis 缓存（worker 或汇总页写入）；缺失时返回 null 覆盖率，由 API 触发现算。
 */
import { getTranslateV4RedisClient } from "./redis.server";
import { countModuleItems } from "./itemsCount.server";
import type { AdminGraphqlClient } from "./itemsCount.server";

export const COVERAGE_DEFAULT_MODULES = [
  "PRODUCT",
  "COLLECTION",
  "PAGE",
  "ARTICLE",
] as const;

export type LocaleCoverageRow = {
  locale: string;
  label: string;
  translated: number;
  total: number;
  percent: number | null;
  /** 缓存未命中时为 true */
  cacheMissing: boolean;
};

export type CoverageSummary = {
  languageCount: number;
  translatedItems: number;
  totalItems: number;
  overallPercent: number | null;
  locales: LocaleCoverageRow[];
};

const ITEMS_COUNT_TTL = 7 * 24 * 3600;

function itemsCountKey(shop: string, locale: string): string {
  return `tsf:items_count:${shop}:${locale}`;
}

async function readCachedModuleCount(
  shop: string,
  locale: string,
  module: string,
): Promise<{ total: number; translated: number } | null> {
  try {
    const raw = await getTranslateV4RedisClient().hget(
      itemsCountKey(shop, locale),
      module,
    );
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (typeof v?.total === "number" && typeof v?.translated === "number") {
      return { total: v.total, translated: v.translated };
    }
    return null;
  } catch {
    return null;
  }
}

async function writeCachedModuleCount(
  shop: string,
  locale: string,
  module: string,
  value: { total: number; translated: number },
): Promise<void> {
  try {
    const redis = getTranslateV4RedisClient();
    const key = itemsCountKey(shop, locale);
    await redis.hset(
      key,
      module,
      JSON.stringify({ ...value, updatedAt: new Date().toISOString() }),
    );
    await redis.expire(key, ITEMS_COUNT_TTL);
  } catch {
    // best-effort
  }
}

function ratioPercent(translated: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.min(100, Math.round((translated / total) * 100));
}

type LocaleInput = { value: string; label: string };

/** 仅从 Redis 读缓存，适合 loader 快速路径。 */
export async function getCoverageSummaryFromCache({
  shop,
  targetLocales,
}: {
  shop: string;
  targetLocales: LocaleInput[];
}): Promise<CoverageSummary> {
  const locales: LocaleCoverageRow[] = [];
  let translatedItems = 0;
  let totalItems = 0;

  for (const loc of targetLocales) {
    let translated = 0;
    let total = 0;
    let cacheMissing = false;

    for (const module of COVERAGE_DEFAULT_MODULES) {
      const cached = await readCachedModuleCount(shop, loc.value, module);
      if (!cached) {
        cacheMissing = true;
        continue;
      }
      translated += cached.translated;
      total += cached.total;
    }

    locales.push({
      locale: loc.value,
      label: loc.label,
      translated,
      total,
      percent: ratioPercent(translated, total),
      cacheMissing,
    });
    translatedItems += translated;
    totalItems += total;
  }

  return {
    languageCount: targetLocales.length,
    translatedItems,
    totalItems,
    overallPercent: ratioPercent(translatedItems, totalItems),
    locales,
  };
}

/** 现算 Shopify 并回写缓存（API 或需要完整数据时调用）。 */
export async function computeCoverageSummary({
  admin,
  shop,
  targetLocales,
}: {
  admin: AdminGraphqlClient;
  shop: string;
  targetLocales: LocaleInput[];
}): Promise<CoverageSummary> {
  const locales: LocaleCoverageRow[] = [];
  let translatedItems = 0;
  let totalItems = 0;

  for (const loc of targetLocales) {
    let translated = 0;
    let total = 0;

    for (const module of COVERAGE_DEFAULT_MODULES) {
      let cached = await readCachedModuleCount(shop, loc.value, module);
      if (!cached) {
        cached = await countModuleItems({ admin, module, target: loc.value });
        await writeCachedModuleCount(shop, loc.value, module, cached);
      }
      translated += cached.translated;
      total += cached.total;
    }

    locales.push({
      locale: loc.value,
      label: loc.label,
      translated,
      total,
      percent: ratioPercent(translated, total),
      cacheMissing: false,
    });
    translatedItems += translated;
    totalItems += total;
  }

  return {
    languageCount: targetLocales.length,
    translatedItems,
    totalItems,
    overallPercent: ratioPercent(translatedItems, totalItems),
    locales,
  };
}
