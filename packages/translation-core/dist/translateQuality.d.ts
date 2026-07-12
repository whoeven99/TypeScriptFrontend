/** Translation output quality checks — shared by worker batch and TSF single translate. */
export declare function looksLikeUntranslated(source: string, translated: string, target: string): boolean;
/** CJK leaked into a non-CJK target when the source leaf had none. */
export declare function looksLikeWrongScriptLeak(source: string, translated: string, target: string): boolean;
/** LLM invented content for an empty source leaf (e.g. empty description → "S3"). */
export declare function looksLikeEmptySourceHallucination(source: string, translated: string): boolean;
/** Model echoed the prompt's "number" wording instead of preserving ⟦N⟧ sentinels. */
export declare function hasPromptSentinelLeakage(text: string): boolean;
/** Glossary target must not inject CJK into non-CJK locales unless source already has CJK. */
export declare function glossaryTargetMatchesLocale(targetText: string, sourceText: string, target: string): boolean;
export declare function isTranslatableLeafText(text: string): boolean;
//# sourceMappingURL=translateQuality.d.ts.map