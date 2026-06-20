import { getTranslateV4RedisClient, v4ProgressKey } from "./redis.server";
import { getV4Job, listV4Jobs } from "./cosmos.server";
import {
  ACTIVE_V4_STATUSES,
  TERMINAL_V4_STATUSES,
  type StageTimings,
  type TranslationV4Job,
  type TranslationV4Metrics,
  type TranslationV4Status,
} from "./types";

/** 翻译进度里「字段/HTML 片段」级计数的展示名。 */
const TRANSLATION_V4_UNIT_LABEL = "子节点";

export type TranslationV4MergedMetrics = TranslationV4Metrics & {
  currentModule: string | null;
  translateStartedAt: string | null;
  progressUpdatedAt: string | null;
  /** worker 触发暂停后、Cosmos 尚未落盘前的 Redis 信号 */
  pausePending: boolean;
  pauseReason: string | null;
};

/** 合并 Cosmos 持久化 metrics 与 worker 实时写入 Redis 的进度。 */
export function mergeV4JobMetrics(
  job: TranslationV4Job,
  redisProgress: Record<string, string>,
): TranslationV4MergedMetrics {
  return {
    initTotal: Number(redisProgress.initTotal) || job.metrics.initTotal,
    initDone: Number(redisProgress.initDone) || job.metrics.initDone,
    translateTotal:
      Number(redisProgress.translateTotal) || job.metrics.translateTotal,
    translateDone:
      Number(redisProgress.translateDone) || job.metrics.translateDone,
    translateFailed:
      Number(redisProgress.translateFailed) || job.metrics.translateFailed,
    translateFallback: job.metrics.translateFallback,
    translateUnitTotal:
      Number(redisProgress.translateUnitTotal) ||
      job.metrics.translateUnitTotal ||
      0,
    translateUnitDone:
      Number(redisProgress.translateUnitDone) ||
      job.metrics.translateUnitDone ||
      0,
    writebackTotal:
      Number(redisProgress.writebackTotal) || job.metrics.writebackTotal,
    writebackDone:
      Number(redisProgress.writebackDone) || job.metrics.writebackDone,
    writebackFailed:
      Number(redisProgress.writebackFailed) || job.metrics.writebackFailed,
    verifyTotal: Number(redisProgress.verifyTotal) || job.metrics.verifyTotal,
    verifyDone: Number(redisProgress.verifyDone) || job.metrics.verifyDone,
    verifyFailed: Number(redisProgress.verifyFailed) || job.metrics.verifyFailed,
    usedTokens: Number(redisProgress.usedTokens) || job.metrics.usedTokens || 0,
    currentModule: redisProgress.currentModule ?? null,
    translateStartedAt: redisProgress.translateStartedAt ?? null,
    progressUpdatedAt: redisProgress.updatedAt ?? null,
    pausePending: redisProgress.pausePending === "1",
    pauseReason: redisProgress.pauseReason?.trim() || null,
  };
}

/** UI 展示用状态：Redis 已标记暂停但 Cosmos 仍为 TRANSLATING 时提前显示暂停。 */
export function resolveV4DisplayStatus(
  status: TranslationV4Status,
  metrics: Pick<TranslationV4MergedMetrics, "pausePending">,
): TranslationV4Status {
  if (metrics.pausePending && status === "TRANSLATING") return "PAUSED";
  return status;
}

export function translationV4StatusLabel(
  status: TranslationV4Status,
  errorMessage?: string | null,
): string {
  if (status === "PAUSED" && errorMessage?.trim()) {
    return errorMessage.trim();
  }
  const labels: Record<TranslationV4Status, string> = {
    CREATED: "已创建",
    INIT_QUEUED: "等待初始化",
    INITIALIZING: "初始化中",
    INIT_DONE: "初始化完成",
    TRANSLATE_QUEUED: "等待翻译",
    TRANSLATING: "翻译中",
    TRANSLATE_DONE: "翻译完成",
    WRITEBACK_QUEUED: "等待写回",
    WRITING_BACK: "写回 Shopify 中",
    VERIFY_QUEUED: "等待校验",
    VERIFYING: "校验中",
    COMPLETED: "已完成",
    FAILED: "失败",
    PAUSED: "已暂停",
    CANCELLED: "已取消",
  };
  return labels[status] ?? status;
}

function ratioPercent(done: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.min(100, Math.round((done / total) * 100));
}

/** 当前阶段的进度百分比；终态(非完成)返回 null。 */
export function computeTranslationV4ProgressPercent(
  status: TranslationV4Status,
  metrics: TranslationV4Metrics,
  errorStage?: string | null,
): number | null {
  if (status === "COMPLETED") return 100;
  if (TERMINAL_V4_STATUSES.includes(status)) return null;

  if (status === "PAUSED") {
    switch (errorStage) {
      case "WRITEBACK":
        return ratioPercent(metrics.writebackDone, metrics.writebackTotal);
      case "VERIFY":
        return ratioPercent(metrics.verifyDone, metrics.verifyTotal);
      case "TRANSLATE":
      default:
        if (metrics.translateUnitTotal > 0) {
          return ratioPercent(metrics.translateUnitDone, metrics.translateUnitTotal);
        }
        return ratioPercent(metrics.translateDone, metrics.translateTotal);
    }
  }

  if (
    status === "INIT_QUEUED" ||
    status === "INITIALIZING" ||
    status === "INIT_DONE" ||
    status === "CREATED"
  ) {
    return ratioPercent(metrics.initDone, metrics.initTotal);
  }

  if (
    status === "TRANSLATE_QUEUED" ||
    status === "TRANSLATING" ||
    status === "TRANSLATE_DONE"
  ) {
    if (metrics.translateUnitTotal > 0) {
      return ratioPercent(metrics.translateUnitDone, metrics.translateUnitTotal);
    }
    return ratioPercent(metrics.translateDone, metrics.translateTotal);
  }

  if (status === "WRITEBACK_QUEUED" || status === "WRITING_BACK") {
    return ratioPercent(metrics.writebackDone, metrics.writebackTotal);
  }

  if (status === "VERIFY_QUEUED" || status === "VERIFYING") {
    return ratioPercent(metrics.verifyDone, metrics.verifyTotal);
  }

  return null;
}

function formatTranslateDetail(
  metrics: TranslationV4MergedMetrics,
): string | null {
  if (metrics.translateUnitTotal <= 0) return null;
  const unit = `${TRANSLATION_V4_UNIT_LABEL} ${metrics.translateUnitDone.toLocaleString()}/${metrics.translateUnitTotal.toLocaleString()}`;
  if (metrics.translateTotal > 0) {
    return `${unit} · ${metrics.translateDone.toLocaleString()}/${metrics.translateTotal.toLocaleString()}`;
  }
  return unit;
}

/** 当前阶段的一句话摘要文案。 */
export function buildTranslationV4StageSummary(
  status: TranslationV4Status,
  metrics: TranslationV4MergedMetrics,
  errorMessage?: string | null,
  errorStage?: string | null,
): string {
  const label = translationV4StatusLabel(status, errorMessage);

  if (status === "PAUSED") {
    if (errorStage === "TRANSLATE" || !errorStage) {
      const detail = formatTranslateDetail(metrics);
      return [label, detail].filter(Boolean).join(" · ");
    }
    if (errorStage === "WRITEBACK" && metrics.writebackTotal > 0) {
      return `${label} · ${metrics.writebackDone}/${metrics.writebackTotal}`;
    }
    if (errorStage === "VERIFY" && metrics.verifyTotal > 0) {
      return `${label} · ${metrics.verifyDone}/${metrics.verifyTotal}`;
    }
    return label;
  }

  if (
    status === "TRANSLATING" ||
    status === "TRANSLATE_QUEUED" ||
    status === "TRANSLATE_DONE"
  ) {
    const detail = formatTranslateDetail(metrics);
    const modulePart = metrics.currentModule
      ? `当前模块 ${metrics.currentModule}`
      : null;
    return [label, detail, modulePart].filter(Boolean).join(" · ");
  }

  if (
    status === "INITIALIZING" ||
    status === "INIT_QUEUED" ||
    status === "INIT_DONE"
  ) {
    if (metrics.initTotal > 0) return `${label} · ${metrics.initDone}/${metrics.initTotal}`;
    return label;
  }

  if (status === "WRITING_BACK" || status === "WRITEBACK_QUEUED") {
    if (metrics.writebackTotal > 0)
      return `${label} · ${metrics.writebackDone}/${metrics.writebackTotal}`;
    return label;
  }

  if (status === "VERIFYING" || status === "VERIFY_QUEUED") {
    if (metrics.verifyTotal > 0)
      return `${label} · ${metrics.verifyDone}/${metrics.verifyTotal}`;
    return label;
  }

  if (status === "FAILED" && metrics.translateFailed > 0) {
    return `${label} · 翻译失败 ${metrics.translateFailed} 项`;
  }

  return label;
}

export type TranslationJobProgressSummary = {
  taskId: string;
  status: TranslationV4Status;
  statusLabel: string;
  isActive: boolean;
  isTerminal: boolean;
  source: string;
  target: string;
  modules: string[];
  aiModel: string;
  taskSource: string | null;
  createdAt: string;
  updatedAt: string;
  errorMessage: string | null;
  errorStage: string | null;
  stageSummary: string;
  stageTimings: StageTimings | null;
  progressPercent: number | null;
  usedTokens: number;
  metrics: {
    initDone: number;
    initTotal: number;
    translateDone: number;
    translateTotal: number;
    translateUnitDone: number;
    translateUnitTotal: number;
    translateFailed: number;
    writebackDone: number;
    writebackTotal: number;
    writebackFailed: number;
    verifyDone: number;
    verifyTotal: number;
    verifyFailed: number;
    currentModule: string | null;
  };
};

function toProgressSummary(
  job: TranslationV4Job,
  metrics: TranslationV4MergedMetrics,
): TranslationJobProgressSummary {
  const displayStatus = resolveV4DisplayStatus(job.status, metrics);
  const errorMessage = job.errorMessage ?? metrics.pauseReason;
  const errorStage =
    job.errorStage ?? (displayStatus === "PAUSED" ? "TRANSLATE" : null);
  return {
    taskId: job.id,
    status: displayStatus,
    statusLabel: translationV4StatusLabel(displayStatus, errorMessage),
    isActive:
      ACTIVE_V4_STATUSES.includes(job.status) && !metrics.pausePending,
    isTerminal: TERMINAL_V4_STATUSES.includes(job.status),
    source: job.source,
    target: job.target,
    modules: job.modules,
    aiModel: job.aiModel,
    taskSource: job.taskSource ?? null,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    errorMessage,
    errorStage,
    stageSummary: buildTranslationV4StageSummary(
      displayStatus,
      metrics,
      errorMessage,
      errorStage,
    ),
    stageTimings: job.stageTimings ?? null,
    progressPercent: computeTranslationV4ProgressPercent(
      displayStatus,
      metrics,
      errorStage,
    ),
    usedTokens: metrics.usedTokens,
    metrics: {
      initDone: metrics.initDone,
      initTotal: metrics.initTotal,
      translateDone: metrics.translateDone,
      translateTotal: metrics.translateTotal,
      translateUnitDone: metrics.translateUnitDone,
      translateUnitTotal: metrics.translateUnitTotal,
      translateFailed: metrics.translateFailed,
      writebackDone: metrics.writebackDone,
      writebackTotal: metrics.writebackTotal,
      writebackFailed: metrics.writebackFailed,
      verifyDone: metrics.verifyDone,
      verifyTotal: metrics.verifyTotal,
      verifyFailed: metrics.verifyFailed,
      currentModule: metrics.currentModule,
    },
  };
}

async function readRedisProgress(
  taskId: string,
): Promise<Record<string, string>> {
  try {
    return await getTranslateV4RedisClient().hgetall(v4ProgressKey(taskId));
  } catch {
    return {};
  }
}

/** 单个任务的实时进度摘要（Cosmos + Redis 合并）。 */
export async function getV4JobProgressSummary(
  shopName: string,
  taskId: string,
): Promise<TranslationJobProgressSummary | null> {
  const job = await getV4Job(shopName, taskId);
  if (!job) return null;
  const redisProgress = await readRedisProgress(taskId);
  return toProgressSummary(job, mergeV4JobMetrics(job, redisProgress));
}

/**
 * 任务列表摘要。仅做 Cosmos 查询（不逐条读 Redis，避免列表 N 次往返）；
 * 活跃任务的实时细节由前端逐条轮询 task-progress 获取。
 */
export async function listV4JobSummaries(
  shopName: string,
  options?: { limit?: number; taskSource?: string },
): Promise<TranslationJobProgressSummary[]> {
  const limit = Math.min(Math.max(options?.limit ?? 30, 1), 50);
  const jobs = await listV4Jobs(shopName, limit);
  const filtered = options?.taskSource
    ? jobs.filter((j) => (j.taskSource ?? null) === options.taskSource)
    : jobs;
  return filtered.map((job) => toProgressSummary(job, mergeV4JobMetrics(job, {})));
}
