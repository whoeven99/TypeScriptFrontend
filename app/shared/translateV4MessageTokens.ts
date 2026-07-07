export const V4_MESSAGE_MANUAL_PAUSE = "manually paused";
export const V4_MESSAGE_CANCELLED = "cancelled";
export const V4_MESSAGE_TASK_CLAIMED = "task claimed by another worker";
export const V4_MESSAGE_TASK_NOT_FOUND = "task not found";
export const V4_MESSAGE_TASK_REQUEUED = "task requeued";

const LEGACY_MANUAL_PAUSE_MESSAGES = ["已手动暂停", V4_MESSAGE_MANUAL_PAUSE, "v4.status.paused"];
const LEGACY_CANCELLED_MESSAGES = ["已取消", V4_MESSAGE_CANCELLED, "v4.status.cancelled"];

export const V4_INTERNAL_USER_MESSAGES = new Set([
  "任务已被其它 worker 接管",
  "任务已不存在",
  "任务已重新排队",
  V4_MESSAGE_TASK_CLAIMED,
  V4_MESSAGE_TASK_NOT_FOUND,
  V4_MESSAGE_TASK_REQUEUED,
  "已暂停",
  "paused",
]);

export function normalizeV4MessageToken(message: string | null | undefined): string {
  return message?.trim().toLowerCase() || "";
}

export function isV4ManualPauseMessage(message: string | null | undefined): boolean {
  const normalized = normalizeV4MessageToken(message);
  return LEGACY_MANUAL_PAUSE_MESSAGES.includes(normalized);
}

export function isV4CancelledMessage(message: string | null | undefined): boolean {
  const normalized = normalizeV4MessageToken(message);
  return LEGACY_CANCELLED_MESSAGES.includes(normalized);
}
