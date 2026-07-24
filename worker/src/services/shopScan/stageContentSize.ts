import { AUTO_TRANSLATE_V4_MODULES } from "../moduleCatalog.js";
import { runBulkScanCounts } from "./bulkScanCounts.js";
import { recordShopSizeFromContentSize } from "./shopSizeProfile.js";
import { upsertShopProfileLatestScan } from "./shopProfileArtifact.js";

/** 阶段1：扫描默认语言的可翻译内容量（items / chars / 分模块），评估店铺规模。 */

export type ContentSizeResult = {
  totalItems: number;
  totalChars: number;
  moduleStats: Record<string, { items: number; chars: number }>;
};

export async function runContentSizeStage(args: {
  shop: string;
  accessToken: string;
  primaryLocale: string;
  scanId?: string;
  trigger?: string;
  /** @deprecated 稳定产物写 shop-profile/{shop}/latest-scan.json，不再使用 per-scan 前缀。 */
  blobPrefix?: string;
  heartbeat: () => Promise<void>;
  isShutdown?: () => boolean;
}): Promise<ContentSizeResult> {
  const {
    shop,
    accessToken,
    primaryLocale,
    scanId,
    trigger,
    heartbeat,
    isShutdown,
  } = args;
  const moduleStats: Record<string, { items: number; chars: number }> = {};
  let totalItems = 0;
  let totalChars = 0;

  const jobs = AUTO_TRANSLATE_V4_MODULES.map((module) => ({
    id: `${module}::${primaryLocale}`,
    module,
    locale: primaryLocale,
  }));

  await runBulkScanCounts({
    shop,
    accessToken,
    jobs,
    onHeartbeat: heartbeat,
    isShutdown,
    onResult: async ({ job, count, usedFallback }) => {
      // 源语言内容量：translated 无意义，只取 total/chars
      moduleStats[job.module] = { items: count.total, chars: count.chars };
      totalItems += count.total;
      totalChars += count.chars;
      console.log(
        `[shopScan:contentSize] module=${job.module} items=${count.total} chars=${count.chars}${
          usedFallback ? " fallback=page" : " fetch=bulk"
        }`,
      );
      await heartbeat();
    },
  });

  const scannedAt = new Date().toISOString();
  await upsertShopProfileLatestScan(shop, {
    scanId,
    trigger,
    contentSize: {
      stage: "contentSize",
      shop,
      primaryLocale,
      totalItems,
      totalChars,
      moduleStats,
      scannedAt,
    },
  });

  // Admin 翻译列表「超大/大/中等/小商店」标签：写 Cosmos shop_profile（type=size）。
  // best-effort；失败不阻断 scan。翻译 INIT 不再维护该文档。
  await recordShopSizeFromContentSize({
    shopName: shop,
    primaryLocale,
    totalItems,
    totalChars,
  });

  return { totalItems, totalChars, moduleStats };
}
