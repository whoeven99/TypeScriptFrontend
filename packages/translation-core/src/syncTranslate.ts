import { createHash } from "node:crypto";
import {
  translateResources,
  type EngineUsage,
  type TranslateItem,
} from "./llmTranslate.js";

/** 与批量任务默认模型一致（Cosmos job.aiModel 未指定时的回退）。 */
export function resolveDefaultAiModel(): string {
  return (
    process.env.DEEPSEEK_MODEL?.trim() ||
    process.env.Gpt_Model?.trim() ||
    "deepseek-v4-flash"
  );
}

function fieldDigest(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

function sumUsageTokens(usage: EngineUsage): number {
  let total = 0;
  for (const row of Object.values(usage)) {
    total += row.tokens ?? 0;
  }
  return total;
}

export type TranslateSingleFieldArgs = {
  shop: string;
  target: string;
  text: string;
  /** 源语言 locale；影响 alreadyInTarget / TM value cache。默认 en。 */
  source?: string;
  aiModel?: string;
  /** 字段 key，影响 handle 路由与 classifyField。默认 value。 */
  fieldKey?: string;
  shopifyType?: string;
  /** 用户自定义提示词：描述本次翻译方向/风格，注入 system prompt。 */
  customPrompt?: string;
};

export type TranslateSingleFieldResult = {
  translatedText: string;
  /** LLM API 原始 token 合计（未乘 QUOTA_TOKEN_MULTIPLIER）。 */
  usedTokens: number;
  status: "translated" | "fallback";
};

/**
 * 单字段同步翻译 —— 与自动任务 translateWorker 共用 translateResources 管线：
 * TM 缓存、Google/LLM 路由、HTML/JSON/list 分类、术语表、质量校验与 fallback 重试。
 */
export async function translateSingleField(
  args: TranslateSingleFieldArgs,
): Promise<TranslateSingleFieldResult> {
  const text = args.text ?? "";
  if (!text.trim()) {
    return { translatedText: text, usedTokens: 0, status: "translated" };
  }

  const source = (args.source ?? "en").trim() || "en";
  const target = args.target.trim();
  const fieldKey = args.fieldKey?.trim() || "value";
  const aiModel = args.aiModel?.trim() || resolveDefaultAiModel();

  const item: TranslateItem = {
    key: fieldKey,
    value: text,
    digest: fieldDigest(text),
    shopifyType: args.shopifyType,
  };

  const { resources, usage } = await translateResources(
    [{ resourceId: "__single__", fields: [item] }],
    source,
    target,
    aiModel,
    args.shop,
    undefined,
    undefined,
    undefined,
    {
      customPrompt: args.customPrompt,
      // 管理翻译页手动点击：不读缓存、强制 LLM，译后写回 TM。
      skipCacheRead: true,
      skipCacheWrite: false,
      logSingleTranslate: true,
    },
  );

  const result = resources[0]?.results[0];
  const translatedText = result?.translatedValue ?? text;
  const status = result?.status ?? "fallback";
  const usedTokens = sumUsageTokens(usage);

  // 管理页单条：质量校验/拼装后的最终译文（完整不截断）。
  console.log("[single] result", {
    shop: args.shop,
    source,
    target,
    fieldKey,
    shopifyType: args.shopifyType,
    aiModel,
    original: text,
    translated: translatedText,
    status,
    prompt: args.customPrompt ?? "",
    usedTokens,
  });

  return {
    translatedText,
    usedTokens,
    status,
  };
}
