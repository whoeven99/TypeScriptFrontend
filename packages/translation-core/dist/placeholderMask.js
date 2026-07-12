/**
 * Mask URLs, site paths, and template placeholders before LLM translation.
 * Keep in sync with TypeScriptFrontend/app/server/translateV4/placeholderMask.server.ts
 */
const PLACEHOLDER_RE = /\{\{[^{}]*\}\}|%\{[^}]+\}|\$\{[^}]+\}|%\d*\$?[sd]|\{\d+\}|\[[A-Za-z_][\w-]*\](?!\()/g;
const PROTECTED_URL_RE = /https?:\/\/[^\s<>"']+/gi;
/** Do not match `/dark` inside `light/dark` — require `/` not preceded by a letter. */
const PROTECTED_PATH_RE = /(?<![a-zA-Z])\/[a-zA-Z0-9_\-./%~]+(?:\?[a-zA-Z0-9_\-./%&=]*)?/g;
const SENT_OPEN = "⟦";
const SENT_CLOSE = "⟧";
const SENT_RE = /⟦(\d+)⟧/g;
function pushMaskedToken(tokens, match) {
    const i = tokens.length;
    tokens.push(match);
    return `${SENT_OPEN}${i}${SENT_CLOSE}`;
}
function maskProtectedLiterals(text, tokens) {
    let out = text.replace(PROTECTED_URL_RE, (m) => pushMaskedToken(tokens, m));
    out = out.replace(PROTECTED_PATH_RE, (m) => pushMaskedToken(tokens, m));
    return out;
}
export function maskPlaceholders(text) {
    const tokens = [];
    let masked = maskProtectedLiterals(text, tokens);
    masked = masked.replace(PLACEHOLDER_RE, (m) => pushMaskedToken(tokens, m));
    return { masked, tokens };
}
function restorePlaceholders(text, tokens) {
    return text.replace(SENT_RE, (_m, d) => tokens[Number(d)] ?? "");
}
/** Recover common LLM corruptions of ⟦n⟧ (e.g. [number]0[number]) before giving up. */
function restorePlaceholdersLenient(text, tokens) {
    let out = text;
    for (let i = 0; i < tokens.length; i++) {
        const sentinel = `${SENT_OPEN}${i}${SENT_CLOSE}`;
        if (out.includes(sentinel))
            continue;
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
export function protectedLiteralsPreserved(tokens, translated) {
    const protectedOnes = tokens.filter((t) => t.startsWith("/") || /^https?:\/\//i.test(t));
    return protectedOnes.every((t) => translated.includes(t));
}
export function placeholdersIntact(text, tokens) {
    for (let i = 0; i < tokens.length; i++) {
        if (!text.includes(`${SENT_OPEN}${i}${SENT_CLOSE}`))
            return false;
    }
    return true;
}
export function restoreMaskedPlaceholders(decoded, tokens) {
    if (tokens.length === 0)
        return decoded;
    const strict = restorePlaceholders(decoded, tokens);
    if (tokens.every((t) => strict.includes(t)))
        return strict;
    const lenient = restorePlaceholdersLenient(decoded, tokens);
    if (tokens.every((t) => lenient.includes(t)))
        return lenient;
    return strict;
}
//# sourceMappingURL=placeholderMask.js.map