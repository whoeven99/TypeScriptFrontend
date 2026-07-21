import { hostname } from "os";
import {
  claimShopScanJob,
  findPendingShopScanJobs,
  findRecentShopScanJobs,
  getShopScanJob,
  heartbeatShopScan,
  setShopScanStage,
  updateShopScanJob,
  SHOP_SCAN_MAX_ATTEMPTS,
  type ShopScanJob,
  type ShopScanStageName,
  type ShopScanStageState,
  type ShopScanSummary,
<<<<<<< HEAD
  type ShopScanTask,
=======
  type ShopScanTrigger,
>>>>>>> origin/master
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
import {
  runCatalogSourceStage,
  runEditorialSourceStage,
  runMarketLocaleStage,
  runProfileAiStageFromBlob,
  runProfileIdentityStage,
  runProfileStage,
  runStyleSourceStage,
} from "../services/shopScan/stageProfile.js";
import { runCoverageStage } from "../services/shopScan/stageCoverage.js";
import {
  runGlossaryAiStageFromBlob,
  runGlossarySamplesStage,
} from "../services/shopScan/stageGlossary.js";
import { touchShopProfileScan } from "../services/shopScan/tsfWrite.js";
import { isShuttingDown } from "../shutdown.js";

const WORKER_ID = `shopscan-${process.env.HOSTNAME ?? hostname()}-${process.pid}`;

/** 每 tick 最多处理的扫描数（扫描较重，保守串行）。 */
const DRAIN_MAX = Math.max(1, Number(process.env.SHOP_SCAN_DRAIN_MAX) || 3);
const HEARTBEAT_THROTTLE_MS = 20_000;

<<<<<<< HEAD
function buildProfileWorkspacePrefix(shop: string): string {
  return `shop-scan/${shop}/profile-workspace`;
}

function buildGlossaryWorkspacePrefix(shop: string): string {
  return `shop-scan/${shop}/glossary-workspace`;
}
=======
/** 计量阶段：安装/定时默认跑。 */
const METRICS_STAGES: readonly ShopScanStageName[] = ["contentSize", "coverage"];
/** AI 阶段：仅手动触发。 */
const AI_STAGES: readonly ShopScanStageName[] = ["profile", "glossary"];
>>>>>>> origin/master

/** shop_scan Cosmos 是否配置（未配置则整个 worker 空跑）。 */
function cosmosConfigured(): boolean {
  return Boolean(process.env.COSMOS_ENDPOINT?.trim() && process.env.COSMOS_KEY?.trim());
}

/** 抛出以请求「整任务重新入队」（可恢复错误 + 仍有重试次数）。 */
class RequeueSignal extends Error {}

function isMetricsTrigger(trigger: ShopScanTrigger): boolean {
  return trigger === "install" || trigger === "scheduled";
}

function stagesForTrigger(trigger: ShopScanTrigger): {
  run: readonly ShopScanStageName[];
  skip: readonly ShopScanStageName[];
} {
  if (isMetricsTrigger(trigger)) {
    return { run: METRICS_STAGES, skip: AI_STAGES };
  }
  // manual（及其它）：只跑 AI
  return { run: AI_STAGES, skip: METRICS_STAGES };
}

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

type ShopScanStagesMutable = ShopScanJob["stages"];

async function markSkipped(
  shop: string,
  scanId: string,
  stages: ShopScanStagesMutable,
  names: readonly ShopScanStageName[],
): Promise<void> {
  for (const name of names) {
    if (stages[name] === "DONE" || stages[name] === "SKIPPED" || stages[name] === "FAILED") {
      continue;
    }
    stages[name] = "SKIPPED";
    await setShopScanStage(shop, scanId, name, "SKIPPED");
  }
}

/**
 * 本 job 跳过的阶段：从同店上一份有效 summary 合并过来，保证 getLatest 仍有完整「当前生效」数据。
 */
async function mergePreviousSummaryForSkipped(args: {
  shop: string;
  scanId: string;
  stages: ShopScanStagesMutable;
  summary: ShopScanSummary;
}): Promise<Partial<ShopScanSummary> | null> {
  const { shop, scanId, stages, summary } = args;
  const needMetrics =
    (stages.contentSize === "SKIPPED" && summary.moduleStats == null) ||
    (stages.coverage === "SKIPPED" && summary.coverage == null);
  const needAi =
    (stages.profile === "SKIPPED" && summary.profileStrategy == null) ||
    (stages.glossary === "SKIPPED" && summary.glossarySuggestions == null);
  if (!needMetrics && !needAi) return null;

  const previous = await findPreviousSummaryJob(shop, scanId);
  if (!previous?.summary) return null;

  const merged: Partial<ShopScanSummary> = {};
  const prev = previous.summary;

  if (stages.contentSize === "SKIPPED") {
    if (summary.totalItems == null && prev.totalItems != null) merged.totalItems = prev.totalItems;
    if (summary.totalChars == null && prev.totalChars != null) merged.totalChars = prev.totalChars;
    if (summary.moduleStats == null && prev.moduleStats != null) {
      merged.moduleStats = prev.moduleStats;
    }
  }
  if (stages.coverage === "SKIPPED" && summary.coverage == null && prev.coverage != null) {
    merged.coverage = prev.coverage;
  }
  if (
    stages.profile === "SKIPPED" &&
    summary.profileStrategy == null &&
    prev.profileStrategy != null
  ) {
    merged.profileStrategy = prev.profileStrategy;
  }
  if (stages.glossary === "SKIPPED") {
    if (summary.glossaryCount == null && prev.glossaryCount != null) {
      merged.glossaryCount = prev.glossaryCount;
    }
    if (summary.glossarySuggestions == null && prev.glossarySuggestions != null) {
      merged.glossarySuggestions = prev.glossarySuggestions;
    }
  }

  return Object.keys(merged).length > 0 ? merged : null;
}

async function findPreviousSummaryJob(
  shop: string,
  excludeScanId: string,
): Promise<ShopScanJob | null> {
  const recent = await findRecentShopScanJobs(shop, 5);
  return (
    recent.find(
      (j) => j.id !== excludeScanId && j.summary && Object.keys(j.summary).length > 0,
    ) ?? null
  );
}

async function runScanStages(job: ShopScanJob): Promise<void> {
  const shop = job.shopName;
  const scanId = job.id;
  const task = job.task;
  const heartbeat = makeHeartbeat(shop, scanId);
  const attemptsExhausted = job.attempts >= SHOP_SCAN_MAX_ATTEMPTS;
<<<<<<< HEAD
  const taskStage = stageNameForTask(task);
=======
  const { run: stagesToRun, skip: stagesToSkip } = stagesForTrigger(job.trigger);
>>>>>>> origin/master

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
  let skipReason: string | null = null;

<<<<<<< HEAD
  type TaskRunResult =
    | ShopScanStageState
    | {
        state: ShopScanStageState;
        summary?: Partial<ShopScanSummary>;
        skipReason?: string;
      };

  const runTask = async (fn: () => Promise<TaskRunResult>): Promise<void> => {
=======
  await markSkipped(shop, scanId, stages, stagesToSkip);

  const runStage = async (
    name: ShopScanStageName,
    fn: () => Promise<ShopScanStageState | { state: ShopScanStageState; summary?: Partial<ShopScanSummary> }>,
  ): Promise<void> => {
    if (!stagesToRun.includes(name)) return;
    if (stages[name] === "DONE" || stages[name] === "SKIPPED") return; // 幂等：已完成阶段跳过
>>>>>>> origin/master
    try {
      const result = await fn();
      const state = typeof result === "string" ? result : result.state;
      if (typeof result !== "string" && result.summary) {
        Object.assign(summary, result.summary);
        await updateShopScanJob(shop, scanId, { summary: result.summary });
      }
      if (typeof result !== "string" && result.skipReason) {
        skipReason = result.skipReason;
      } else if (state === "SKIPPED" && !skipReason) {
        skipReason = "skipped";
      }
      stages[taskStage] = state;
      await setShopScanStage(shop, scanId, taskStage, state);
      await heartbeat();
    } catch (error) {
      if (isRecoverableScanError(error) && !attemptsExhausted) {
        throw new RequeueSignal(`${task}: ${error instanceof Error ? error.message : error}`);
      }
      console.error(`[shopScan] task=${task} failed shop=${shop} scan=${scanId}:`, error);
      stages[taskStage] = "FAILED";
      await setShopScanStage(shop, scanId, taskStage, "FAILED");
    }
  };

  try {
<<<<<<< HEAD
    await runTask(async () => {
      switch (task) {
        case "content_size": {
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
        }
        case "coverage": {
          const r = await runCoverageStage({
            shop,
            accessToken,
            primaryLocale,
            locales,
            blobPrefix: job.blobPrefix,
            heartbeat,
          });
          return {
            state: r.status === "done" ? "DONE" : "SKIPPED",
            summary: { coverage: r.coverage },
            skipReason: r.status === "done" ? undefined : r.reason ?? "coverage_skipped",
          };
        }
        case "profile_material": {
          const r = await runProfileStage({
            shop,
            accessToken,
            primaryLocale,
            locales,
            scanId,
            blobPrefix: job.blobPrefix,
            heartbeat,
            enableAi: false,
          });
          return r.status === "done"
            ? "DONE"
            : { state: "SKIPPED", skipReason: r.reason ?? "profile_material_skipped" };
        }
        case "profile_identity": {
          const r = await runProfileIdentityStage({
            shop,
            accessToken,
            locales,
            blobPrefix: job.blobPrefix,
            heartbeat,
          });
          return r.status === "done"
            ? "DONE"
            : { state: "SKIPPED", skipReason: r.reason ?? "profile_identity_skipped" };
        }
        case "market_locale": {
          const r = await runMarketLocaleStage({
            shop,
            accessToken,
            locales,
            blobPrefix: job.blobPrefix,
            heartbeat,
          });
          return r.status === "done"
            ? "DONE"
            : { state: "SKIPPED", skipReason: r.reason ?? "market_locale_skipped" };
        }
        case "catalog_material": {
          const r = await runCatalogSourceStage({
            shop,
            accessToken,
            locales,
            blobPrefix: job.blobPrefix,
            heartbeat,
          });
          return r.status === "done"
            ? "DONE"
            : { state: "SKIPPED", skipReason: r.reason ?? "catalog_material_skipped" };
        }
        case "editorial_material": {
          const r = await runEditorialSourceStage({
            shop,
            accessToken,
            locales,
            blobPrefix: job.blobPrefix,
            heartbeat,
          });
          return r.status === "done"
            ? "DONE"
            : { state: "SKIPPED", skipReason: r.reason ?? "editorial_material_skipped" };
        }
        case "style_material": {
          const r = await runStyleSourceStage({
            shop,
            accessToken,
            locales,
            blobPrefix: job.blobPrefix,
            heartbeat,
          });
          return r.status === "done"
            ? "DONE"
            : { state: "SKIPPED", skipReason: r.reason ?? "style_material_skipped" };
        }
        case "profile_ai": {
          const r = await runProfileAiStageFromBlob({
            shop,
            accessToken,
            primaryLocale,
            locales,
            scanId,
            sourceBlobPrefix: buildProfileWorkspacePrefix(shop),
            targetBlobPrefix: job.blobPrefix,
            heartbeat,
          });
          return r.status === "done"
            ? { state: "DONE", summary: { profileStrategy: r.profileStrategy } }
            : {
                state: "SKIPPED",
                skipReason: r.reason ?? "profile_ai_skipped",
              };
        }
        case "glossary_samples": {
          const r = await runGlossarySamplesStage({
            shop,
            accessToken,
            primaryLocale,
            locales,
            blobPrefix: job.blobPrefix,
            heartbeat,
          });
          return r.status === "done"
            ? "DONE"
            : { state: "SKIPPED", skipReason: r.reason ?? "glossary_samples_skipped" };
        }
        case "glossary_ai": {
          const r = await runGlossaryAiStageFromBlob({
            blobPrefix: job.blobPrefix,
            sourceBlobPrefix: buildGlossaryWorkspacePrefix(shop),
            heartbeat,
          });
          return {
            state: r.status === "done" ? "DONE" : "SKIPPED",
            summary: {
              glossaryCount: r.glossaryCount,
              glossarySuggestions: r.glossarySuggestions,
            },
            skipReason: r.status === "done" ? undefined : r.reason ?? "glossary_ai_skipped",
          };
        }
      }
=======
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
>>>>>>> origin/master
    });
  } catch (signal) {
    if (signal instanceof RequeueSignal) {
      await requeueScan(shop, scanId, signal.message);
      return;
    }
    throw signal;
  }

<<<<<<< HEAD
  // 画像相关任务收尾：确保画像扫描指针更新。
  if (
    task === "profile_material" ||
    task === "profile_identity" ||
    task === "market_locale" ||
    task === "catalog_material" ||
    task === "editorial_material" ||
    task === "style_material" ||
    task === "profile_ai"
  ) {
=======
  // 跳过阶段的 summary 从上一份合并，避免 manual/计量交叉后 latest 丢字段
  const carried = await mergePreviousSummaryForSkipped({ shop, scanId, stages, summary });
  if (carried) {
    Object.assign(summary, carried);
    await updateShopScanJob(shop, scanId, { summary: carried });
  }

  // 扫描收尾：确保画像扫描指针写入（profile 跳过时也记录一次）
  if (stages.profile !== "DONE") {
>>>>>>> origin/master
    try {
      await touchShopProfileScan(shop, scanId);
    } catch {
      // best-effort：无 ShopProfile 行时忽略
    }
  }

  const taskState = stages[taskStage];
  const finalStatus =
    taskState === "FAILED"
      ? "PARTIAL"
      : taskState === "SKIPPED"
        ? "SKIPPED"
        : "COMPLETED";
  await updateShopScanJob(shop, scanId, {
    status: finalStatus,
    claimedBy: null,
    errorMessage: taskState === "SKIPPED" ? skipReason : job.errorMessage,
    errorStage: taskState === "FAILED" ? taskStage : null,
  });
  console.log(
<<<<<<< HEAD
    `[shopScan] ${finalStatus} shop=${shop} scan=${scanId} task=${task} stages=${JSON.stringify(stages)}${
      skipReason ? ` reason=${skipReason}` : ""
    }`,
=======
    `[shopScan] ${finalStatus} shop=${shop} scan=${scanId} trigger=${job.trigger} stages=${JSON.stringify(stages)}`,
>>>>>>> origin/master
  );
}

function stageNameForTask(task: ShopScanTask): ShopScanStageName {
  switch (task) {
    case "content_size":
      return "contentSize";
    case "coverage":
      return "coverage";
    case "profile_material":
    case "profile_identity":
    case "market_locale":
    case "catalog_material":
    case "editorial_material":
    case "style_material":
    case "profile_ai":
      return "profile";
    case "glossary_samples":
    case "glossary_ai":
      return "glossary";
  }
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
