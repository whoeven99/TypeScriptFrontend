/** LLM token × 此系数 = 扣减 Spring 额度 / 任务 usedTokens（与 worker QUOTA_TOKEN_MULTIPLIER 对齐）。 */
export function quotaTokenMultiplier(): number {
  const v = Number(process.env.QUOTA_TOKEN_MULTIPLIER);
  return Number.isFinite(v) && v > 0 ? v : 1.5;
}

/** 将 LLM 原始 token 转为计费积分（向上取整，与 worker 一致）。 */
export function llmTokensToQuotaCredits(rawTokens: number): number {
  if (rawTokens <= 0) return 0;
  return Math.ceil(rawTokens * quotaTokenMultiplier());
}
