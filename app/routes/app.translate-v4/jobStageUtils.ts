import type { TranslationV4Status } from "~/server/translateV4/types";
import type { TranslationJobProgressSummary } from "~/server/translateV4/progress.server";
import {
  capTranslateUnitsByResources,
  isTranslateResourceComplete,
  translateResourceTotal,
} from "~/server/translateV4/metricsUtils";

type StageMetrics = TranslationJobProgressSummary["metrics"];


export type VisibleStageIndex = 0 | 1 | 2;

export function stageOf(
  status: TranslationV4Status,
  errorStage?: string | null,
  metrics?: StageMetrics,
): VisibleStageIndex {
  if (
    metrics &&
    (status === "TRANSLATING" || status === "TRANSLATE_QUEUED") &&
    isStageBarComplete(1, metrics, status)
  ) {
    return 2;
  }
  if (status === "PAUSED" || status === "FAILED" || status === "CANCELLED") {
    switch (errorStage) {
      case "WRITEBACK":
        return 2;
      case "VERIFY":
        return 2;
      case "TRANSLATE":
      default:
        return 1;
    }
  }
  if (["INIT_QUEUED", "INITIALIZING"].includes(status)) return 0;
  if (status === "INIT_DONE") return 1;
  if (["TRANSLATE_QUEUED", "TRANSLATING"].includes(status)) return 1;
  if (status === "TRANSLATE_DONE") return 2;
  if (["WRITEBACK_QUEUED", "WRITING_BACK"].includes(status)) return 2;
  if (["VERIFY_QUEUED", "VERIFYING"].includes(status)) return 2;
  if (status === "COMPLETED") return 2;
  return 0;
}

/** 列表迷你进度条使用的阶段索引（仅 INIT / TRANSLATE / WRITEBACK）。 */
export function visibleStageIndex(
  status: TranslationV4Status,
  errorStage?: string | null,
  metrics?: StageMetrics,
): VisibleStageIndex {
  return stageOf(status, errorStage, metrics) as VisibleStageIndex;
}

function isVerifyHiddenComplete(status: TranslationV4Status): boolean {
  return status === "COMPLETED";
}

export function miniStageSegmentState(
  idx: VisibleStageIndex,
  job: TranslationJobProgressSummary,
): { percent: number; complete: boolean; active: boolean } {
  const { status, metrics, errorStage, isTerminal, isStopping } = job;

  if (isVerifyHiddenComplete(status)) {
    return { percent: 100, complete: true, active: false };
  }

  const complete = isStageBarComplete(idx, metrics, status, job.modules);
  const percent = complete
    ? 100
    : stageBarPercent(idx, metrics, status, job.modules);
  const activeIdx = visibleStageIndex(status, errorStage, metrics);
  const active =
    !isTerminal &&
    !isStopping &&
    status !== "PAUSED" &&
    idx === activeIdx &&
    !complete;

  return { percent, complete, active };
}

function ratioPercent(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((done / total) * 100));
}

function taskResourceTotal(m: StageMetrics): number {
  return translateResourceTotal(m);
}

function cappedUnitDone(m: StageMetrics): number {
  return capTranslateUnitsByResources(m);
}

function translateStageProgress(m: StageMetrics): { done: number; total: number } {
  const resourceTotal = taskResourceTotal(m);
  if (resourceTotal > 0) {
    return { done: m.translateDone, total: resourceTotal };
  }
  if (m.translateUnitTotal > 0) {
    return { done: cappedUnitDone(m), total: m.translateUnitTotal };
  }
  return { done: m.translateDone, total: 0 };
}

/** Init bar uses selected-module x/N when available; falls back to item counts. */
export function initModuleProgress(
  m: StageMetrics,
  jobModules?: string[],
): { done: number; total: number } {
  const total =
    m.initModulesTotal > 0
      ? m.initModulesTotal
      : Array.isArray(jobModules)
        ? jobModules.length
        : 0;
  if (total <= 0) {
    return { done: m.initDone, total: m.initTotal };
  }
  return {
    done: Math.min(m.initModulesDone, total),
    total,
  };
}

export function stageBarPercent(
  idx: number,
  m: StageMetrics,
  _jobStatus: TranslationV4Status,
  jobModules?: string[],
): number {
  switch (idx) {
    case 0: {
      const { done, total } = initModuleProgress(m, jobModules);
      if (total > 0 && (m.initModulesTotal > 0 || (jobModules?.length ?? 0) > 0)) {
        return ratioPercent(done, total);
      }
      return ratioPercent(m.initDone, m.initTotal);
    }
    case 1: {
      const { done, total } = translateStageProgress(m);
      return ratioPercent(done, total);
    }
    case 2: {
      const total = taskResourceTotal(m);
      return total > 0 ? ratioPercent(m.writebackDone, total) : 0;
    }
    default:
      return 0;
  }
}

export function isStageBarComplete(
  idx: number,
  m: StageMetrics,
  jobStatus: TranslationV4Status,
  jobModules?: string[],
): boolean {
  switch (idx) {
    case 0: {
      // While still initializing, never mark the bar complete (even at x===N
      // during writing_manifest). After leaving init, prefer module x/N.
      if (jobStatus === "INIT_QUEUED" || jobStatus === "INITIALIZING") {
        return false;
      }
      const { done, total } = initModuleProgress(m, jobModules);
      if (total > 0 && (m.initModulesTotal > 0 || (jobModules?.length ?? 0) > 0)) {
        return done >= total;
      }
      return m.initTotal > 0 && m.initDone >= m.initTotal;
    }
    case 1: {
      if (isTranslateResourceComplete(m)) return true;
      const resourceTotal = taskResourceTotal(m);
      if (resourceTotal > 0) return false;
      const { done, total } = translateStageProgress(m);
      return total > 0 && done >= total;
    }
    case 2: {
      const total = taskResourceTotal(m);
      return total > 0 && m.writebackDone >= total;
    }
    default:
      return false;
  }
}

export function jobDisplayPercent(job: TranslationJobProgressSummary): number {
  return job.progressPercent ?? 0;
}


export function jobElapsedMs(
  job: TranslationJobProgressSummary,
  nowMs = Date.now(),
): number | null {
  const freezeAt =
    job.status === "PAUSED" || job.status === "CANCELLED" || job.isTerminal
      ? job.updatedAt
      : null;
  if (!job.createdAt) return null;
  const end = freezeAt ? new Date(freezeAt).getTime() : nowMs;
  const ms = end - new Date(job.createdAt).getTime();
  return Number.isFinite(ms) && ms >= 0 ? ms : null;
}


export function jobQuotaCredits(usedTokens: number, multiplier = 1): number {
  return usedTokens > 0 ? Math.round(usedTokens * multiplier) : 0;
}
