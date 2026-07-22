/**
 * Mask URLs, site paths, and template placeholders before LLM translation.
 * Canonical placeholder masking implementation shared by App and Worker.
 *
 * Liquid block tags ({% ... %}) are masked here as defense-in-depth for the
 * plain / non-liquid_html path so comparison literals like "paypal" and
 * keywords like else never enter the LLM. liquid_html still masks blocks
 * earlier via liquidHtmlTranslate.ts; double-masking is avoided there because
 * block tags are already removed before per-part maskPlaceholders runs.
 */

const PLACEHOLDER_RE =
  /\{\{[^{}]*\}\}|%\{[^}]+\}|\$\{[^}]+\}|%\d*\$?[sd]|\{\d+\}|\[[A-Za-z_][\w-]*\](?!\()/g;

/**
 * Liquid block tags including whitespace-strip variants:
 *   {% tag ... %}   {%- tag ... -%}   {%- tag ... %}   {% tag ... -%}
 * Must run before PLACEHOLDER_RE / path masking so content inside tags is never
 * treated as translatable text or site paths.
 */
const LIQUID_BLOCK_TAG_RE = /\{%-?[\s\S]*?-?%\}/g;

const PROTECTED_URL_RE = /https?:\/\/[^\s<>"']+/gi;
/**
 * Do not match `/dark` inside `light/dark` — require `/` not preceded by a letter.
 * Also exclude HTML closers like `</b>` / `</div>` (`/` preceded by `<`).
 */
const PROTECTED_PATH_RE =
  /(?<![a-zA-Z<])\/[a-zA-Z0-9_\-./%~]+(?:\?[a-zA-Z0-9_\-./%&=]*)?/g;

const SENT_OPEN = "⟦";
const SENT_CLOSE = "⟧";
const SENT_RE = /⟦(\d+)⟧/g;

function pushMaskedToken(tokens: string[], match: string): string {
  const i = tokens.length;
  tokens.push(match);
  return `${SENT_OPEN}${i}${SENT_CLOSE}`;
}

function maskProtectedLiterals(text: string, tokens: string[]): string {
  let out = text.replace(PROTECTED_URL_RE, (m) => pushMaskedToken(tokens, m));
  out = out.replace(PROTECTED_PATH_RE, (m) => pushMaskedToken(tokens, m));
  return out;
}

export function maskPlaceholders(text: string): { masked: string; tokens: string[] } {
  const tokens: string[] = [];
  LIQUID_BLOCK_TAG_RE.lastIndex = 0;
  let masked = text.replace(LIQUID_BLOCK_TAG_RE, (m) => pushMaskedToken(tokens, m));
  masked = maskProtectedLiterals(masked, tokens);
  masked = masked.replace(PLACEHOLDER_RE, (m) => pushMaskedToken(tokens, m));
  return { masked, tokens };
}

function restorePlaceholders(text: string, tokens: string[]): string {
  return text.replace(SENT_RE, (_m, d: string) => tokens[Number(d)] ?? "");
}

/** Recover common LLM corruptions of ⟦n⟧ (e.g. [number]0[number]) before giving up. */
function restorePlaceholdersLenient(text: string, tokens: string[]): string {
  let out = text;
  for (let i = 0; i < tokens.length; i++) {
    const sentinel = `${SENT_OPEN}${i}${SENT_CLOSE}`;
    if (out.includes(sentinel)) continue;
    const corruptPatterns = [
      new RegExp(`\\[number\\]${i}\\[number\\]`, "gi"),
      new RegExp(`\\[${i}\\]`, "g"),
      new RegExp(`\\{${i}\\}`, "g"),
    ];
    for (const re of corruptPatterns) {
      if (re.test(out)) {
        out = out.replace(re, tokens[i] ?? sentinel);
        break;
      }
    }
  }
  return out;
}

export function protectedLiteralsPreserved(tokens: string[], translated: string): boolean {
  const protectedOnes = tokens.filter(
    (t) => t.startsWith("/") || /^https?:\/\//i.test(t),
  );
  return protectedOnes.every((t) => translated.includes(t));
}

export function placeholdersIntact(text: string, tokens: string[]): boolean {
  for (let i = 0; i < tokens.length; i++) {
    if (!text.includes(`${SENT_OPEN}${i}${SENT_CLOSE}`)) return false;
  }
  return true;
}

export function restoreMaskedPlaceholders(decoded: string, tokens: string[]): string {
  if (tokens.length === 0) return decoded;
  const strict = restorePlaceholders(decoded, tokens);
  if (tokens.every((t) => strict.includes(t))) return strict;
  const lenient = restorePlaceholdersLenient(decoded, tokens);
  if (tokens.every((t) => lenient.includes(t))) return lenient;
  return strict;
}
