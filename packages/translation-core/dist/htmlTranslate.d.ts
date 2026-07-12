/**
 * HTML text-node extraction and reassembly for translation.
 * Parser-based (node-html-parser), aligned with Spring HtmlTranslateStrategyService + Jsoup.
 * Canonical HTML translation implementation shared by App and Worker.
 */
import { isHtmlContent } from "./htmlContent.js";
export { isHtmlContent };
/** 译文 HTML 中是否仍残留内部占位符（含 TM 缓存的脏数据）。 */
export declare function hasHtmlPlaceholderLeak(html: string): boolean;
export declare function restoreBrPlaceholders(html: string): string;
export declare function effectiveTranslation(original: string, translated: string | undefined): string;
export declare function restoreHtmlTextNodes(template: string, translations: string[]): string;
export declare function sanitizeHtmlTextTranslation(original: string, translated: string): string;
export type HtmlNodePlan = {
    template: string;
    nodeParts: string[][];
};
/** Split HTML into a structural template and translatable text-node parts. */
export declare function htmlNodePartsOf(value: string): HtmlNodePlan;
/**
 * True when HTML contains translatable text outside script/style/pre/code blocks.
 * Script-only embeds (e.g. Loox widget snippets) return false.
 */
export declare function isTranslatableHtmlContent(value: string): boolean;
/** Flatten node parts to per-marker translations for reassembly. */
export declare function flattenHtmlNodeTranslations(nodeParts: string[][], translatePart: (part: string, partIndex: number) => string): string[];
/** Reassemble translated text nodes back into HTML. */
export declare function reassembleHtmlTranslation(template: string, nodeTranslations: string[]): string;
/** Round-trip helper for tests. */
export declare function roundtripHtmlForTest(html: string, translateFn: (text: string, index: number) => string): string;
//# sourceMappingURL=htmlTranslate.d.ts.map