/** 翻译任务 token 消耗类型（TaskTokenUsageLog.taskType）。 */
export const TASK_TOKEN_TYPES = ["manual", "auto"] as const;

export type TaskTokenType = (typeof TASK_TOKEN_TYPES)[number];

export function isTaskTokenType(value: string): value is TaskTokenType {
  return (TASK_TOKEN_TYPES as readonly string[]).includes(value);
}

export const TOKEN_BILLING_FEATURE = "translation" as const;

export type TokenBillingFeature = typeof TOKEN_BILLING_FEATURE;

export function normalizeBillingModelKey(raw: string): string {
  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return normalized || "_default";
}
