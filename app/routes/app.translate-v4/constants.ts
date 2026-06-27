import {
  DEFAULT_V2_MODULE_KEYS,
  V2_MODULE_LABELS,
  V2_MODULE_OPTION_KEYS,
  V4_MODULE_LABELS,
  defaultManualV4Modules,
} from "~/server/translateV4/moduleCatalog";

/** v4 Shopify resource module 展示名。 */
export const MODULE_LABELS: Record<string, string> = V4_MODULE_LABELS;

/** 创建任务默认勾选的 v2 模块 key（对齐 v2 translateSettings3）。 */
export const DEFAULT_MODULE_KEYS = [...DEFAULT_V2_MODULE_KEYS];

/** 创建任务时默认展开的 v4 modules（供 API / 快捷创建使用）。 */
export const DEFAULT_MODULES = defaultManualV4Modules();

/** 任务消耗积分 = usedTokens × 此系数（与 Worker QUOTA_TOKEN_MULTIPLIER 对齐，1 = 与 API tokens 1:1）。 */
export const QUOTA_TOKEN_MULTIPLIER = 1;

export const AI_MODEL_OPTIONS = [
  { value: "gpt-4.1-nano", label: "GPT-4.1 nano（推荐）" },
  { value: "gpt-4.1-mini", label: "GPT-4.1 mini" },
  { value: "deepseek-v4-flash", label: "deepseek-v4-flash" },
  { value: "deepseek-v4-pro", label: "deepseek-v4-pro" },
];

/** 默认选中的翻译模型。 */
export const DEFAULT_AI_MODEL = "gpt-4.1-nano";

/** 创建任务卡片 — v2 对齐的模块选项（不含 handle）。 */
export const CREATE_TASK_MODULE_OPTIONS = [...V2_MODULE_OPTION_KEYS];

/** v2 模块 key 展示名。 */
export const CREATE_TASK_MODULE_LABELS: Record<string, string> = V2_MODULE_LABELS;
