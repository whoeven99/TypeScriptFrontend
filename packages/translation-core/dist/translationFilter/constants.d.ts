/** Aligns with Spring JudgeTranslateUtils + TranslateConstants */
export declare const MODULE_METAFIELD = "METAFIELD";
export declare const MODULE_METAOBJECT = "METAOBJECT";
export declare const MODULE_ONLINE_STORE_THEME_LOCALE_CONTENT = "ONLINE_STORE_THEME_LOCALE_CONTENT";
export declare const MODULE_PRODUCT_OPTION = "PRODUCT_OPTION";
export declare const MODULE_PRODUCT_OPTION_VALUE = "PRODUCT_OPTION_VALUE";
/**
 * Shopify auto-generates these as internal placeholder values for single-variant
 * products. They are not user-facing and must not be translated — writing them
 * back in another language can break Shopify's variant system.
 */
export declare const SHOPIFY_OPTION_SYSTEM_DEFAULTS: Set<string>;
export declare const NON_TRANSLATABLE_TYPES: Set<string>;
export declare const TRANSLATABLE_RESOURCE_TYPES: Set<string>;
export declare const NO_TRANSLATE_KEYS: string[];
export declare const JSON_NO_TRANSLATE_SUBSTRINGS: string[];
export declare const OLD_NO_TRANSLATE: string[];
export declare const URL_PREFIXES: string[];
export declare const WHITELIST_WORDS: string[];
export declare const BLACKLIST_WORDS: Set<string>;
export declare const HASH_PREFIX_MAX_LENGTH = 90;
export declare const SLASH_CONTAINS_MAX_LENGTH = 20;
export declare const SUSPICIOUS_PATTERN: RegExp;
export declare const SUSPICIOUS2_PATTERN: RegExp;
export declare const BASE64_PATTERN: RegExp;
export declare const ICON_KEY_PATTERN: RegExp;
export declare const GENERAL_OR_SECTION_PATTERN: RegExp;
export declare const IMAGE_PATTERN: RegExp;
export declare const PATH_PATTERN: RegExp;
export declare const ISO_OFFSET_DATETIME_PATTERN: RegExp;
export declare const EMPTY_BODY_TAG_PATTERN: RegExp;
export declare const LOCALE_CONTENT_KEY_BLOCKLIST: readonly ["gempage", "pagefly", "ecom", "beae", "error"];
//# sourceMappingURL=constants.d.ts.map