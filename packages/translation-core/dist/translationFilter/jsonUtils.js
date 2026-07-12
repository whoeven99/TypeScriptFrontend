/** Aligns with Spring JsonUtils.isJson — JSON object only (not arrays). */
const HTML_TAG_RE = /<\/?[a-z][^>]*>/i;
export function isHtmlContent(value) {
    return HTML_TAG_RE.test(value);
}
export function isJsonObject(value) {
    const t = value?.trim();
    if (!t || t[0] !== "{")
        return false;
    try {
        const parsed = JSON.parse(t);
        return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed);
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=jsonUtils.js.map