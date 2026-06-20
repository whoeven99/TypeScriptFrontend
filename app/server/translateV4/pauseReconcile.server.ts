import { updateV4Job } from "./cosmos.server";
import {
  clearV4Control,
  clearV4PausePending,
  getTranslateV4RedisClient,
  V4_HINT_KEYS,
} from "./redis.server";
import type { TranslationV4MergedMetrics } from "./progress.server";
import type { TranslationV4Job } from "./types";

/** worker 未能在该时长内收尾暂停 → TSF 直接排队写回已 checkpoint 的译文。 */
const STUCK_PAUSE_ESCALATE_MS = 120_000;

/**
 * 暂停后 worker 应进入 WRITEBACK_QUEUED，但若翻译 worker 卡在 LLM 长尾，
 * 控制键会一直 pending。超时后由 TSF 代为推进到写回队列。
 */
export async function escalateStuckPauseIfNeeded(
  shopName: string,
  job: TranslationV4Job,
  metrics: TranslationV4MergedMetrics,
): Promise<TranslationV4Job | null> {
  if (job.status !== "TRANSLATING") return null;

  const pauseRequested =
    metrics.pausePending || metrics.controlAction === "pause";
  if (!pauseRequested) return null;

  const translateDone = Math.max(
    metrics.translateDone,
    Number(job.metrics.translateDone) || 0,
  );
  if (translateDone <= 0) return null;

  const requestedAt =
    Number(metrics.pauseRequestedAt) ||
    // 兼容升级前已写入 pausePending、但没有 pauseRequestedAt 的任务
    (metrics.controlAction === "pause" || metrics.pausePending
      ? Date.now() - STUCK_PAUSE_ESCALATE_MS - 1
      : 0);
  if (!requestedAt || Date.now() - requestedAt < STUCK_PAUSE_ESCALATE_MS) {
    return null;
  }

  const updated = await updateV4Job(shopName, job.id, {
    status: "WRITEBACK_QUEUED",
    claimedBy: null,
    pauseAfterWriteback: "pause",
    errorMessage: metrics.pauseReason ?? "已手动暂停",
    errorStage: null,
    metrics: {
      ...job.metrics,
      initTotal: metrics.initTotal,
      initDone: metrics.initDone,
      translateTotal: metrics.translateTotal,
      translateDone,
      translateFailed: metrics.translateFailed,
      translateFallback: metrics.translateFallback,
      translateUnitTotal: metrics.translateUnitTotal,
      translateUnitDone: metrics.translateUnitDone,
      writebackTotal: translateDone,
      usedTokens: metrics.usedTokens,
    },
  });
  if (!updated) return null;

  await clearV4Control(job.id);
  await clearV4PausePending(job.id);

  try {
    await getTranslateV4RedisClient().lpush(
      V4_HINT_KEYS.writeback,
      JSON.stringify({ taskId: job.id, shopName }),
    );
  } catch {
    // non-fatal
  }

  console.log(
    `[translateV4] escalated stuck pause → WRITEBACK_QUEUED task=${job.id} translateDone=${translateDone}`,
  );
  return updated;
}
