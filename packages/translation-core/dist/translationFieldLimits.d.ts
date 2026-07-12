/**
 * Shopify 字段长度约束（写回 translationsRegister 硬限制）。
 * Product/COLLECTION/PAGE/ARTICLE/BLOG 等资源的 `title` 字段上限为 255 字符。
 */
export declare const SHOPIFY_TITLE_MAX_CHARS = 255;
export declare function isTitleFieldKey(key: string): boolean;
/**
 * 将 title 译文截断到 Shopify 可接受长度。
 * 优先在靠后的空格处截断，避免硬切单词中间。
 */
export declare function clampTitleFieldValue(value: string, maxChars?: number): string;
/** 按字段 key 应用长度约束（当前仅 title）。 */
export declare function enforceFieldTranslationLimits(key: string, value: string): string;
export type LimitedTranslateResult = {
    key: string;
    translatedValue: string;
    digest: string;
    status: "translated" | "fallback";
};
export declare function enforceTranslateResultLimits<T extends LimitedTranslateResult>(result: T): T;
//# sourceMappingURL=translationFieldLimits.d.ts.map