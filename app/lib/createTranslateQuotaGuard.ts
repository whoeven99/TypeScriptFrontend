/** 客户端建任务 gate：积分为 0 时是否应拦截（与 evaluateCreateTaskQuotaGuard 对齐）。 */
export function shouldBlockCreateTaskByCredits(args: {
  remainingCredits: number | null;
  /** tsf 新账本用户为 true（来自 /api/translate-v4/quota）。 */
  strictQuotaGate: boolean;
  hasPaidPlan: boolean;
  isInFreePlanTime: boolean;
}): boolean {
  if (args.remainingCredits == null) return false;
  if (args.remainingCredits > 0) return false;
  if (args.strictQuotaGate) return true;
  return !args.hasPaidPlan && !args.isInFreePlanTime;
}
