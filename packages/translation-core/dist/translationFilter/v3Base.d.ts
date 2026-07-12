import type { ExistingTranslation, IncludeFieldOptions, TranslatableContentInput } from "./types.js";
/** V3 base rules (TranslateV3Service.shouldStoreContent) */
export declare function isBlankValue(value: string | null | undefined): boolean;
export declare function passesV3TypeAndHandleRules(content: TranslatableContentInput, opts: IncludeFieldOptions): boolean;
/**
 * Non-cover INIT: field needs translation when target locale has no row,
 * outdated=true, or an empty translation value (Shopify placeholder).
 */
export declare function translationNeedsRefresh(translation: ExistingTranslation | undefined): boolean;
/** Non-cover: include field when translationNeedsRefresh; cover always includes. */
export declare function passesCoverAndOutdatedRules(translations: ExistingTranslation[] | undefined, key: string, isCover: boolean): boolean;
export declare function shouldIncludeFieldV3(content: TranslatableContentInput, translations: ExistingTranslation[] | undefined, opts: IncludeFieldOptions): boolean;
//# sourceMappingURL=v3Base.d.ts.map