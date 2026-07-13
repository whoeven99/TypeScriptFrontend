import { CosmosClient, type Container } from "@azure/cosmos";

/**
 * 店铺画像扫描（Shop Profile Scan）——Remix 侧 Cosmos 访问层。
 *
 * 与 worker `worker/src/services/shopScanCosmos.ts` 共享文档结构，写入同一个
 * `shop_scan_jobs` 容器（worker 消费）。分区键 shopName。
 *
 * 环境变量沿用翻译 v4 的 `_V4` 后缀（与 `app/server/translateV4/cosmos.server.ts` 一致）：
 *   COSMOS_ENDPOINT_V4 / COSMOS_KEY_V4
 *   COSMOS_TRANSLATION_DATABASE_ID_V4    （默认 "translation"）
 *   COSMOS_SHOP_SCAN_CONTAINER           （默认 "shop_scan_jobs"）
 */

export type ShopScanTrigger = "install" | "scheduled" | "manual";
export type ShopScanMode = "full" | "data_only" | "ai_only";
export type ShopScanTask =
  | "content_size"
  | "coverage"
  | "profile_material"
  | "profile_ai"
  | "glossary_samples"
  | "glossary_ai";

export type ShopScanStatus =
  | "CREATED"
  | "QUEUED"
  | "SCANNING"
  | "COMPLETED"
  | "PARTIAL"
  | "FAILED";

export type ShopScanStageState = "PENDING" | "DONE" | "SKIPPED" | "FAILED";

export type ShopScanStages = {
  contentSize: ShopScanStageState;
  profile: ShopScanStageState;
  coverage: ShopScanStageState;
  glossary: ShopScanStageState;
};

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
  id: string;
  shopName: string;
  trigger: ShopScanTrigger;
  mode: ShopScanMode;
  task: ShopScanTask;
  status: ShopScanStatus;
  stages: ShopScanStages;
  blobPrefix: string;
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

let _client: CosmosClient | null = null;

function getClient(): CosmosClient {
  if (!_client) {
    const endpoint = process.env.COSMOS_ENDPOINT_V4?.trim();
    const key = process.env.COSMOS_KEY_V4?.trim();
    if (!endpoint || !key) {
      throw new Error("COSMOS_ENDPOINT_V4 与 COSMOS_KEY_V4 必填");
    }
    _client = new CosmosClient({ endpoint, key });
  }
  return _client;
}

function getContainer(): Container {
  const dbId =
    process.env.COSMOS_TRANSLATION_DATABASE_ID_V4?.trim() || "translation";
  const containerId =
    process.env.COSMOS_SHOP_SCAN_CONTAINER?.trim() || "shop_scan_jobs";
  return getClient().database(dbId).container(containerId);
}

const EMPTY_STAGES: ShopScanStages = {
  contentSize: "PENDING",
  profile: "PENDING",
  coverage: "PENDING",
  glossary: "PENDING",
};

/** 新建扫描文档（upsert）。 */
export async function createShopScanJob(input: {
  scanId: string;
  shop: string;
  trigger: ShopScanTrigger;
  mode: ShopScanMode;
  task: ShopScanTask;
  blobPrefix: string;
  summary?: ShopScanSummary;
  stages?: Partial<ShopScanStages>;
}): Promise<ShopScanJob> {
  const now = new Date().toISOString();
  const doc: ShopScanJob = {
    id: input.scanId,
    shopName: input.shop,
    trigger: input.trigger,
    mode: input.mode,
    task: input.task,
    status: "CREATED",
    stages: { ...EMPTY_STAGES, ...(input.stages ?? {}) },
    blobPrefix: input.blobPrefix,
    summary: input.summary ?? {},
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

/** 该店是否已有「进行中或已完成」的扫描（install 触发幂等）。 */
export async function hasActiveOrCompletedShopScan(shop: string): Promise<boolean> {
  try {
    const { resources } = await getContainer()
      .items.query<number>(
        {
          query:
            "SELECT VALUE COUNT(1) FROM c WHERE c.shopName = @shop AND c.status IN ('CREATED','QUEUED','SCANNING','COMPLETED','PARTIAL')",
          parameters: [{ name: "@shop", value: shop }],
        },
        { partitionKey: shop },
      )
      .fetchAll();
    return (resources[0] ?? 0) > 0;
  } catch {
    return false;
  }
}

export async function listRecentShopScanJobs(
  shop: string,
  limit = 20,
): Promise<ShopScanJob[]> {
  try {
    const { resources } = await getContainer()
      .items.query<ShopScanJob>(
        {
          query:
            "SELECT * FROM c WHERE c.shopName = @shop ORDER BY c.createdAt DESC OFFSET 0 LIMIT @limit",
          parameters: [
            { name: "@shop", value: shop },
            { name: "@limit", value: limit },
          ],
        },
        { partitionKey: shop },
      )
      .fetchAll();
    return resources;
  } catch {
    return [];
  }
}

export async function getLatestShopScanJobsByTask(
  shop: string,
): Promise<Partial<Record<ShopScanTask, ShopScanJob>>> {
  const jobs = await listRecentShopScanJobs(shop, 30);
  const latestByTask: Partial<Record<ShopScanTask, ShopScanJob>> = {};
  for (const job of jobs) {
    if (!latestByTask[job.task]) latestByTask[job.task] = job;
  }
  return latestByTask;
}

/** 该店最近一次扫描（供 status API）。无则 null。 */
export async function getLatestShopScanJob(shop: string): Promise<ShopScanJob | null> {
  try {
    const { resources } = await getContainer()
      .items.query<ShopScanJob>(
        {
          query:
            "SELECT * FROM c WHERE c.shopName = @shop ORDER BY c.createdAt DESC OFFSET 0 LIMIT 1",
          parameters: [{ name: "@shop", value: shop }],
        },
        { partitionKey: shop },
      )
      .fetchAll();
    return resources[0] ?? null;
  } catch {
    return null;
  }
}
