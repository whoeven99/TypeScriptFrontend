/** Keep in sync with Spark/worker/src/services/translateQuality.ts */

const LATIN_WORD_RE = /[a-zA-Z]{2,}/;
const CJK_RE = /[一-鿿㐀-䶿]/u;

function hasLatinWords(text: string): boolean {
  return LATIN_WORD_RE.test(text);
}

function hasCjk(text: string): boolean {
  return CJK_RE.test(text);
}

function targetLangCode(target: string): string {
  return target.toLowerCase().split(/[-_]/)[0] ?? target.toLowerCase();
}

function hasTargetScriptChars(text: string, targetLang: string): boolean {
  switch (targetLang) {
    case "zh":
      return /[一-鿿㐀-䶿]/u.test(text);
    case "ja":
      return /[ぁ-ゖァ-ヶ一-鿿]/u.test(text);
    case "ko":
      return /[가-힣ᄀ-ᇿ]/u.test(text);
    case "ar":
      return /[؀-ۿ]/u.test(text);
    default:
      return false;
  }
}

export function looksLikeUntranslated(
  source: string,
  translated: string,
  target: string,
): boolean {
  const tl = targetLangCode(target);
  if (tl === "en") return false;

  const norm = (s: string) => s.replace(/\s+/g, " ").trim();
  const src = norm(source);
  const tr = norm(translated);
  if (!src || !tr) return false;

  if (src === tr && hasLatinWords(src)) return true;

  if (["zh", "ja", "ko"].includes(tl) && src.length > 40 && hasLatinWords(src)) {
    const latinChars = src.match(/[a-zA-Z]/g)?.length ?? 0;
    if (latinChars / src.length > 0.45 && !hasTargetScriptChars(tr, tl)) {
      return true;
    }
  }
  return false;
}

export function looksLikeWrongScriptLeak(
  source: string,
  translated: string,
  target: string,
): boolean {
  const tl = targetLangCode(target);
  if (["zh", "ja", "ko"].includes(tl)) return false;
  return hasCjk(translated) && !hasCjk(source);
}

export function looksLikeEmptySourceHallucination(source: string, translated: string): boolean {
  if (source.trim() !== "") return false;
  return translated.trim() !== "";
}

export function hasPromptSentinelLeakage(text: string): boolean {
  return /\[number\]/i.test(text);
}

/** Reject slot translations that leak JSON structure into plain text leaves. */
export function sanitizeJsonSlotTranslation(original: string, translated: string): string {
  if (
    (/"type"\s*:|"children"\s*:|]\s*,\s*"type"/.test(translated)) &&
    !/"type"\s*:/.test(original)
  ) {
    return original;
  }
  return translated;
}

export function glossaryTargetMatchesLocale(
  targetText: string,
  sourceText: string,
  target: string,
): boolean {
  const tl = targetLangCode(target);
  if (["zh", "ja", "ko"].includes(tl)) return true;
  if (hasCjk(targetText) && !hasCjk(sourceText)) return false;
  return true;
}

export function isTranslatableLeafText(text: string): boolean {
  return text.trim().length > 0;
}

export function acceptLeafTranslation(
  source: string,
  translated: string,
  target: string,
): string {
  if (
    looksLikeUntranslated(source, translated, target) ||
    looksLikeWrongScriptLeak(source, translated, target) ||
    looksLikeEmptySourceHallucination(source, translated) ||
    hasPromptSentinelLeakage(translated)
  ) {
    return source;
  }
  return translated;
}

/** Restore masked paths/URLs then run quality checks. */
export function finalizeLeafTranslation(
  source: string,
  translated: string,
  target: string,
  placeholderTokens: string[] = [],
  restoreFn?: (text: string, tokens: string[]) => string,
): string {
  const restored =
    placeholderTokens.length > 0 && restoreFn
      ? restoreFn(translated, placeholderTokens)
      : translated;
  if (
    placeholderTokens.length > 0 &&
    !protectedLiteralsPreserved(placeholderTokens, restored)
  ) {
    return source;
  }
  return acceptLeafTranslation(source, restored, target);
}

function protectedLiteralsPreserved(tokens: string[], translated: string): boolean {
  const protectedOnes = tokens.filter(
    (t) => t.startsWith("/") || /^https?:\/\//i.test(t),
  );
  return protectedOnes.every((t) => translated.includes(t));
}
