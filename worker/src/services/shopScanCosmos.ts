import { CosmosClient, type Container } from "@azure/cosmos";
import { pushShopScanHint } from "./redisV4.js";

/**
 * 店铺画像扫描（Shop Profile Scan）Cosmos 访问层。
 *
 * 独立容器 `shop_scan_jobs`，与翻译 v4 的 `translation_v4_jobs` 隔离，避免状态机纠缠。
 * 分区键为 shopName；一店可有多条历史（每次扫描 scanId 唯一），供未来趋势对比。
 *
 * 环境变量（worker 侧，与 cosmosV4 共用连接）：
 *   COSMOS_ENDPOINT / COSMOS_KEY
 *   COSMOS_TRANSLATION_DATABASE_ID       （默认 "translation"）
 *   COSMOS_SHOP_SCAN_CONTAINER           （默认 "shop_scan_jobs"）
 */

export type ShopScanTrigger = "install" | "scheduled" | "manual";

export type ShopScanStatus =
  | "CREATED"
  | "QUEUED"
  | "SCANNING"
  | "COMPLETED"
  | "PARTIAL"
  | "FAILED";

export type ShopScanStageState = "PENDING" | "DONE" | "SKIPPED" | "FAILED";

export type ShopScanStageName =
  | "contentSize"
  | "profile"
  | "coverage"
  | "glossary";

export type ShopScanStages = Record<ShopScanStageName, ShopScanStageState>;

export type ShopScanCoverageRow = {
  locale: string;
  published: boolean;
  translated: number;
  total: number;
  percent: number | null;
};

/** 第二步 AI 术语与模块策略（同步写入 Cosmos summary 供页面展示）。 */
export type ShopScanProfileStrategy = {
  brandTerms: string[];
  doNotTranslateTerms: string[];
  preferredTerms: Array<{ source: string; note: string | null }>;
  seoTerms: string[];
  moduleHints: Array<{
    module: string;
    tonePolicy: string | null;
    keywordPolicy: string | null;
    literalVsAdaptive: string | null;
  }>;
};

export type ShopScanGlossarySuggestion = {
  locale: string;
  source: string;
  target: string;
};

export type ShopScanSummary = {
  totalItems?: number;
  totalChars?: number;
  moduleStats?: Record<string, { items: number; chars: number }>;
  coverage?: ShopScanCoverageRow[];
  glossaryCount?: number;
  profileStrategy?: ShopScanProfileStrategy | null;
  glossarySuggestions?: ShopScanGlossarySuggestion[];
};

export type ShopScanJob = {
  id: string; // scanId，唯一（partition 内主键）
  shopName: string; // 分区键
  trigger: ShopScanTrigger;
  status: ShopScanStatus;
  stages: ShopScanStages;
  blobPrefix: string; // "shop-scan/{shop}/{scanId}"
  summary: ShopScanSummary;
  claimedBy: string | null;
  claimedAt: string | null;
  lastHeartbeat: string | null;
  attempts: number;
  errorMessage: string | null;
  errorStage: string | null;
  createdAt: string;
  updatedAt: string;
};

/** worker 扫描单次允许的最大重试次数，超过后按已完成阶段标 PARTIAL/FAILED。 */
export const SHOP_SCAN_MAX_ATTEMPTS = Math.max(
  1,
  Number(process.env.SHOP_SCAN_MAX_ATTEMPTS) || 3,
);

/** SCANNING 无心跳超过此毫秒数视为 stale，重置回 QUEUED。 */
export const SHOP_SCAN_STALE_MS = Math.max(
  60_000,
  Number(process.env.SHOP_SCAN_STALE_MS) || 10 * 60_000,
);

export const EMPTY_SHOP_SCAN_STAGES: ShopScanStages = {
  contentSize: "PENDING",
  profile: "PENDING",
  coverage: "PENDING",
  glossary: "PENDING",
};

/** 待处理（可被 worker 领取）的状态。 */
export const PENDING_SHOP_SCAN_STATUSES: ShopScanStatus[] = ["CREATED", "QUEUED"];

/** 终态。 */
export const TERMINAL_SHOP_SCAN_STATUSES: ShopScanStatus[] = [
  "COMPLETED",
  "PARTIAL",
  "FAILED",
];

let _client: CosmosClient | null = null;

function getClient(): CosmosClient {
  if (!_client) {
    const endpoint = process.env.COSMOS_ENDPOINT?.trim();
    const key = process.env.COSMOS_KEY?.trim();
    if (!endpoint || !key) throw new Error("COSMOS_ENDPOINT and COSMOS_KEY are required");
    _client = new CosmosClient({ endpoint, key });
  }
  return _client;
}

function getContainer(): Container {
  const dbId = process.env.COSMOS_TRANSLATION_DATABASE_ID?.trim() || "translation";
  const containerId =
    process.env.COSMOS_SHOP_SCAN_CONTAINER?.trim() || "shop_scan_jobs";
  return getClient().database(dbId).container(containerId);
}

export async function getShopScanJob(
  shopName: string,
  scanId: string,
): Promise<ShopScanJob | null> {
  try {
    const { resource } = await getContainer()
      .item(scanId, shopName)
      .read<ShopScanJob>();
    return resource ?? null;
  } catch {
    return null;
  }
}

/** Atomically claim a scan: expectedStatus → newStatus with etag. Null if status mismatch. */
export async function claimShopScanJob(
  shopName: string,
  scanId: string,
  expectedStatus: ShopScanStatus,
  newStatus: ShopScanStatus,
  claimedBy: string,
): Promise<ShopScanJob | null> {
  try {
    const { resource: existing, etag } = await getContainer()
      .item(scanId, shopName)
      .read<ShopScanJob>();
    if (!existing || existing.status !== expectedStatus) return null;
    const now = new Date().toISOString();
    const updated: ShopScanJob = {
      ...existing,
      status: newStatus,
      claimedBy,
      claimedAt: now,
      lastHeartbeat: now,
      attempts: (existing.attempts ?? 0) + 1,
      updatedAt: now,
    };
    const { resource: saved } = await getContainer()
      .item(scanId, shopName)
      .replace<ShopScanJob>(updated, {
        accessCondition: { type: "IfMatch", condition: etag! },
      });
    return saved ?? updated;
  } catch {
    return null;
  }
}

function isCosmosPreconditionFailed(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as { code?: number | string; statusCode?: number; message?: string };
  if (e.code === 412 || e.statusCode === 412 || e.code === "PreconditionFailed") {
    return true;
  }
  return /precondition/i.test(e.message ?? "");
}

export type ShopScanUpdate = Partial<
  Pick<
    ShopScanJob,
    | "status"
    | "stages"
    | "summary"
    | "claimedBy"
    | "claimedAt"
    | "lastHeartbeat"
    | "errorMessage"
    | "errorStage"
  >
>;

/** Read-modify-write with etag retry; terminal states are not reverted. */
export async function updateShopScanJob(
  shopName: string,
  scanId: string,
  updates: ShopScanUpdate,
): Promise<void> {
  const maxAttempts = 5;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const { resource: existing, etag } = await getContainer()
        .item(scanId, shopName)
        .read<ShopScanJob>();
      if (!existing) return;
      if (
        updates.status !== undefined &&
        updates.status !== existing.status &&
        TERMINAL_SHOP_SCAN_STATUSES.includes(existing.status) &&
        !TERMINAL_SHOP_SCAN_STATUSES.includes(updates.status)
      ) {
        console.error(
          `[shopScanCosmos] 终态保护：拒绝 ${existing.status} → ${updates.status} scan=${scanId}`,
        );
        return;
      }
      const updated: ShopScanJob = {
        ...existing,
        ...updates,
        summary: updates.summary
          ? { ...existing.summary, ...updates.summary }
          : existing.summary,
        stages: updates.stages
          ? { ...existing.stages, ...updates.stages }
          : existing.stages,
        updatedAt: new Date().toISOString(),
      };
      await getContainer()
        .item(scanId, shopName)
        .replace<ShopScanJob>(updated, {
          accessCondition: { type: "IfMatch", condition: etag! },
        });
      return;
    } catch (e) {
      if (isCosmosPreconditionFailed(e) && attempt < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, 50 * 2 ** attempt));
        continue;
      }
      console.warn(`[shopScanCosmos] updateShopScanJob failed ${scanId}`, e);
      return;
    }
  }
}

/** 标记单个阶段状态（合并写，不覆盖其它阶段）。 */
export async function setShopScanStage(
  shopName: string,
  scanId: string,
  stage: ShopScanStageName,
  state: ShopScanStageState,
): Promise<void> {
  await updateShopScanJob(shopName, scanId, {
    stages: { [stage]: state } as Partial<ShopScanStages> as ShopScanStages,
  });
}

/** Heartbeat: patch only timestamps (avoid full doc replace). */
export async function heartbeatShopScan(
  shopName: string,
  scanId: string,
): Promise<void> {
  const now = new Date().toISOString();
  try {
    await getContainer()
      .item(scanId, shopName)
      .patch([
        { op: "set", path: "/lastHeartbeat", value: now },
        { op: "set", path: "/updatedAt", value: now },
      ]);
  } catch (e) {
    console.warn(`[shopScanCosmos] heartbeat failed ${scanId}`, e);
  }
}

export type ShopScanRef = Pick<ShopScanJob, "id" | "shopName">;

/** 待处理扫描（CREATED/QUEUED），跨 partition，限量。 */
export async function findPendingShopScanJobs(limit = 5): Promise<ShopScanRef[]> {
  try {
    const { resources } = await getContainer()
      .items.query<ShopScanRef>({
        query:
          "SELECT c.id, c.shopName FROM c WHERE ARRAY_CONTAINS(@statuses, c.status) ORDER BY c.createdAt ASC OFFSET 0 LIMIT @limit",
        parameters: [
          { name: "@statuses", value: PENDING_SHOP_SCAN_STATUSES },
          { name: "@limit", value: limit },
        ],
      })
      .fetchAll();
    return resources;
  } catch {
    return [];
  }
}

/** 该店最近 N 条扫描（供跨 trigger 合并 summary）。 */
export async function findRecentShopScanJobs(
  shopName: string,
  limit = 5,
): Promise<ShopScanJob[]> {
  try {
    const { resources } = await getContainer()
      .items.query<ShopScanJob>(
        {
          query:
            "SELECT * FROM c WHERE c.shopName = @shopName ORDER BY c.createdAt DESC OFFSET 0 LIMIT @limit",
          parameters: [
            { name: "@shopName", value: shopName },
            { name: "@limit", value: limit },
          ],
        },
        { partitionKey: shopName },
      )
      .fetchAll();
    return resources;
  } catch {
    return [];
  }
}

/**
 * 该店是否已有「进行中或已完成」的计量扫描（触发端幂等判断用）。
 * 纯 AI manual 不计入，避免挡住安装计量。
 */
export async function hasActiveOrCompletedShopScan(
  shopName: string,
): Promise<boolean> {
  try {
    const { resources } = await getContainer()
      .items.query<number>(
        {
          query: `SELECT VALUE COUNT(1) FROM c WHERE c.shopName = @shopName AND (
            (c.trigger IN ('install', 'scheduled') AND c.status IN ('CREATED','QUEUED','SCANNING','COMPLETED','PARTIAL'))
            OR c.stages.contentSize = 'DONE'
          )`,
          parameters: [{ name: "@shopName", value: shopName }],
        },
        { partitionKey: shopName },
      )
      .fetchAll();
    return (resources[0] ?? 0) > 0;
  } catch {
    return false;
  }
}

/** 该店是否已有进行中的 shop scan（任意 trigger），scheduled 入队前跳过用。 */
export async function hasActiveShopScan(shopName: string): Promise<boolean> {
  try {
    const { resources } = await getContainer()
      .items.query<number>(
        {
          query: `SELECT VALUE COUNT(1) FROM c WHERE c.shopName = @shopName AND c.status IN ('CREATED','QUEUED','SCANNING')`,
          parameters: [{ name: "@shopName", value: shopName }],
        },
        { partitionKey: shopName },
      )
      .fetchAll();
    return (resources[0] ?? 0) > 0;
  } catch {
    return false;
  }
}

/**
 * 该店最近一次计量扫描（install/scheduled）的 createdAt，供整店冷却判断。
 * manual（纯 AI）不计入冷却。
 */
export async function getLatestMetricsScanCreatedAt(
  shopName: string,
): Promise<Date | null> {
  try {
    const { resources } = await getContainer()
      .items.query<{ createdAt: string }>(
        {
          query: `SELECT c.createdAt FROM c WHERE c.shopName = @shopName AND c.trigger IN ('install', 'scheduled') ORDER BY c.createdAt DESC OFFSET 0 LIMIT 1`,
          parameters: [{ name: "@shopName", value: shopName }],
        },
        { partitionKey: shopName },
      )
      .fetchAll();
    const raw = resources[0]?.createdAt;
    if (!raw) return null;
    const at = new Date(raw);
    return Number.isNaN(at.getTime()) ? null : at;
  } catch {
    return null;
  }
}

/** 新建扫描文档（upsert）。 */
export async function createShopScanJob(input: {
  scanId: string;
  shopName: string;
  trigger: ShopScanTrigger;
  blobPrefix: string;
}): Promise<ShopScanJob> {
  const now = new Date().toISOString();
  const doc: ShopScanJob = {
    id: input.scanId,
    shopName: input.shopName,
    trigger: input.trigger,
    status: "CREATED",
    stages: { ...EMPTY_SHOP_SCAN_STAGES },
    blobPrefix: input.blobPrefix,
    summary: {},
    claimedBy: null,
    claimedAt: null,
    lastHeartbeat: null,
    attempts: 0,
    errorMessage: null,
    errorStage: null,
    createdAt: now,
    updatedAt: now,
  };
  await getContainer().items.upsert(doc);
  return doc;
}

/**
 * 找出 SCANNING 状态但心跳超时的扫描，重置回 QUEUED 并 push hint。
 * worker 崩溃/重启后的自愈；返回重置数量。
 */
export async function resetStaleShopScanJobs(): Promise<number> {
  const cutoff = new Date(Date.now() - SHOP_SCAN_STALE_MS).toISOString();
  let reset = 0;
  try {
    const { resources } = await getContainer()
      .items.query<ShopScanRef & { lastHeartbeat: string | null }>({
        query:
          "SELECT c.id, c.shopName, c.lastHeartbeat FROM c WHERE c.status = 'SCANNING' AND (c.lastHeartbeat = null OR c.lastHeartbeat < @cutoff) OFFSET 0 LIMIT 50",
        parameters: [{ name: "@cutoff", value: cutoff }],
      })
      .fetchAll();
    for (const job of resources) {
      await updateShopScanJob(job.shopName, job.id, {
        status: "QUEUED",
        claimedBy: null,
      });
      await pushShopScanHint({ scanId: job.id, shopName: job.shopName });
      reset++;
    }
  } catch (e) {
    console.warn("[shopScanCosmos] resetStaleShopScanJobs failed", e);
  }
  if (reset > 0) console.log(`[shopScanCosmos] reset ${reset} stale scan(s) → QUEUED`);
  return reset;
}

/** 部署重启后：给所有 CREATED/QUEUED 扫描补 push hint，新进程立即接管。 */
export async function wakeQueuedShopScanJobsAfterDeploy(): Promise<number> {
  let woken = 0;
  try {
    const refs = await findPendingShopScanJobs(200);
    for (const ref of refs) {
      await pushShopScanHint({ scanId: ref.id, shopName: ref.shopName });
      woken++;
    }
  } catch (e) {
    console.warn("[shopScanCosmos] wakeQueuedShopScanJobsAfterDeploy failed", e);
  }
  if (woken > 0) console.log(`[shopScanCosmos] re-hinted ${woken} pending scan(s) after deploy`);
  return woken;
}
