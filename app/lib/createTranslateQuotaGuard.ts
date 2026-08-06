/** 客户端建任务 gate：与 evaluateCreateTaskQuotaGuard 对齐，remaining > 0 才放行。 */
export function shouldBlockCreateTaskByCredits(args: {
  remainingCredits: number | null;
  /** @deprecated 已忽略；服务端始终按 remaining 校验。 */
  strictQuotaGate?: boolean;
  /** @deprecated 已忽略。 */
  hasPaidPlan?: boolean;
  /** @deprecated 已忽略。 */
  isInFreePlanTime?: boolean;
}): boolean {
  if (args.remainingCredits == null) return false;
  return args.remainingCredits <= 0;
}
