/**
 * Shopify 字段长度约束（写回 translationsRegister 硬限制）。
 * Product/COLLECTION/PAGE/ARTICLE/BLOG 等资源的 `title` 字段上限为 255 字符。
 */
export const SHOPIFY_TITLE_MAX_CHARS = 255;

export type TranslationFieldKind =
  | "title"
  | "description"
  | "body"
  | "seo_title"
  | "seo_description"
  | "handle"
  | "ui_label"
  | "unknown";

export type TranslationConstraintOrigin = "shopify_limit" | "scene_policy";

export type TranslationFieldRule = {
  fieldKind: TranslationFieldKind;
  maxChars?: number;
  recommendedMaxChars?: number;
  mustBeSlugLike?: boolean;
  shortUiLabelPreferred?: boolean;
};

export function isTitleFieldKey(key: string): boolean {
  return key.trim().toLowerCase() === "title";
}

export function getTranslationFieldRule(
  fieldKind: TranslationFieldKind,
): TranslationFieldRule {
  switch (fieldKind) {
    case "title":
      return {
        fieldKind,
        maxChars: SHOPIFY_TITLE_MAX_CHARS,
      };
    case "seo_title":
      return {
        fieldKind,
        recommendedMaxChars: 70,
      };
    case "seo_description":
      return {
        fieldKind,
        recommendedMaxChars: 160,
      };
    case "handle":
      return {
        fieldKind,
        mustBeSlugLike: true,
      };
    case "ui_label":
      return {
        fieldKind,
        recommendedMaxChars: 60,
        shortUiLabelPreferred: true,
      };
    default:
      return { fieldKind };
  }
}

export function getTranslationFieldConstraintHints(
  rule: TranslationFieldRule,
): Array<{
  code: string;
  origin: TranslationConstraintOrigin;
  promptText: string;
  maxChars?: number;
}> {
  const hints: Array<{
    code: string;
    origin: TranslationConstraintOrigin;
    promptText: string;
    maxChars?: number;
  }> = [];

  if (rule.maxChars != null) {
    hints.push({
      code: "max_chars",
      origin: "shopify_limit",
      promptText: `Keep the translated value within ${rule.maxChars} characters while preserving the core meaning.`,
      maxChars: rule.maxChars,
    });
  }

  if (rule.recommendedMaxChars != null) {
    hints.push({
      code: "recommended_max_chars",
      origin: "scene_policy",
      promptText: `Prefer a concise translation around ${rule.recommendedMaxChars} characters or less unless clarity would suffer.`,
      maxChars: rule.recommendedMaxChars,
    });
  }

  if (rule.mustBeSlugLike) {
    hints.push({
      code: "slug_like",
      origin: "scene_policy",
      promptText:
        "Keep the result slug-like: plain text only, concise, stable, and suitable for URL handle generation after hyphen joining.",
    });
  }

  if (rule.shortUiLabelPreferred) {
    hints.push({
      code: "short_ui_label",
      origin: "scene_policy",
      promptText:
        "Prefer a short UI label that remains clear at a glance and avoids unnecessary wording.",
    });
  }

  return hints;
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
