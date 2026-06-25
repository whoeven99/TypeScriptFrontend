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

export function formatElapsed(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}秒`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  if (m < 60) return rs ? `${m}分${rs}秒` : `${m}分`;
  const h = Math.floor(m / 60);
  return `${h}时${m % 60}分`;
}

export function jobElapsedMs(job: TranslationJobProgressSummary): number | null {
  const freezeAt =
    job.status === "PAUSED" || job.status === "CANCELLED" || job.isTerminal
      ? job.updatedAt
      : null;
  if (!job.createdAt) return null;
  const end = freezeAt ? new Date(freezeAt).getTime() : Date.now();
  const ms = end - new Date(job.createdAt).getTime();
  return Number.isFinite(ms) && ms >= 0 ? ms : null;
}

export function formatJobStartTime(createdAt: string): string | null {
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function jobQuotaCredits(usedTokens: number, multiplier = 1.5): number {
  return usedTokens > 0 ? Math.round(usedTokens * multiplier) : 0;
}
