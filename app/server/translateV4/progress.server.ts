import { getTranslateV4RedisClient, v4ControlKey, v4ProgressKey, type V4ControlAction } from "./redis.server";
import { getV4Job, listV4Jobs } from "./cosmos.server";
import { escalateStuckPauseIfNeeded } from "./pauseReconcile.server";
import {
  escalateStuckTranslatingToWritebackIfNeeded,
  isTranslateCompleteButWritebackPending,
} from "./stageReconcile.server";
import { translateResourcesComplete, writebackResourceTotal } from "./resumeStatus";
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
  /** 控制键仍 pending（API 已写入、worker 尚未消费） */
  controlAction: V4ControlAction | null;
  /** API 写入 pausePending 的时间戳（ms） */
  pauseRequestedAt: string | null;
};

/** 合并 Cosmos 持久化 metrics 与 worker 实时写入 Redis 的进度。 */
export function mergeV4JobMetrics(
  job: TranslationV4Job,
  redisProgress: Record<string, string>,
  controlAction: V4ControlAction | null = null,
): TranslationV4MergedMetrics {
  // 计数器在单个 run 内单调递增；两源取 max 而非「redis || cosmos」，避免某一源瞬时
  // 为 0/空（pause/resume 切换、Redis 与 Cosmos 短暂不一致）时进度回退闪 0。
  const merge = (key: keyof TranslationV4Metrics): number =>
    Math.max(Number(redisProgress[key]) || 0, Number(job.metrics[key]) || 0);
  const translateUnitTotal = merge("translateUnitTotal");
  const translateUnitDoneRaw = merge("translateUnitDone");
  const translateUnitDone =
    translateUnitTotal > 0
      ? Math.min(translateUnitDoneRaw, translateUnitTotal)
      : translateUnitDoneRaw;
  return {
    initTotal: merge("initTotal"),
    initDone: merge("initDone"),
    translateTotal: merge("translateTotal"),
    translateDone: merge("translateDone"),
    translateFailed: merge("translateFailed"),
    translateFallback: job.metrics.translateFallback,
    translateUnitTotal,
    translateUnitDone,
    writebackTotal: merge("writebackTotal"),
    writebackDone: merge("writebackDone"),
    writebackFailed: merge("writebackFailed"),
    verifyTotal: merge("verifyTotal"),
    verifyDone: merge("verifyDone"),
    verifyFailed: merge("verifyFailed"),
    usedTokens: merge("usedTokens"),
    currentModule: redisProgress.currentModule ?? null,
    translateStartedAt: redisProgress.translateStartedAt ?? null,
    progressUpdatedAt: redisProgress.updatedAt ?? null,
    pausePending: redisProgress.pausePending === "1",
    pauseReason: redisProgress.pauseReason?.trim() || null,
    controlAction,
    pauseRequestedAt: redisProgress.pauseRequestedAt ?? null,
  };
}

/**
 * UI 展示用状态：保留真实状态。
 * 注意——以前会把「TRANSLATING + pausePending」提前显示成 PAUSED，但那会让「继续」
 * 按钮提前出现、随后又因 worker 进入写回而消失，造成闪烁。现改为不提前翻转，由
 * `isStopping` 标志单独驱动「正在暂停…」展示（见 toProgressSummary）。
 */
export function resolveV4DisplayStatus(
  status: TranslationV4Status,
): TranslationV4Status {
  return status;
}

export function translationV4StatusLabel(
  status: TranslationV4Status,
  errorMessage?: string | null,
  metrics?: TranslationV4Metrics,
): string {
  if (status === "PAUSED" && errorMessage?.trim()) {
    return errorMessage.trim();
  }
  if (status === "TRANSLATE_QUEUED" && metrics) {
    const started =
      metrics.translateDone > 0 ||
      metrics.translateUnitDone > 0 ||
      metrics.translateTotal > 0;
    if (started) return "排队续译";
  }
  if (status === "WRITEBACK_QUEUED" && metrics && metrics.writebackDone > 0) {
    return "排队写回";
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

function taskResourceTotal(metrics: TranslationV4Metrics): number {
  return metrics.translateTotal || metrics.initTotal || 0;
}

/** 任务已结束时的整体进度：按校验/写回实际成功比例，避免写回仅一半仍显示 100%。 */
function completedJobProgressPercent(metrics: TranslationV4Metrics): number {
  if (metrics.verifyTotal > 0) {
    return ratioPercent(metrics.verifyDone, metrics.verifyTotal) ?? 0;
  }
  const total = taskResourceTotal(metrics);
  if (total > 0) {
    return ratioPercent(metrics.writebackDone, total) ?? 0;
  }
  return 100;
}

/** 当前阶段的进度百分比；终态(非完成)返回 null。 */
export function computeTranslationV4ProgressPercent(
  status: TranslationV4Status,
  metrics: TranslationV4Metrics,
  errorStage?: string | null,
): number | null {
  if (status === "COMPLETED") return completedJobProgressPercent(metrics);
  if (TERMINAL_V4_STATUSES.includes(status)) return null;

  if (status === "PAUSED") {
    switch (errorStage) {
      case "WRITEBACK": {
        const total = taskResourceTotal(metrics);
        return total > 0 ? ratioPercent(metrics.writebackDone, total) : null;
      }
      case "VERIFY":
        return ratioPercent(metrics.verifyDone, metrics.verifyTotal);
      case "TRANSLATE":
      default:
        if (metrics.translateUnitTotal > 0) {
          return ratioPercent(metrics.translateUnitDone, metrics.translateUnitTotal);
        }
        return ratioPercent(metrics.translateDone, taskResourceTotal(metrics));
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
    if (translateResourcesComplete(metrics)) {
      const total = writebackResourceTotal(metrics);
      return total > 0 ? ratioPercent(metrics.writebackDone, total) : 100;
    }
    if (metrics.translateUnitTotal > 0) {
      return ratioPercent(metrics.translateUnitDone, metrics.translateUnitTotal);
    }
    return ratioPercent(metrics.translateDone, taskResourceTotal(metrics));
  }

  if (status === "WRITEBACK_QUEUED" || status === "WRITING_BACK") {
    const total = taskResourceTotal(metrics);
    return total > 0 ? ratioPercent(metrics.writebackDone, total) : null;
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
      const taskTotal = taskResourceTotal(metrics);
      const writebackNote =
        taskTotal > 0 && metrics.writebackDone > 0
          ? metrics.writebackDone >= taskTotal
            ? `写回 ${metrics.writebackDone}/${taskTotal} 已完成`
            : `写回 ${metrics.writebackDone}/${taskTotal}`
          : null;
      return [label, detail, writebackNote].filter(Boolean).join(" · ");
    }
    if (errorStage === "WRITEBACK") {
      const taskTotal = taskResourceTotal(metrics);
      if (taskTotal > 0) {
        return `${label} · ${metrics.writebackDone}/${taskTotal}`;
      }
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
    const taskTotal = taskResourceTotal(metrics);
    if (taskTotal > 0) {
      return `${label} · ${metrics.writebackDone}/${taskTotal}`;
    }
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
  /** 已请求暂停/取消、worker 仍在翻译收尾（等在飞 LLM）的过渡态。 */
  isStopping: boolean;
  /** 是否允许点「继续」（PAUSED/FAILED 且不在收尾中）。 */
  canResume: boolean;
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
  const displayStatus = resolveV4DisplayStatus(job.status);
  const errorStage =
    job.errorStage ?? (displayStatus === "PAUSED" ? "TRANSLATE" : null);
  /**
   * 暂停/取消触发的「先写回已翻译」阶段（仅兼容升级前已在写回中的任务）。
   * 新任务暂停不再走写回，正常写回仍用 WRITING_BACK。
   */
  const writebackPauseLabel =
    (job.status === "WRITEBACK_QUEUED" || job.status === "WRITING_BACK") &&
    job.pauseAfterWriteback
      ? job.pauseAfterWriteback === "cancel"
        ? "已取消，正在写入"
        : "已暂停，正在写入"
      : null;
  const writebackWhileTranslating =
    isTranslateCompleteButWritebackPending(job.status, metrics)
      ? metrics.writebackDone > 0
        ? "写回 Shopify 中"
        : "等待写回"
      : null;
  // 已请求暂停/取消但 worker 仍在翻译收尾（尚未进入写回）的过渡态。
  const isStopping =
    job.status === "TRANSLATING" &&
    (metrics.pausePending ||
      metrics.controlAction === "pause" ||
      metrics.controlAction === "cancel");
  const stoppingLabel =
    metrics.controlAction === "cancel" || metrics.pauseReason === "已取消"
      ? "正在取消…"
      : "正在暂停…";
  // 过渡态不把 pauseReason 当作 errorMessage 暴露——否则顶部「正在暂停…」与底部
  // 「已手动暂停」同时出现，语义重复且像两个矛盾状态。
  const errorMessage =
    job.errorMessage ?? (isStopping ? null : metrics.pauseReason);
  const canResume =
    (job.status === "PAUSED" || job.status === "FAILED") &&
    !isStopping &&
    !metrics.pausePending &&
    !metrics.controlAction;
  return {
    taskId: job.id,
    status: displayStatus,
    statusLabel:
      writebackPauseLabel ??
      writebackWhileTranslating ??
      (isStopping ? stoppingLabel : translationV4StatusLabel(displayStatus, errorMessage, metrics)),
    isStopping,
    canResume,
    isActive:
      ACTIVE_V4_STATUSES.includes(job.status) &&
      !metrics.pausePending &&
      !metrics.controlAction,
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
): Promise<{ progress: Record<string, string>; control: V4ControlAction | null }> {
  try {
    const redis = getTranslateV4RedisClient();
    const [progress, controlRaw] = await Promise.all([
      redis.hgetall(v4ProgressKey(taskId)),
      redis.get(v4ControlKey(taskId)),
    ]);
    const control =
      controlRaw === "pause" || controlRaw === "cancel" ? controlRaw : null;
    return { progress, control };
  } catch {
    return { progress: {}, control: null };
  }
}

/** 列表页批量读取活跃翻译任务的 Redis 进度 + 控制键（避免 refresh 后丢失「正在暂停…」）。 */
async function batchReadRedisForJobs(
  jobs: TranslationV4Job[],
): Promise<Map<string, { progress: Record<string, string>; control: V4ControlAction | null }>> {
  const activeIds = jobs
    .filter((j) => j.status === "TRANSLATING" || j.status === "TRANSLATE_QUEUED")
    .map((j) => j.id);
  const out = new Map<
    string,
    { progress: Record<string, string>; control: V4ControlAction | null }
  >();
  if (!activeIds.length) return out;

  try {
    const redis = getTranslateV4RedisClient();
    const pipeline = redis.pipeline();
    for (const id of activeIds) {
      pipeline.hgetall(v4ProgressKey(id));
      pipeline.get(v4ControlKey(id));
    }
    const results = await pipeline.exec();
    if (!results) return out;

    for (let i = 0; i < activeIds.length; i++) {
      const progressResult = results[i * 2];
      const controlResult = results[i * 2 + 1];
      const progress =
        progressResult?.[1] && typeof progressResult[1] === "object"
          ? (progressResult[1] as Record<string, string>)
          : {};
      const controlRaw = controlResult?.[1];
      const control =
        controlRaw === "pause" || controlRaw === "cancel" ? controlRaw : null;
      out.set(activeIds[i], { progress, control });
    }
  } catch {
    // non-fatal — 列表仍可用 Cosmos 快照
  }
  return out;
}

/** 单个任务的实时进度摘要（Cosmos + Redis 合并）。 */
export async function getV4JobProgressSummary(
  shopName: string,
  taskId: string,
): Promise<TranslationJobProgressSummary | null> {
  let job = await getV4Job(shopName, taskId);
  if (!job) return null;
  const { progress, control } = await readRedisProgress(taskId);
  const metrics = mergeV4JobMetrics(job, progress, control);
  const escalated = await escalateStuckPauseIfNeeded(shopName, job, metrics);
  if (escalated) {
    job = escalated;
    return toProgressSummary(job, mergeV4JobMetrics(job, {}, null));
  }
  const writebackEscalated = await escalateStuckTranslatingToWritebackIfNeeded(
    shopName,
    job,
    metrics,
  );
  if (writebackEscalated) {
    job = writebackEscalated;
    return toProgressSummary(job, mergeV4JobMetrics(job, {}, null));
  }
  return toProgressSummary(job, metrics);
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
  const redisByTaskId = await batchReadRedisForJobs(filtered);
  const summaries: TranslationJobProgressSummary[] = [];
  for (const job of filtered) {
    const redis = redisByTaskId.get(job.id);
    const metrics = mergeV4JobMetrics(
      job,
      redis?.progress ?? {},
      redis?.control ?? null,
    );
    const escalated = await escalateStuckPauseIfNeeded(shopName, job, metrics);
    const writebackEscalated =
      escalated ??
      (await escalateStuckTranslatingToWritebackIfNeeded(shopName, job, metrics));
    const finalJob = writebackEscalated ?? escalated ?? job;
    summaries.push(
      toProgressSummary(
        finalJob,
        writebackEscalated || escalated
          ? mergeV4JobMetrics(finalJob, {}, null)
          : metrics,
      ),
    );
  }
  return summaries;
}
