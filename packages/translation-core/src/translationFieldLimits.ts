import type { TranslationFieldKind } from "./translationSceneResolver.js";

export type TranslationConstraintOrigin = "documented" | "heuristic";

export type TranslationFieldConstraintHint = {
  code:
    | "max_chars"
    | "recommended_max_chars"
    | "slug_like"
    | "search_snippet_title"
    | "search_snippet_description"
    | "short_ui_label";
  origin: TranslationConstraintOrigin;
  promptText: string;
  maxChars?: number;
};

export type TranslationFieldRule = {
  fieldKind: TranslationFieldKind;
  displayName: string;
  promptAudienceHint?: string;
  promptAdaptationHint?: string;
  hints: TranslationFieldConstraintHint[];
};

/**
 * Shopify 字段长度约束（写回 translationsRegister 硬限制）。
 * Product/COLLECTION/PAGE/ARTICLE/BLOG 等资源的 `title` 字段上限为 255 字符。
 */
export const SHOPIFY_TITLE_MAX_CHARS = 255;
export const META_TITLE_RECOMMENDED_MAX_CHARS = 70;
export const META_DESCRIPTION_RECOMMENDED_MAX_CHARS = 160;

const TITLE_FIELD_RULE: TranslationFieldRule = {
  fieldKind: "title",
  displayName: "title",
  promptAudienceHint: "Main resource title shown to shoppers",
  promptAdaptationHint: "Keep it clear, concise, and stable for product or content identification",
  hints: [
    {
      code: "max_chars",
      origin: "documented",
      maxChars: SHOPIFY_TITLE_MAX_CHARS,
      promptText: `Keep translatedValue within ${SHOPIFY_TITLE_MAX_CHARS} characters`,
    },
  ],
};

const SEO_TITLE_FIELD_RULE: TranslationFieldRule = {
  fieldKind: "seo_title",
  displayName: "meta_title",
  promptAudienceHint: "Search-facing snippet title",
  promptAdaptationHint: "Keep keyword intent and click clarity without sounding stuffed",
  hints: [
    {
      code: "search_snippet_title",
      origin: "heuristic",
      promptText: "Treat this as a meta title for search-facing snippets",
    },
    {
      code: "recommended_max_chars",
      origin: "heuristic",
      maxChars: META_TITLE_RECOMMENDED_MAX_CHARS,
      promptText: `Prefer keeping the meta title within about ${META_TITLE_RECOMMENDED_MAX_CHARS} characters when natural`,
    },
  ],
};

const SEO_DESCRIPTION_FIELD_RULE: TranslationFieldRule = {
  fieldKind: "seo_description",
  displayName: "meta_description",
  promptAudienceHint: "Search-facing snippet description",
  promptAdaptationHint: "Keep it natural, informative, and aligned with search intent",
  hints: [
    {
      code: "search_snippet_description",
      origin: "heuristic",
      promptText: "Treat this as a meta description for search-facing snippets",
    },
    {
      code: "recommended_max_chars",
      origin: "heuristic",
      maxChars: META_DESCRIPTION_RECOMMENDED_MAX_CHARS,
      promptText: `Prefer keeping the meta description within about ${META_DESCRIPTION_RECOMMENDED_MAX_CHARS} characters when natural`,
    },
  ],
};

const HANDLE_FIELD_RULE: TranslationFieldRule = {
  fieldKind: "handle",
  displayName: "handle",
  promptAudienceHint: "System-facing Shopify resource handle",
  promptAdaptationHint: "Do not write natural prose; keep it identifier-like and slug-friendly",
  hints: [
    {
      code: "slug_like",
      origin: "documented",
      promptText:
        "Keep the result suitable for a Shopify handle: lowercase-friendly, readable, and limited to slug-like wording with hyphens instead of spaces or special characters",
    },
  ],
};

const UI_LABEL_FIELD_RULE: TranslationFieldRule = {
  fieldKind: "ui_label",
  displayName: "ui_label",
  promptAudienceHint: "Short UI label or control text",
  promptAdaptationHint: "Keep it brief, scannable, and immediately understandable",
  hints: [
    {
      code: "short_ui_label",
      origin: "heuristic",
      promptText: "Keep the result concise and easy to scan as a UI label",
    },
  ],
};

const DEFAULT_FIELD_RULE: TranslationFieldRule = {
  fieldKind: "unknown",
  displayName: "unknown",
  hints: [],
};

const FIELD_RULES: Record<TranslationFieldKind, TranslationFieldRule> = {
  title: TITLE_FIELD_RULE,
  description: {
    fieldKind: "description",
    displayName: "description",
    promptAudienceHint: "Descriptive shopper-facing copy",
    promptAdaptationHint: "Balance clarity and natural flow",
    hints: [],
  },
  body: {
    fieldKind: "body",
    displayName: "body",
    promptAudienceHint: "Longer-form shopper-facing body copy",
    promptAdaptationHint: "Preserve meaning while allowing natural sentence flow",
    hints: [],
  },
  seo_title: SEO_TITLE_FIELD_RULE,
  seo_description: SEO_DESCRIPTION_FIELD_RULE,
  handle: HANDLE_FIELD_RULE,
  ui_label: UI_LABEL_FIELD_RULE,
  unknown: DEFAULT_FIELD_RULE,
};

export function isTitleFieldKey(key: string): boolean {
  return key.trim().toLowerCase() === "title";
}

/**
 * 将 title 译文截断到 Shopify 可接受长度。
 * 优先在靠后的空格处截断，避免硬切单词中间。
 */
export function clampTitleFieldValue(
  value: string,
  maxChars = SHOPIFY_TITLE_MAX_CHARS,
): string {
  if (value.length <= maxChars) return value;
  const slice = value.slice(0, maxChars);
  const lastSpace = slice.lastIndexOf(" ");
  if (lastSpace > maxChars - 40 && lastSpace > 0) {
    return slice.slice(0, lastSpace).trimEnd();
  }
  return slice;
}

/** 按字段 key 应用长度约束（当前仅 title）。 */
export function enforceFieldTranslationLimits(key: string, value: string): string {
  if (!isTitleFieldKey(key)) return value;
  return clampTitleFieldValue(value);
}

export type LimitedTranslateResult = {
  key: string;
  translatedValue: string;
  digest: string;
  status: "translated" | "fallback";
};

export function enforceTranslateResultLimits<T extends LimitedTranslateResult>(result: T): T {
  const clamped = enforceFieldTranslationLimits(result.key, result.translatedValue);
  if (clamped === result.translatedValue) return result;
  return { ...result, translatedValue: clamped };
}

export function getTranslationFieldConstraintHints(
  fieldKind: TranslationFieldKind,
): TranslationFieldConstraintHint[] {
  return getTranslationFieldRule(fieldKind).hints;
}

export function getTranslationFieldRule(fieldKind: TranslationFieldKind): TranslationFieldRule {
  return FIELD_RULES[fieldKind] ?? DEFAULT_FIELD_RULE;
}
