import {
  BASE64_PATTERN,
  MODULE_METAFIELD,
  SUSPICIOUS_PATTERN,
  SUSPICIOUS2_PATTERN,
} from "./constants";
import { tryParseJsonContainer } from "~/server/translateV4/jsonExtractRules.server";
import { metaTranslate } from "./judgeTranslateUtils";
import { canTranslateMetafieldJson } from "./metafieldJsonJudge";

function isJsonContainer(value: string): boolean {
  return tryParseJsonContainer(value) !== undefined;
}

/**
 * METAFIELD branch (TranslateV2Service.needTranslate).
 */
export function passesMetafieldModuleRules(
  module: string,
  type: string,
  value: string,
): boolean {
  if (module !== MODULE_METAFIELD) {
    return true;
  }

  if (SUSPICIOUS_PATTERN.test(value) || SUSPICIOUS2_PATTERN.test(value)) {
    return false;
  }

  if (!metaTranslate(value)) {
    return false;
  }

  if (BASE64_PATTERN.test(value)) {
    return false;
  }

  if (value.startsWith("=")) {
    return false;
  }

  if (value.includes("class='jdgm-all-reviews__header'")) {
    return false;
  }

  if (value === "CC_CC-PT") {
    return false;
  }

  if (isJsonContainer(value) || type === "JSON") {
    return canTranslateMetafieldJson(value, type);
  }

  return true;
}
