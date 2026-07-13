/** 与批量任务默认模型一致（Cosmos job.aiModel 未指定时的回退）。 */
export declare function resolveDefaultAiModel(): string;
export type TranslateSingleFieldArgs = {
    shop: string;
    target: string;
    text: string;
    /** 源语言 locale；影响 alreadyInTarget / TM value cache。默认 en。 */
    source?: string;
    aiModel?: string;
    /** 字段 key，影响 handle 路由与 classifyField。默认 value。 */
    fieldKey?: string;
    /** 资源模块，用于场景路由（如 PRODUCT / MENU / ONLINE_STORE_THEME_JSON_TEMPLATE）。 */
    module?: string;
    resourceId?: string;
    shopifyType?: string;
    /** 用户自定义提示词：描述本次翻译方向/风格，注入 system prompt。 */
    customPrompt?: string;
    shopContext?: {
        industry?: string | null;
        subIndustry?: string | null;
        brandTone?: string | null;
        brandPositioning?: string | null;
        description?: string | null;
        keywords?: string[] | null;
        sellingPoints?: string[] | null;
        priceRange?: string | null;
    } | null;
    terminology?: {
        brandTerms?: string[] | null;
        doNotTranslateTerms?: string[] | null;
        preferredTerms?: Array<{
            source: string;
            note?: string | null;
        }> | null;
        seoTerms?: string[] | null;
    } | null;
    market?: {
        publishedLocales?: string[] | null;
        marketNotes?: string[] | null;
        currencyContext?: string[] | null;
    } | null;
    themeSceneProfile?: {
        sceneHints?: Array<{
            module: string;
            keyPattern: string;
            scene: string;
            role?: string | null;
            confidence?: number | null;
            tonePreference?: string | null;
            creativity?: string | null;
        }> | null;
    } | null;
    modulePolicy?: {
        module?: string | null;
        tonePolicy?: string | null;
        keywordPolicy?: string | null;
        literalVsAdaptive?: string | null;
    } | null;
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
export declare function translateSingleField(args: TranslateSingleFieldArgs): Promise<TranslateSingleFieldResult>;
//# sourceMappingURL=syncTranslate.d.ts.map