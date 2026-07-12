/**
 * General rules (JudgeTranslateUtils.translationRuleJudgment).
 * HTML/Rich-text bodies skip scalar heuristics (px/url/hash) that target theme tokens.
 */
export declare function translationRuleJudgment(key: string, value: string): boolean;
/**
 * Theme general/section keys (JudgeTranslateUtils.shouldTranslate).
 */
export declare function shouldTranslateThemeKey(key: string, value: string): boolean;
export declare function whiteListTranslate(key: string): boolean;
/** Java JudgeTranslateUtils.metaTranslate — left/right/top/bottom only. */
export declare function metaTranslate(value: string): boolean;
//# sourceMappingURL=judgeTranslateUtils.d.ts.map