/**
 * METAFIELD JSON INIT gate — content-based (aligned with jsonExtractRules).
 */

import { shouldTranslateMetafieldJson } from "~/server/translateV4/jsonExtractRules.server";

/** @deprecated Legacy string marker; use JSON_NEED_TRANSLATE_JUDGE.jsonMustContainAny. */
export const JSON_JUDGE = '"type":"text"';

/**
 * True when Shopify type, content markers, and extract rules all allow JSON translation.
 */
export function canTranslateMetafieldJson(value: string, type?: string): boolean {
  return shouldTranslateMetafieldJson(value, type);
}
