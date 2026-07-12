/**
 * HTML text-node extraction and reassembly for translation.
 * Parser-based (node-html-parser), aligned with Spring HtmlTranslateStrategyService + Jsoup.
 * Canonical HTML translation implementation shared by App and Worker.
 */
import { parse, NodeType } from "node-html-parser";
import { isHtmlContent } from "./htmlContent.js";
export { isHtmlContent };
const LONG_TEXT_THRESHOLD = Math.max(500, Number(process.env.TRANSLATE_LONG_TEXT_THRESHOLD) || 3_000);
const LONG_TEXT_CHUNK_CHARS = Math.max(400, Number(process.env.TRANSLATE_LONG_TEXT_CHUNK_CHARS) || 2_500);
const ATTR_URL_RE = /^https?:\/\//;
const ATTR_HASH_FILENAME_RE = /^[a-fA-F0-9]{8,}(-[a-zA-Z0-9]+)*$|^\S+\.(jpg|jpeg|png|gif|bmp|webp|svg|mp4|pdf)$/i;
const BR_PLACEHOLDER = "⟦BR⟧";
// ASCII 占位符：属性经 node-html-parser 序列化后仍完整保留。
// 历史上 \x00T{n}\x00 在属性里会变成 u0000T{n}u0000，正则无法还原。
const TEXT_PLACEHOLDER_PREFIX = "__HXLAT_";
const TEXT_PLACEHOLDER_SUFFIX = "__";
/** 还原时需兼容的历史占位符（含属性序列化后的 NUL 残骸）。 */
const PLACEHOLDER_REPLACE_RES = [
    /__HXLAT_(\d+)__/g,
    /⟦T(\d+)⟧/g,
    /\x00T(\d+)\x00/g,
    /u0000T(\d+)u0000/g,
];
const HTML_PLACEHOLDER_LEAK_RE = /__HXLAT_\d+__|⟦T\d+⟧|\x00T\d+\x00|u0000T\d+u0000/;
function textPlaceholder(idx) {
    return `${TEXT_PLACEHOLDER_PREFIX}${idx}${TEXT_PLACEHOLDER_SUFFIX}`;
}
/** 译文 HTML 中是否仍残留内部占位符（含 TM 缓存的脏数据）。 */
export function hasHtmlPlaceholderLeak(html) {
    return HTML_PLACEHOLDER_LEAK_RE.test(html);
}
function replacePlaceholdersInString(value, translations) {
    let out = value;
    for (const re of PLACEHOLDER_REPLACE_RES) {
        re.lastIndex = 0;
        out = out.replace(re, (_, idx) => translations[Number(idx)] ?? "");
    }
    return out;
}
function collectPlaceholderIndices(segment) {
    const indices = [];
    for (const re of PLACEHOLDER_REPLACE_RES) {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(segment)) !== null) {
            indices.push(Number(m[1]));
        }
    }
    return indices;
}
const HTML_PARSE_OPTIONS = {
    lowerCaseTagName: false,
    comment: false,
    blockTextElements: {
        script: true,
        noscript: true,
        style: true,
        pre: true,
    },
};
const HTML_BLOCK_COALESCE_TAGS = "p|li|h[1-6]|dt|dd|blockquote|figcaption";
const HTML_NESTED_BLOCK_RE = /<(p|li|h[1-6]|td|th|dt|dd|blockquote|figcaption|div|ul|ol|table|thead|tbody|tr)\b/i;
const HTML_TABLE_RE = /<table\b[\s\S]*?<\/table>/gi;
const INLINE_PRESERVE_RE = /<(a|strong|b|em|i|u|span|mark|small|sub|sup)\b/i;
const SKIP_TAGS = new Set(["script", "style", "pre", "code", "noscript"]);
const TRANSLATABLE_ATTRS = ["alt", "title", "aria-label", "placeholder"];
function isTranslatableAttrValue(value) {
    const v = value.trim();
    if (!v)
        return false;
    if (ATTR_URL_RE.test(v))
        return false;
    if (ATTR_HASH_FILENAME_RE.test(v))
        return false;
    return true;
}
function preprocessHtmlForTranslation(html) {
    // Only normalize <br>; keep span/style/class and other inline structure (aligned with Jsoup textNodes).
    return html.replace(/<br\s*\/?>/gi, BR_PLACEHOLDER);
}
export function restoreBrPlaceholders(html) {
    return html.replaceAll(BR_PLACEHOLDER, "<br />");
}
export function effectiveTranslation(original, translated) {
    if (translated === undefined)
        return original;
    if (original.trim() !== "" && translated.trim() === "")
        return original;
    return translated;
}
function elementTagName(el) {
    return (el.rawTagName ?? el.tagName ?? "").toLowerCase();
}
/** DOM walk — same idea as Jsoup doc.getAllElements() + textNodes(), skipping script/style. */
function extractHtmlTextNodes(html) {
    const texts = [];
    const root = parse(html, HTML_PARSE_OPTIONS);
    for (const el of root.querySelectorAll("*")) {
        for (const attr of TRANSLATABLE_ATTRS) {
            const val = el.getAttribute(attr);
            if (val == null || !isTranslatableAttrValue(val))
                continue;
            const idx = texts.length;
            texts.push(val.trim());
            el.setAttribute(attr, textPlaceholder(idx));
        }
    }
    function walkTextNodes(node) {
        if (node.nodeType === NodeType.TEXT_NODE) {
            const raw = node.rawText ?? "";
            if (!raw.trim())
                return;
            const leading = raw.match(/^[\s\u00a0]*/)?.[0] ?? "";
            const trailing = raw.match(/[\s\u00a0]*$/)?.[0] ?? "";
            const core = raw.slice(leading.length, raw.length - trailing.length);
            if (!core.trim())
                return;
            const idx = texts.length;
            texts.push(core.trim());
            node.rawText = `${leading}${textPlaceholder(idx)}${trailing}`;
            return;
        }
        if (node.nodeType !== NodeType.ELEMENT_NODE)
            return;
        const el = node;
        if (SKIP_TAGS.has(elementTagName(el)))
            return;
        for (const child of [...node.childNodes]) {
            walkTextNodes(child);
        }
    }
    for (const child of [...root.childNodes]) {
        walkTextNodes(child);
    }
    return { template: root.toString(), texts };
}
export function restoreHtmlTextNodes(template, translations) {
    const root = parse(template, HTML_PARSE_OPTIONS);
    for (const el of root.querySelectorAll("*")) {
        for (const attr of TRANSLATABLE_ATTRS) {
            const val = el.getAttribute(attr);
            if (val == null || !HTML_PLACEHOLDER_LEAK_RE.test(val))
                continue;
            const restored = replacePlaceholdersInString(val, translations);
            if (restored !== val)
                el.setAttribute(attr, restored);
        }
    }
    function walkRestore(node) {
        if (node.nodeType === NodeType.TEXT_NODE) {
            const raw = node.rawText ?? "";
            if (!HTML_PLACEHOLDER_LEAK_RE.test(raw))
                return;
            node.rawText = replacePlaceholdersInString(raw, translations);
            return;
        }
        if (node.nodeType !== NodeType.ELEMENT_NODE)
            return;
        const el = node;
        if (SKIP_TAGS.has(elementTagName(el)))
            return;
        for (const child of [...node.childNodes])
            walkRestore(child);
    }
    for (const child of [...root.childNodes])
        walkRestore(child);
    let result = root.toString();
    if (hasHtmlPlaceholderLeak(result)) {
        result = replacePlaceholdersInString(result, translations);
    }
    return result;
}
export function sanitizeHtmlTextTranslation(original, translated) {
    if (!translated.includes("<"))
        return translated;
    const stripped = translated
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    if (!stripped)
        return original;
    return stripped;
}
function coalesceBlockTextNodesInner(template, texts, newTexts) {
    const blockRe = new RegExp(`<(${HTML_BLOCK_COALESCE_TAGS})\\b[^>]*>([\\s\\S]*?)<\\/\\1>`, "gi");
    const newTemplate = template.replace(blockRe, (full, tag, inner) => {
        if (HTML_NESTED_BLOCK_RE.test(inner))
            return full;
        const indices = collectPlaceholderIndices(inner);
        if (indices.length <= 1)
            return full;
        if (INLINE_PRESERVE_RE.test(inner))
            return full;
        const merged = indices
            .map((i) => texts[i])
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();
        const newIdx = newTexts.length;
        newTexts.push(merged);
        const openTag = full.match(new RegExp(`<${tag}\\b[^>]*>`, "i"))[0];
        return `${openTag}${textPlaceholder(newIdx)}</${tag}>`;
    });
    return { template: newTemplate, texts: newTexts };
}
function coalesceBlockTextNodes(template, texts) {
    const newTexts = [...texts];
    if (!HTML_TABLE_RE.test(template)) {
        return coalesceBlockTextNodesInner(template, texts, newTexts);
    }
    HTML_TABLE_RE.lastIndex = 0;
    let out = "";
    let cursor = 0;
    let m;
    while ((m = HTML_TABLE_RE.exec(template)) !== null) {
        if (m.index > cursor) {
            const seg = coalesceBlockTextNodesInner(template.slice(cursor, m.index), texts, newTexts);
            out += seg.template;
        }
        out += m[0];
        cursor = m.index + m[0].length;
    }
    if (cursor < template.length) {
        const seg = coalesceBlockTextNodesInner(template.slice(cursor), texts, newTexts);
        out += seg.template;
    }
    return { template: out, texts: newTexts };
}
function splitPlainText(text) {
    if (text.length <= LONG_TEXT_THRESHOLD)
        return [text];
    const parts = [];
    let remaining = text;
    while (remaining.length > LONG_TEXT_CHUNK_CHARS) {
        let splitIdx = -1;
        const paraIdx = remaining.lastIndexOf("\n\n", LONG_TEXT_CHUNK_CHARS);
        if (paraIdx >= LONG_TEXT_CHUNK_CHARS * 0.4)
            splitIdx = paraIdx + 2;
        if (splitIdx < 0) {
            const sentIdx = remaining.lastIndexOf(". ", LONG_TEXT_CHUNK_CHARS);
            if (sentIdx >= LONG_TEXT_CHUNK_CHARS * 0.4)
                splitIdx = sentIdx + 2;
        }
        if (splitIdx <= 0) {
            const wordIdx = remaining.lastIndexOf(" ", LONG_TEXT_CHUNK_CHARS);
            splitIdx = wordIdx > 0 ? wordIdx : LONG_TEXT_CHUNK_CHARS;
        }
        parts.push(remaining.slice(0, splitIdx));
        remaining = remaining.slice(splitIdx).trimStart();
    }
    if (remaining.length > 0)
        parts.push(remaining);
    return parts;
}
/** Split HTML into a structural template and translatable text-node parts. */
export function htmlNodePartsOf(value) {
    let { template, texts } = extractHtmlTextNodes(preprocessHtmlForTranslation(value));
    ({ template, texts } = coalesceBlockTextNodes(template, texts));
    const nodeParts = texts.map((t) => t.length > LONG_TEXT_THRESHOLD ? splitPlainText(t) : [t]);
    return { template, nodeParts };
}
/**
 * True when HTML contains translatable text outside script/style/pre/code blocks.
 * Script-only embeds (e.g. Loox widget snippets) return false.
 */
export function isTranslatableHtmlContent(value) {
    if (!isHtmlContent(value))
        return false;
    const { nodeParts } = htmlNodePartsOf(value);
    return nodeParts.some((parts) => parts.some((p) => p.trim().length > 0));
}
/** Flatten node parts to per-marker translations for reassembly. */
export function flattenHtmlNodeTranslations(nodeParts, translatePart) {
    let partIndex = 0;
    return nodeParts.map((parts) => {
        const pieces = parts.map((part) => {
            const translated = translatePart(part, partIndex++);
            return effectiveTranslation(part, sanitizeHtmlTextTranslation(part, translated));
        });
        const joined = pieces.join("");
        return effectiveTranslation(parts.join(""), joined.trim());
    });
}
/** Reassemble translated text nodes back into HTML. */
export function reassembleHtmlTranslation(template, nodeTranslations) {
    return restoreBrPlaceholders(restoreHtmlTextNodes(template, nodeTranslations));
}
/** Round-trip helper for tests. */
export function roundtripHtmlForTest(html, translateFn) {
    const { template, nodeParts } = htmlNodePartsOf(html);
    const out = flattenHtmlNodeTranslations(nodeParts, (text, i) => translateFn(text, i));
    return reassembleHtmlTranslation(template, out);
}
//# sourceMappingURL=htmlTranslate.js.map