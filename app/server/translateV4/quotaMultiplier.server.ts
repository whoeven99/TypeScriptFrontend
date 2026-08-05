/**
 * LLM token × 系数 = 扣减额度 / 任务 usedTokens（与 worker tsfQuota 对齐）。
 *
 * - DeepSeek（含默认空模型 / 非 GPT·Google）：默认 1，可用 DEEPSEEK_QUOTA_TOKEN_MULTIPLIER 覆盖
 * - GPT / Google 等其它：默认 1.5，可用 QUOTA_TOKEN_MULTIPLIER 覆盖
 */

export function isDeepSeekQuotaModel(aiModel?: string | null): boolean {
  const m = (aiModel ?? "").trim().toLowerCase();
  if (!m) return true;
  if (m === "google-translate" || m.startsWith("google")) return false;
  if (/^gpt[-.]/.test(m)) return false;
  // deepseek-* 以及历史默认引擎名
  return true;
}

export function quotaTokenMultiplier(aiModel?: string | null): number {
  if (isDeepSeekQuotaModel(aiModel)) {
    const v = Number(process.env.DEEPSEEK_QUOTA_TOKEN_MULTIPLIER);
    return Number.isFinite(v) && v > 0 ? v : 1;
  }
  const v = Number(process.env.QUOTA_TOKEN_MULTIPLIER);
  return Number.isFinite(v) && v > 0 ? v : 1.5;
}

/** 将 LLM 原始 token 转为计费积分（向上取整，与 worker 一致）。 */
export function llmTokensToQuotaCredits(
  rawTokens: number,
  aiModel?: string | null,
): number {
  if (rawTokens <= 0) return 0;
  return Math.ceil(rawTokens * quotaTokenMultiplier(aiModel));
}
