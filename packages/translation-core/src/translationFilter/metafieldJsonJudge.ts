/**
 * METAFIELD JSON INIT gate — content-based (aligned with jsonExtractRules).
 */

import { shouldTranslateMetafieldJson } from "../jsonExtractRules.js";

/**
 * True when Shopify type, content markers, and extract rules all allow JSON translation.
 */
export function canTranslateMetafieldJson(value: string, type?: string): boolean {
  return shouldTranslateMetafieldJson(value, type);
}
