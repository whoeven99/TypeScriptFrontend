/**
 * Shop scan metrics via Shopify Bulk Operations JSONL (full rollout, no allowlist).
 *
 * contentSize / coverage 全量走 bulk；失败时回退 `countModuleScan` 分页。
 * 下载/解析默认串行并带 JSONL yield（见 scanPace.ts），优先削平 CPU 尖刺。
 */
import { MODULE_TO_SHOPIFY_TYPE } from "../shopifyFetch.js";
import {
  runShopifyBulkJobQueue,
  streamBulkJsonlResources,
  type ShopifyBulkJob,
} from "../shopifyBulkShared.js";
import {
  accumulateScanCountNode,
  countModuleScan,
  emptyModuleScanCount,
  type ModuleScanCount,
} from "./scanCounts.js";
import {
  getShopScanBulkDownloadConcurrency,
  getShopScanBulkSubmitWindow,
  getShopScanJsonlYieldEveryLines,
  getShopScanJsonlYieldMs,
} from "./scanPace.js";

const LOG = "[shopifyBulk:scan]";

const SCAN_BULK_FALLBACK =
  (process.env.SHOP_SCAN_BULK_FALLBACK?.trim() ?? "1") !== "0" &&
  (process.env.SHOP_SCAN_BULK_FALLBACK?.trim() ?? "1").toLowerCase() !==
    "false";

export type ScanCountJob = {
  /** Unique id, e.g. `${module}::${locale}` */
  id: string;
  module: string;
  locale: string;
};

export type ScanCountJobResult = {
  job: ScanCountJob;
  count: ModuleScanCount;
  usedFallback: boolean;
};

async function countFromJsonlUrl(args: {
  url: string;
  module: string;
  onHeartbeat: () => Promise<void>;
}): Promise<ModuleScanCount> {
  const acc = emptyModuleScanCount();
  await streamBulkJsonlResources({
    url: args.url,
    logLabel: args.module,
    onHeartbeat: args.onHeartbeat,
    yieldEveryLines: getShopScanJsonlYieldEveryLines(),
    yieldMs: getShopScanJsonlYieldMs(),
    onLine: (row) => {
      accumulateScanCountNode(acc, args.module, {
        translations: row.translations ?? [],
        translatableContent: row.translatableContent ?? [],
      });
    },
  });
  return acc;
}

/**
 * 对一组 (module, locale) 跑 bulk 计数；结果通过 onResult 回调（可边完成边写 Redis）。
 */
export async function runBulkScanCounts(args: {
  shop: string;
  accessToken: string;
  jobs: ScanCountJob[];
  onHeartbeat: () => Promise<void>;
  isShutdown?: () => boolean;
  onResult: (result: ScanCountJobResult) => Promise<void>;
}): Promise<void> {
  const {
    shop,
    accessToken,
    jobs,
    onHeartbeat,
    isShutdown,
    onResult,
  } = args;

  const bulkJobs: ShopifyBulkJob[] = [];
  const jobById = new Map<string, ScanCountJob>();

  for (const job of jobs) {
    const resourceType = MODULE_TO_SHOPIFY_TYPE[job.module];
    if (!resourceType) {
      console.warn(`${LOG} unsupported module=${job.module}, zero count`);
      await onResult({
        job,
        count: emptyModuleScanCount(),
        usedFallback: false,
      });
      continue;
    }
    jobById.set(job.id, job);
    bulkJobs.push({
      id: job.id,
      resourceType,
      locale: job.locale,
    });
  }

  if (bulkJobs.length === 0) return;

  const downloadConcurrency = getShopScanBulkDownloadConcurrency();
  const submitWindow = getShopScanBulkSubmitWindow();
  console.log(
    `${LOG} start shop=${shop} jobs=${bulkJobs.length} fallback=${SCAN_BULK_FALLBACK}` +
      ` downloadConcurrency=${downloadConcurrency} submitWindow=${submitWindow}`,
  );

  await runShopifyBulkJobQueue({
    shopDomain: shop,
    jobs: bulkJobs,
    onHeartbeat,
    isShutdown,
    fallbackOnFailure: SCAN_BULK_FALLBACK,
    logPrefix: LOG,
    downloadConcurrency,
    submitWindow,
    processOutcome: async (outcome) => {
      const job = jobById.get(outcome.job.id);
      if (!job) {
        throw new Error(`${LOG} unknown job id=${outcome.job.id}`);
      }

      let count: ModuleScanCount;
      let usedFallback = false;

      if (outcome.mode === "empty") {
        count = emptyModuleScanCount();
      } else if (outcome.mode === "fallback") {
        console.log(
          `${LOG} fallback page id=${job.id} reason=${outcome.reason}`,
        );
        usedFallback = true;
        count = await countModuleScan(
          shop,
          accessToken,
          job.module,
          job.locale,
          onHeartbeat,
        );
      } else {
        console.log(`${LOG} download id=${job.id}`);
        try {
          count = await countFromJsonlUrl({
            url: outcome.url,
            module: job.module,
            onHeartbeat,
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.warn(`${LOG} download/parse failed id=${job.id}: ${msg}`);
          if (!SCAN_BULK_FALLBACK) throw e;
          usedFallback = true;
          count = await countModuleScan(
            shop,
            accessToken,
            job.module,
            job.locale,
            onHeartbeat,
          );
        }
      }

      await onResult({ job, count, usedFallback });
    },
  });
}
