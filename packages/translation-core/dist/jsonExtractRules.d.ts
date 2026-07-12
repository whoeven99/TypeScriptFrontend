/**
 * Rule-based JSON text extraction — aligned with Java JsonTranslateStrategyService.buildDefaultRules.
 */
export type JsonValue = string | number | boolean | null | JsonValue[] | {
    [k: string]: JsonValue;
};
export type JsonExtractRule = {
    mode: "typeFieldMatch" | "path";
    typeField?: string;
    typeValue?: string;
    translateField?: string;
    path?: string;
};
export type JsonTextSlot = {
    parent: Record<string, JsonValue>;
    fieldName: string;
    text: string;
    /** body_html and similar leaves should run through the HTML translator. */
    isHtml: boolean;
};
export declare const JSON_NEED_TRANSLATE_JUDGE: {
    readonly allowedShopifyTypes: readonly ["RICH_TEXT_FIELD", "STRING", "SINGLE_LINE_TEXT_FIELD", "MULTI_LINE_TEXT_FIELD", "JSON"];
    readonly jsonMustContainAny: readonly ["\"type\":\"text\"", "\"virtual_options\"", "\"photo_gallery\"", "\"reviews\""];
};
export declare function passesJsonNeedTranslateJudge(value: string, shopifyType?: string): boolean;
export declare function buildDefaultJsonExtractRules(): JsonExtractRule[];
export declare function loadJsonExtractRules(): JsonExtractRule[];
/** Extract translatable string slots from a parsed JSON tree using configured rules. */
export declare function extractJsonTextSlots(rootNode: JsonValue, rules?: JsonExtractRule[]): JsonTextSlot[];
/** True when any configured rule finds translatable text in the JSON string. */
export declare function jsonHasExtractableText(value: string, rules?: JsonExtractRule[]): boolean;
/** INIT gate + worker classify: type marker, content marker, and extract rules. */
export declare function shouldTranslateMetafieldJson(value: string, shopifyType?: string): boolean;
export declare function tryParseJsonContainer(value: string): JsonValue | undefined;
/** Shopify LIST metafield: JSON array of strings only. */
export declare function isListFormat(value: string): boolean;
/** Apply translated strings back into the JSON tree (mutates parents in slots). */
export declare function applyJsonSlotTranslations(slots: JsonTextSlot[], translated: Map<string, string> | string[]): void;
//# sourceMappingURL=jsonExtractRules.d.ts.map