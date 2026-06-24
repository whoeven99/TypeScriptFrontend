import type { TranslationV4Status } from "~/server/translateV4/types";
import type { TranslationJobProgressSummary } from "~/server/translateV4/progress.server";

type StageMetrics = TranslationJobProgressSummary["metrics"];

export function stageOf(
  status: TranslationV4Status,
  errorStage?: string | null,
): 0 | 1 | 2 | 3 | 4 {
  if (status === "PAUSED" || status === "FAILED" || status === "CANCELLED") {
    switch (errorStage) {
      case "WRITEBACK":
        return 2;
      case "VERIFY":
        return 3;
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
  if (["VERIFY_QUEUED", "VERIFYING"].includes(status)) return 3;
  if (status === "COMPLETED") return 4;
  return 0;
}

function ratioPercent(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((done / total) * 100));
}

function taskResourceTotal(m: StageMetrics): number {
  return m.translateTotal || m.initTotal || 0;
}

function translateStageProgress(m: StageMetrics): { done: number; total: number } {
  if (m.translateUnitTotal > 0) {
    return { done: m.translateUnitDone, total: m.translateUnitTotal };
  }
  return { done: m.translateDone, total: taskResourceTotal(m) };
}

export function stageBarPercent(
  idx: number,
  m: StageMetrics,
  jobStatus: TranslationV4Status,
): number {
  if (jobStatus === "COMPLETED") return 100;
  switch (idx) {
    case 0:
      return ratioPercent(m.initDone, m.initTotal);
    case 1: {
      const { done, total } = translateStageProgress(m);
      return ratioPercent(done, total);
    }
    case 2: {
      const total = taskResourceTotal(m);
      return total > 0 ? ratioPercent(m.writebackDone, total) : 0;
    }
    case 3:
      return ratioPercent(m.verifyDone, m.verifyTotal);
    default:
      return 0;
  }
}

export function isStageBarComplete(
  idx: number,
  m: StageMetrics,
  jobStatus: TranslationV4Status,
): boolean {
  if (jobStatus === "COMPLETED") return true;
  switch (idx) {
    case 0:
      return m.initTotal > 0 && m.initDone >= m.initTotal;
    case 1: {
      const { done, total } = translateStageProgress(m);
      return total > 0 && done >= total;
    }
    case 2: {
      const total = taskResourceTotal(m);
      return total > 0 && m.writebackDone >= total;
    }
    case 3:
      return m.verifyTotal > 0 && m.verifyDone >= m.verifyTotal;
    default:
      return false;
  }
}

export function jobDisplayPercent(job: TranslationJobProgressSummary): number {
  if (job.progressPercent != null) return job.progressPercent;
  if (job.status === "COMPLETED") return 100;
  return 0;
}
