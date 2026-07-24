import type { TranslationV4Status } from "./types";

const INIT_RUNNING_STATUSES: ReadonlySet<TranslationV4Status> = new Set([
  "CREATED",
  "INIT_QUEUED",
  "INITIALIZING",
]);

const INIT_PAST_STATUSES: ReadonlySet<TranslationV4Status> = new Set([
  "INIT_DONE",
  "TRANSLATE_QUEUED",
  "TRANSLATING",
  "TRANSLATE_DONE",
  "WRITEBACK_QUEUED",
  "WRITING_BACK",
  "VERIFY_QUEUED",
  "VERIFYING",
  "COMPLETED",
]);

/** Init x/N bar inputs (Redis module counters + Cosmos item counts). */
export type InitModuleProgressMetrics = {
  initModulesTotal: number;
  initModulesDone: number;
  initCompletedModules?: ReadonlyArray<{ module: string; items: number }>;
  initDone: number;
  initTotal: number;
  translateTotal: number;
  translateDone: number;
  writebackDone: number;
};

/**
 * Resolve init stage x/N for UI. Module counters live only in Redis; when they are
 * missing the UI used job.modules.length as total but left done at 0 → "0/N".
 */
export function resolveInitModuleProgress(
  metrics: InitModuleProgressMetrics,
  jobModules: string[] | undefined,
  jobStatus: TranslationV4Status,
): { done: number; total: number } {
  const moduleCount = Array.isArray(jobModules) ? jobModules.length : 0;
  const total =
    metrics.initModulesTotal > 0
      ? metrics.initModulesTotal
      : moduleCount > 0
        ? moduleCount
        : 0;

  if (total <= 0) {
    return { done: metrics.initDone, total: metrics.initTotal };
  }

  let done = Math.min(
    Math.max(
      metrics.initModulesDone,
      metrics.initCompletedModules?.length ?? 0,
    ),
    total,
  );

  if (done >= total || INIT_RUNNING_STATUSES.has(jobStatus)) {
    return { done, total };
  }

  const initItemsComplete =
    metrics.initTotal > 0 && metrics.initDone >= metrics.initTotal;
  const downstreamStarted =
    metrics.translateTotal > 0 ||
    metrics.translateDone > 0 ||
    metrics.writebackDone > 0;

  if (
    INIT_PAST_STATUSES.has(jobStatus) ||
    initItemsComplete ||
    downstreamStarted
  ) {
    return { done: total, total };
  }

  return { done, total };
}

/** 翻译 metrics 子集（Cosmos / Redis 合并后均可传入）。 */
export type TranslateProgressMetrics = {
  translateDone: number;
  translateTotal: number;
  translateUnitDone: number;
  translateUnitTotal: number;
};

/**
 * 节点进度不能超前于资源进度：续跑时 Redis 可能残留 inflated translateUnitDone，
 * 导致「764/1845 资源」却显示「21017/21017 节点 ✓」。
 */
export function capTranslateUnitsByResources(
  metrics: TranslateProgressMetrics,
): number {
  const unitTotal = metrics.translateUnitTotal ?? 0;
  const unitDone = metrics.translateUnitDone ?? 0;
  if (unitTotal <= 0) return unitDone;

  const resourceTotal = metrics.translateTotal ?? 0;
  const resourceDone = metrics.translateDone ?? 0;

  if (resourceTotal <= 0 || resourceDone >= resourceTotal) {
    return Math.min(unitDone, unitTotal);
  }

  const maxByResources = Math.ceil((resourceDone / resourceTotal) * unitTotal);
  return Math.min(unitDone, unitTotal, maxByResources);
}

export function translateResourceTotal(
  metrics: Pick<TranslateProgressMetrics, "translateTotal"> & {
    initTotal?: number;
  },
): number {
  return metrics.translateTotal || metrics.initTotal || 0;
}

/** 翻译阶段是否已覆盖全部资源（节点数不作为完成依据）。 */
export function isTranslateResourceComplete(
  metrics: TranslateProgressMetrics & { initTotal?: number },
): boolean {
  const total = translateResourceTotal(metrics);
  return total > 0 && metrics.translateDone >= total;
}

/**
 * 节点进度展示/落库对齐：资源全部完成后，分母必须与最终分子一致。
 * INIT 预估值在 dedup / 跳过路径下常大于运行时 onProgress 累计值。
 */
export function reconcileTranslateUnitMetrics(
  metrics: TranslateProgressMetrics & { initTotal?: number },
): { translateUnitDone: number; translateUnitTotal: number } {
  const done = capTranslateUnitsByResources(metrics);
  let total = metrics.translateUnitTotal ?? 0;
  if (isTranslateResourceComplete(metrics)) {
    if (done > 0) total = done;
  } else if (done > total) {
    total = done;
  }
  return { translateUnitDone: done, translateUnitTotal: total };
}
