/** Worker / 协调器内部原因，不向商户展示。 */
const INTERNAL_V4_USER_MESSAGES = new Set([
  "任务已被其它 worker 接管",
  "任务已不存在",
  "任务已重新排队",
  "已暂停",
]);

/** 过滤内部运维文案；商户可见的暂停原因（额度不足等）原样返回。 */
export function sanitizeV4UserErrorMessage(
  message: string | null | undefined,
): string | null {
  const trimmed = message?.trim();
  if (!trimmed) return null;
  if (INTERNAL_V4_USER_MESSAGES.has(trimmed)) return null;
  if (/worker\s*接管/i.test(trimmed)) return null;
  return trimmed;
}

/** 暂停类文案是否适合作为 PAUSED 的 errorMessage 落盘。 */
export function isUserFacingV4PauseReason(reason: string): boolean {
  return sanitizeV4UserErrorMessage(reason) !== null;
}
