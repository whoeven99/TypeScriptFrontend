/** 与 TSF app/server/translateV4/metricsUtils.ts 保持同一算法。 */
export type TranslateProgressMetrics = {
  translateDone: number;
  translateTotal: number;
  translateUnitDone: number;
  translateUnitTotal: number;
  initTotal?: number;
  writebackDone?: number;
};

function ratioPercent(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((done / total) * 100));
}

export function taskResourceTotal(metrics: TranslateProgressMetrics): number {
  return metrics.translateTotal || metrics.initTotal || 0;
}

/**
 * PAUSED 任务进度百分比，对齐 app/server/translateV4/progress.server.ts
 * computeTranslationV4ProgressPercent（TRANSLATE / WRITEBACK 分支）。
 */
export function computePausedJobProgressPercent(
  metrics: TranslateProgressMetrics,
  errorStage?: string | null,
): number {
  switch (errorStage) {
    case "WRITEBACK": {
      const total = taskResourceTotal(metrics);
      return total > 0 ? ratioPercent(metrics.writebackDone ?? 0, total) : 0;
    }
    case "TRANSLATE":
    default:
      if (metrics.translateUnitTotal > 0) {
        return ratioPercent(
          capTranslateUnitsByResources(metrics),
          metrics.translateUnitTotal,
        );
      }
      return ratioPercent(metrics.translateDone, taskResourceTotal(metrics));
  }
}

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

export function syncTranslateUnitDone(
  metrics: TranslateProgressMetrics,
): number {
  return capTranslateUnitsByResources(metrics);
}

/** 与 TSF metricsUtils.reconcileTranslateUnitMetrics 同一算法。 */
export function reconcileTranslateUnitMetrics(
  metrics: TranslateProgressMetrics,
): { translateUnitDone: number; translateUnitTotal: number } {
  const done = capTranslateUnitsByResources(metrics);
  let total = metrics.translateUnitTotal ?? 0;
  const resourceTotal = metrics.translateTotal ?? 0;
  const resourceDone = metrics.translateDone ?? 0;
  if (resourceTotal > 0 && resourceDone >= resourceTotal) {
    if (done > 0) total = done;
  } else if (done > total) {
    total = done;
  }
  return { translateUnitDone: done, translateUnitTotal: total };
}

/** Worker 落库：优先 blob 重算节点，资源全完成时分母=分子。 */
export function finalizeTranslateUnitMetricsFromBlob(
  translateDone: number,
  translateTotal: number,
  translateUnitDone: number,
  translateUnitTotal: number,
  unitsFromBlob: number,
): { translateUnitDone: number; translateUnitTotal: number } {
  const unitDoneSource = unitsFromBlob > 0 ? unitsFromBlob : translateUnitDone;
  const reconciled = reconcileTranslateUnitMetrics({
    translateDone,
    translateTotal,
    translateUnitDone: unitDoneSource,
    translateUnitTotal,
  });
  return reconciled;
}
