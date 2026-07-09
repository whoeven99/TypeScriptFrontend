/**
 * Shop-profile context block injected into the translation system prompt.
 *
 * This is the single source of truth for how ShopProfile turns into translation
 * context. The shop-profile page previews it, and Step 0 (translation prompt
 * injection) will consume the exact same builder so preview === real behavior.
 *
 * Keep in sync with worker/src/services/shopProfilePrompt.ts when Step 0 lands.
 */

export type ShopProfilePromptInput = {
  industry?: string | null;
  keywords?: string[] | null;
  description?: string | null;
  brandTone?: string | null;
};

const MAX_KEYWORDS = 15;
const MAX_DESCRIPTION_CHARS = 400;

/**
 * Build the shop-context block for the translation prompt.
 * Returns null when there is no usable profile signal (block is omitted).
 */
export function buildShopProfilePromptBlock(
  profile: ShopProfilePromptInput | null | undefined,
): string | null {
  if (!profile) return null;

  const industry = profile.industry?.trim();
  const brandTone = profile.brandTone?.trim();
  const description = truncate(profile.description?.trim() ?? "", MAX_DESCRIPTION_CHARS);
  const keywords = (profile.keywords ?? [])
    .map((k) => (k ?? "").trim())
    .filter(Boolean)
    .slice(0, MAX_KEYWORDS);

  const lines: string[] = [];
  if (industry) lines.push(`- Industry / category: ${industry}`);
  if (brandTone) lines.push(`- Brand voice / tone: ${brandTone}`);
  if (keywords.length) lines.push(`- Key terms: ${keywords.join(", ")}`);
  if (description) lines.push(`- About the shop: ${description}`);

  if (lines.length === 0) return null;

  return [
    "Shop profile (background context to guide tone, terminology, and localization; do NOT translate or output this block):",
    ...lines,
  ].join("\n");
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen).trimEnd()}…`;
}
