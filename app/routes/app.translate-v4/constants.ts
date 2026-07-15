import {
  DEFAULT_V2_MODULE_KEYS,
  V2_MODULE_LABELS,
  V2_MODULE_OPTION_KEYS,
  V4_MODULE_LABELS,
} from "~/server/translateV4/moduleCatalog";

/** v4 Shopify resource module 展示名。 */
export const MODULE_LABELS: Record<string, string> = V4_MODULE_LABELS;

/** 创建任务默认勾选的 v2 模块 key（对齐 v2 translateSettings3）。 */
export const DEFAULT_MODULE_KEYS = [...DEFAULT_V2_MODULE_KEYS];


/**
 * Worker 写入的 usedTokens 已含 QUOTA_TOKEN_MULTIPLIER（默认 1.5），
 * 前端展示积分时此处保持 1，避免重复乘系数。
 */
export const QUOTA_TOKEN_MULTIPLIER = 1;

export const AI_MODEL_OPTIONS = [
  { value: "gpt-4.1-nano", label: "GPT-4.1 nano（推荐）" },
  { value: "gpt-4.1-mini", label: "GPT-4.1 mini" },
  { value: "gpt-5.5", label: "gpt-5.5" },
  { value: "deepseek-v4-flash", label: "deepseek-v4-flash" },
  { value: "deepseek-v4-pro", label: "deepseek-v4-pro" },
  { value: "kimi-k2.6", label: "kimi-k2.6" },
  { value: "gemini-2.5-flash", label: "gemini-2.5-flash" },
];

/** 默认选中的翻译模型。 */
export const DEFAULT_AI_MODEL = "gpt-4.1-nano";

/** 创建任务卡片 — v2 对齐的模块选项（不含 handle）。 */
export const CREATE_TASK_MODULE_OPTIONS = [...V2_MODULE_OPTION_KEYS];

/** v2 模块 key 展示名。 */
export const CREATE_TASK_MODULE_LABELS: Record<string, string> = V2_MODULE_LABELS;
