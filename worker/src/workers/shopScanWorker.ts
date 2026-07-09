import { hostname } from "os";
import {
  claimShopScanJob,
  findPendingShopScanJobs,
  getShopScanJob,
  heartbeatShopScan,
  setShopScanStage,
  updateShopScanJob,
  SHOP_SCAN_MAX_ATTEMPTS,
  type ShopScanJob,
  type ShopScanStageName,
  type ShopScanStageState,
  type ShopScanSummary,
} from "../services/shopScanCosmos.js";
import {
  popShopScanHint,
  pushShopScanHint,
  requeueShopScanHintTail,
} from "../services/redisV4.js";
import { getOfflineAccessTokenFromTsf, hasTsfDbCredentials } from "../services/tsfDb.js";
import { fetchShopLocales, type ShopLocaleRow } from "../services/shopScan/shopContext.js";
import { isRecoverableScanError } from "../services/shopScan/graphql.js";
import { runContentSizeStage } from "../services/shopScan/stageContentSize.js";
import { runProfileStage } from "../services/shopScan/stageProfile.js";
import { runCoverageStage } from "../services/shopScan/stageCoverage.js";
import { runGlossaryStage } from "../services/shopScan/stageGlossary.js";
import { touchShopProfileScan } from "../services/shopScan/tsfWrite.js";
import { isShuttingDown } from "../shutdown.js";

const WORKER_ID = `shopscan-${process.env.HOSTNAME ?? hostname()}-${process.pid}`;

/** 每 tick 最多处理的扫描数（扫描较重，保守串行）。 */
const DRAIN_MAX = Math.max(1, Number(process.env.SHOP_SCAN_DRAIN_MAX) || 3);
const HEARTBEAT_THROTTLE_MS = 20_000;

/** shop_scan Cosmos 是否配置（未配置则整个 worker 空跑）。 */
function cosmosConfigured(): boolean {
  return Boolean(process.env.COSMOS_ENDPOINT?.trim() && process.env.COSMOS_KEY?.trim());
}

/** 抛出以请求「整任务重新入队」（可恢复错误 + 仍有重试次数）。 */
class RequeueSignal extends Error {}

export async function runShopScanWorker(): Promise<void> {
  if (isShuttingDown()) return;
  if (!cosmosConfigured() || !hasTsfDbCredentials()) return;

  let processed = 0;

  // 1. 优先消费 hint（立即唤醒）
  for (let i = 0; i < DRAIN_MAX && !isShuttingDown(); i++) {
    const hint = await popShopScanHint();
    if (!hint) break;
    const ran = await tryProcessScan(hint.shopName, hint.scanId);
    if (ran === "busy") {
      // 已被别的进程领走或状态不符，尾插回队列避免热轮询同一条
      await requeueShopScanHintTail(hint);
    } else if (ran === "ok") {
      processed++;
    }
  }

  // 2. 兜底：轮询 Cosmos 里 CREATED/QUEUED 的扫描（hint 丢失/部署重启后自愈）
  if (processed < DRAIN_MAX && !isShuttingDown()) {
    const refs = await findPendingShopScanJobs(DRAIN_MAX - processed);
    for (const ref of refs) {
      if (isShuttingDown()) break;
      await tryProcessScan(ref.shopName, ref.id);
    }
  }
}

async function tryProcessScan(
  shop: string,
  scanId: string,
): Promise<"ok" | "busy" | "skip"> {
  const current = await getShopScanJob(shop, scanId);
  if (!current) return "skip";
  if (current.status !== "CREATED" && current.status !== "QUEUED") return "busy";

  const claimed = await claimShopScanJob(
    shop,
    scanId,
    current.status,
    "SCANNING",
    WORKER_ID,
  );
  if (!claimed) return "busy";

  await runScanStages(claimed);
  return "ok";
}

function makeHeartbeat(shop: string, scanId: string): () => Promise<void> {
  let last = 0;
  return async () => {
    const now = Date.now();
    if (now - last < HEARTBEAT_THROTTLE_MS) return;
    last = now;
    await heartbeatShopScan(shop, scanId);
  };
}

async function runScanStages(job: ShopScanJob): Promise<void> {
  const shop = job.shopName;
  const scanId = job.id;
  const heartbeat = makeHeartbeat(shop, scanId);
  const attemptsExhausted = job.attempts >= SHOP_SCAN_MAX_ATTEMPTS;

  const accessToken = await getOfflineAccessTokenFromTsf(shop);
  if (!accessToken) {
    await failScan(shop, scanId, "prepare", "no offline access token in TSF Session");
    return;
  }

  let locales: ShopLocaleRow[];
  let primaryLocale: string;
  try {
    locales = await fetchShopLocales(shop, accessToken);
    primaryLocale = locales.find((l) => l.primary)?.locale ?? "en";
  } catch (error) {
    await handleFatalOrRequeue(job, "prepare", error, attemptsExhausted);
    return;
  }

  const summary: ShopScanSummary = { ...job.summary };
  const stages = { ...job.stages };

  const runStage = async (
    name: ShopScanStageName,
    fn: () => Promise<ShopScanStageState | { state: ShopScanStageState; summary?: Partial<ShopScanSummary> }>,
  ): Promise<void> => {
    if (stages[name] === "DONE" || stages[name] === "SKIPPED") return; // 幂等：已完成阶段跳过
    try {
      const result = await fn();
      const state = typeof result === "string" ? result : result.state;
      if (typeof result !== "string" && result.summary) {
        Object.assign(summary, result.summary);
        await updateShopScanJob(shop, scanId, { summary: result.summary });
      }
      stages[name] = state;
      await setShopScanStage(shop, scanId, name, state);
      await heartbeat();
    } catch (error) {
      if (isRecoverableScanError(error) && !attemptsExhausted) {
        throw new RequeueSignal(`${name}: ${error instanceof Error ? error.message : error}`);
      }
      console.error(`[shopScan] stage=${name} failed shop=${shop} scan=${scanId}:`, error);
      stages[name] = "FAILED";
      await setShopScanStage(shop, scanId, name, "FAILED");
    }
  };

  try {
    await runStage("contentSize", async () => {
      const r = await runContentSizeStage({
        shop,
        accessToken,
        primaryLocale,
        blobPrefix: job.blobPrefix,
        heartbeat,
      });
      return {
        state: "DONE",
        summary: {
          totalItems: r.totalItems,
          totalChars: r.totalChars,
          moduleStats: r.moduleStats,
        },
      };
    });

    await runStage("profile", async () => {
      const r = await runProfileStage({
        shop,
        accessToken,
        primaryLocale,
        locales,
        scanId,
        blobPrefix: job.blobPrefix,
        heartbeat,
      });
      return r.status === "done"
        ? { state: "DONE", summary: { profileStrategy: r.profileStrategy } }
        : "SKIPPED";
    });

    await runStage("coverage", async () => {
      const r = await runCoverageStage({
        shop,
        accessToken,
        primaryLocale,
        locales,
        blobPrefix: job.blobPrefix,
        heartbeat,
      });
      return { state: r.status === "done" ? "DONE" : "SKIPPED", summary: { coverage: r.coverage } };
    });

    await runStage("glossary", async () => {
      const r = await runGlossaryStage({
        shop,
        accessToken,
        primaryLocale,
        locales,
        blobPrefix: job.blobPrefix,
        heartbeat,
      });
      return {
        state: r.status === "done" ? "DONE" : "SKIPPED",
        summary: {
          glossaryCount: r.glossaryCount,
          glossarySuggestions: r.glossarySuggestions,
        },
      };
    });
  } catch (signal) {
    if (signal instanceof RequeueSignal) {
      await requeueScan(shop, scanId, signal.message);
      return;
    }
    throw signal;
  }

  // 扫描收尾：确保画像扫描指针写入（profile 跳过时也记录一次）
  if (stages.profile !== "DONE") {
    try {
      await touchShopProfileScan(shop, scanId);
    } catch {
      // best-effort：无 ShopProfile 行时忽略
    }
  }

  const anyFailed = Object.values(stages).some((s) => s === "FAILED");
  const finalStatus = anyFailed ? "PARTIAL" : "COMPLETED";
  await updateShopScanJob(shop, scanId, {
    status: finalStatus,
    claimedBy: null,
    errorStage: anyFailed
      ? (Object.keys(stages) as ShopScanStageName[]).find((k) => stages[k] === "FAILED") ?? null
      : null,
  });
  console.log(
    `[shopScan] ${finalStatus} shop=${shop} scan=${scanId} stages=${JSON.stringify(stages)}`,
  );
}

async function requeueScan(shop: string, scanId: string, reason: string): Promise<void> {
  await updateShopScanJob(shop, scanId, {
    status: "QUEUED",
    claimedBy: null,
    errorMessage: reason,
  });
  await pushShopScanHint({ scanId, shopName: shop });
  console.warn(`[shopScan] requeued shop=${shop} scan=${scanId} (${reason})`);
}

async function handleFatalOrRequeue(
  job: ShopScanJob,
  stage: string,
  error: unknown,
  attemptsExhausted: boolean,
): Promise<void> {
  if (isRecoverableScanError(error) && !attemptsExhausted) {
    await requeueScan(job.shopName, job.id, `${stage}: ${error instanceof Error ? error.message : error}`);
    return;
  }
  await failScan(job.shopName, job.id, stage, error instanceof Error ? error.message : String(error));
}

async function failScan(
  shop: string,
  scanId: string,
  stage: string,
  message: string,
): Promise<void> {
  await updateShopScanJob(shop, scanId, {
    status: "FAILED",
    claimedBy: null,
    errorStage: stage,
    errorMessage: message,
  });
  console.error(`[shopScan] FAILED shop=${shop} scan=${scanId} stage=${stage}: ${message}`);
}
