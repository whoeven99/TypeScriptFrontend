import { createHash } from "node:crypto";
import { translateResources, } from "./llmTranslate.js";
/** 与批量任务默认模型一致（Cosmos job.aiModel 未指定时的回退）。 */
export function resolveDefaultAiModel() {
    return (process.env.DEEPSEEK_MODEL?.trim() ||
        process.env.Gpt_Model?.trim() ||
        "deepseek-v4-flash");
}
function fieldDigest(value) {
    return createHash("sha256").update(value).digest("hex").slice(0, 32);
}
function sumUsageTokens(usage) {
    let total = 0;
    for (const row of Object.values(usage)) {
        total += row.tokens ?? 0;
    }
    return total;
}
/**
 * 单字段同步翻译 —— 与自动任务 translateWorker 共用 translateResources 管线：
 * TM 缓存、Google/LLM 路由、HTML/JSON/list 分类、术语表、质量校验与 fallback 重试。
 */
export async function translateSingleField(args) {
    const text = args.text ?? "";
    if (!text.trim()) {
        return { translatedText: text, usedTokens: 0, status: "translated" };
    }
    const source = (args.source ?? "en").trim() || "en";
    const target = args.target.trim();
    const fieldKey = args.fieldKey?.trim() || "value";
    const aiModel = args.aiModel?.trim() || resolveDefaultAiModel();
    console.log("[single] request", {
        shop: args.shop,
        source,
        target,
        fieldKey,
        shopifyType: args.shopifyType,
        aiModel,
        original: text,
        customPrompt: args.customPrompt ?? "",
    });
    const item = {
        key: fieldKey,
        value: text,
        digest: fieldDigest(text),
        shopifyType: args.shopifyType,
    };
    const { resources, usage } = await translateResources([{ resourceId: "__single__", fields: [item] }], source, target, aiModel, args.shop, undefined, undefined, undefined, {
        customPrompt: args.customPrompt,
        // 管理翻译页手动点击：不读缓存、强制 LLM，译后写回 TM。
        skipCacheRead: true,
        skipCacheWrite: false,
        logSingleTranslate: true,
    });
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
//# sourceMappingURL=syncTranslate.js.map