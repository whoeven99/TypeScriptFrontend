/**
 * Target-language-specific prompt blocks for translation quality.
 * Canonical target-language prompt rules shared by App and Worker.
 */

function targetLangCode(target: string): string {
  return target.toLowerCase().split(/[-_]/)[0] ?? target.toLowerCase();
}

/**
 * Locale-aware script constraint for the shared system-prompt Rules list.
 * Avoids forbidding Japanese/Chinese/Korean script when that is the target.
 */
export function buildScriptConstraintLine(target: string): string {
  const tl = targetLangCode(target);
  if (tl === "zh") {
    return `- translatedValue MUST be natural Chinese for "${target}" (汉字). Do not leave descriptive product text in English/Latin-only. Do not insert Japanese kana or Korean Hangul. Brand names may stay in Latin when customary for Chinese e-commerce.`;
  }
  if (tl === "ja") {
    return `- translatedValue MUST be natural Japanese for "${target}" (漢字・ひらがな・カタカナ as appropriate). Do NOT substitute romaji/Latin phonetic spelling for Japanese script. Do not insert Chinese-only glossary wording or Korean Hangul. Brand names may stay in Latin when customary for Japanese e-commerce.`;
  }
  if (tl === "ko") {
    return `- translatedValue MUST be natural Korean for "${target}" (한글). Do not substitute romanization for Hangul. Do not insert Chinese or Japanese characters unless they already appear in the source. Brand names may stay in Latin when customary for Korean e-commerce.`;
  }
  return `- translatedValue MUST be written entirely in "${target}"; never insert Chinese (汉字), Japanese, or Korean characters unless those exact characters already appear in the source value`;
}

export function buildTargetLanguageBlock(target: string): string {
  const tl = targetLangCode(target);
  if (tl === "zh") {
    return `
Chinese (${target}) requirements:
- Write natural Chinese for e-commerce, following Simplified/Traditional conventions that match "${target}".
- Translate descriptive product copy into Chinese characters; do not leave English sentences untranslated.
- Preserve ⟦N⟧ URL/path sentinels exactly.`;
  }
  if (tl === "ja") {
    return `
Japanese (${target}) requirements:
- Write natural Japanese e-commerce phrasing with an appropriate mix of kanji, hiragana, and katakana.
- Never replace a full Japanese translation with romaji (Latin phonetic spelling of Japanese).
- Keep customary brand names in Latin; translate descriptive product text into Japanese script.
- Preserve ⟦N⟧ URL/path sentinels exactly.`;
  }
  if (tl === "ko") {
    return `
Korean (${target}) requirements:
- Write natural Korean (Hangul) for e-commerce. Do not substitute romanization for Hangul.
- Keep customary brand names in Latin; translate descriptive product text into Hangul.
- Preserve ⟦N⟧ URL/path sentinels exactly.`;
  }
  if (tl === "ar") {
    return `
Arabic (${target}) requirements:
- Write the entire value in natural right-to-left Arabic word order. Do not keep English/Latin prefixes (section numbers, brand names, labels) at the start while translating only the remainder into Arabic.
- Example: "II. ChessboArt Craftsmanship & Aesthetics: A Visual Journey" → "ثانيًا: حرفية وجماليات تشيسبو آرت: رحلة بصرية" (localize Roman numerals, transliterate brand names into Arabic script, full Arabic sentence structure).
- Preserve ⟦N⟧ URL/path sentinels exactly; place them naturally within the Arabic sentence.
- Technical terms without glossary entries may stay in Latin when embedded mid-sentence, but never leave a Latin-only prefix on an otherwise Arabic line.`;
  }
  if (tl === "he") {
    return `
Hebrew (${target}) requirements:
- Use natural right-to-left Hebrew word order for the entire value. Do not keep English/Latin prefixes at the start while translating only the rest into Hebrew.
- Preserve ⟦N⟧ URL/path sentinels exactly within the Hebrew sentence.`;
  }
  if (tl === "fa") {
    return `
Persian (${target}) requirements:
- Use natural right-to-left Persian word order for the entire value. Do not keep English/Latin prefixes at the start while translating only the rest into Persian.
- Preserve ⟦N⟧ URL/path sentinels exactly within the Persian sentence.`;
  }
  return "";
}
