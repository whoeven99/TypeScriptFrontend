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
