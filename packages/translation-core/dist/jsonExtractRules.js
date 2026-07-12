/**
 * Rule-based JSON text extraction — aligned with Java JsonTranslateStrategyService.buildDefaultRules.
 */
import { isHtmlContent } from "./htmlContent.js";
const RULE_MODE_TYPE_MATCH = "typeFieldMatch";
const RULE_MODE_PATH = "path";
const HTML_FIELD_NAMES = new Set(["body_html", "content_html", "html"]);
export const JSON_NEED_TRANSLATE_JUDGE = {
    allowedShopifyTypes: [
        "RICH_TEXT_FIELD",
        "STRING",
        "SINGLE_LINE_TEXT_FIELD",
        "MULTI_LINE_TEXT_FIELD",
        "JSON",
    ],
    jsonMustContainAny: [
        '"type":"text"',
        '"virtual_options"',
        '"photo_gallery"',
        '"reviews"',
    ],
};
/** Spring JsonTranslateStrategyService.buildDefaultRules when Redis config is empty. */
const DEFAULT_JSON_EXTRACT_RULES = [
    {
        mode: "typeFieldMatch",
        typeField: "type",
        typeValue: "text",
        translateField: "value",
    },
    {
        mode: "typeFieldMatch",
        typeField: "type",
        typeValue: "paragraph",
        translateField: "value",
    },
    {
        mode: "typeFieldMatch",
        typeField: "type",
        typeValue: "list",
        translateField: "value",
    },
    { mode: "path", path: "virtual_options[*].title" },
    { mode: "path", path: "virtual_options[*].values[*].key" },
    { mode: "path", path: "reviews[*].title" },
    { mode: "path", path: "reviews[*].body" },
    { mode: "path", path: "photo_gallery[*].title" },
    { mode: "path", path: "photo_gallery[*].body_html" },
];
export function passesJsonNeedTranslateJudge(value, shopifyType) {
    if (shopifyType &&
        !JSON_NEED_TRANSLATE_JUDGE.allowedShopifyTypes.includes(shopifyType)) {
        return false;
    }
    return JSON_NEED_TRANSLATE_JUDGE.jsonMustContainAny.some((marker) => value.includes(marker));
}
function isHtmlFieldName(fieldName) {
    return HTML_FIELD_NAMES.has(fieldName) || fieldName.endsWith("_html");
}
export function buildDefaultJsonExtractRules() {
    return DEFAULT_JSON_EXTRACT_RULES;
}
export function loadJsonExtractRules() {
    return DEFAULT_JSON_EXTRACT_RULES;
}
function buildDedupKey(parent, fieldName) {
    return `${Object.prototype.toString.call(parent)}:${fieldName}:${String(parent[fieldName])}`;
}
function pushTextSlot(slots, dedup, parent, fieldName, textValue) {
    const trimmed = textValue.trim();
    if (!trimmed)
        return;
    // Never translate URL/href fields (Shopify rich-text link nodes).
    if (fieldName === "url" || fieldName === "href")
        return;
    // Skip values that are purely a URL or site path — leave literal.
    if (/^https?:\/\//i.test(trimmed) || /^\/[a-zA-Z0-9_\-./%~]+$/.test(trimmed))
        return;
    const dedupKey = buildDedupKey(parent, fieldName);
    if (dedup.has(dedupKey))
        return;
    dedup.add(dedupKey);
    slots.push({
        parent,
        fieldName,
        text: textValue,
        // Content-based: any slot whose value contains HTML markup uses the HTML pipeline.
        isHtml: isHtmlFieldName(fieldName) || isHtmlContent(textValue),
    });
}
function collectByTypeMatchRule(rootNode, rule, slots, dedup) {
    if (!rule.typeField || !rule.typeValue || !rule.translateField)
        return;
    const stack = [rootNode];
    while (stack.length > 0) {
        const node = stack.pop();
        if (node == null)
            continue;
        if (Array.isArray(node)) {
            for (let i = node.length - 1; i >= 0; i--)
                stack.push(node[i]);
            continue;
        }
        if (typeof node !== "object")
            continue;
        const obj = node;
        const typeNode = obj[rule.typeField];
        if (typeNode === rule.typeValue) {
            const textFieldNode = obj[rule.translateField];
            if (typeof textFieldNode === "string") {
                pushTextSlot(slots, dedup, obj, rule.translateField, textFieldNode);
            }
        }
        for (const child of Object.values(obj)) {
            if (child !== null && typeof child === "object")
                stack.push(child);
        }
    }
}
function collectByPathSegments(currentNode, segments, segmentIndex, slots, dedup) {
    if (currentNode == null || segmentIndex >= segments.length)
        return;
    const segment = segments[segmentIndex];
    const isLast = segmentIndex === segments.length - 1;
    if (Array.isArray(currentNode)) {
        for (const item of currentNode) {
            collectByPathSegments(item, segments, segmentIndex, slots, dedup);
        }
        return;
    }
    if (typeof currentNode !== "object")
        return;
    const obj = currentNode;
    if (segment.endsWith("[*]")) {
        const arrayFieldName = segment.slice(0, -3);
        const arrayNode = obj[arrayFieldName];
        if (Array.isArray(arrayNode)) {
            for (const item of arrayNode) {
                collectByPathSegments(item, segments, segmentIndex + 1, slots, dedup);
            }
        }
        return;
    }
    const nextNode = obj[segment];
    if (nextNode === undefined)
        return;
    if (isLast && typeof nextNode === "string") {
        pushTextSlot(slots, dedup, obj, segment, nextNode);
        return;
    }
    collectByPathSegments(nextNode, segments, segmentIndex + 1, slots, dedup);
}
function collectByPathRule(rootNode, rule, slots, dedup) {
    if (!rule.path)
        return;
    const segments = rule.path.split(".");
    collectByPathSegments(rootNode, segments, 0, slots, dedup);
}
/** Extract translatable string slots from a parsed JSON tree using configured rules. */
export function extractJsonTextSlots(rootNode, rules = loadJsonExtractRules()) {
    const slots = [];
    const dedup = new Set();
    for (const rule of rules) {
        if (rule.mode === RULE_MODE_TYPE_MATCH) {
            collectByTypeMatchRule(rootNode, rule, slots, dedup);
        }
        else if (rule.mode === RULE_MODE_PATH) {
            collectByPathRule(rootNode, rule, slots, dedup);
        }
    }
    return slots;
}
/** True when any configured rule finds translatable text in the JSON string. */
export function jsonHasExtractableText(value, rules) {
    const root = tryParseJsonContainer(value);
    if (root === undefined)
        return false;
    return extractJsonTextSlots(root, rules ?? loadJsonExtractRules()).length > 0;
}
/** INIT gate + worker classify: type marker, content marker, and extract rules. */
export function shouldTranslateMetafieldJson(value, shopifyType) {
    if (!passesJsonNeedTranslateJudge(value, shopifyType))
        return false;
    return jsonHasExtractableText(value);
}
export function tryParseJsonContainer(value) {
    const t = value.trim();
    if (t.length < 2)
        return undefined;
    const c = t[0];
    if (c !== "{" && c !== "[")
        return undefined;
    try {
        const parsed = JSON.parse(t);
        if (parsed !== null && typeof parsed === "object")
            return parsed;
    }
    catch {
        /* not JSON */
    }
    return undefined;
}
/** Shopify LIST metafield: JSON array of strings only. */
export function isListFormat(value) {
    const t = value.trim();
    if (!t.startsWith("["))
        return false;
    try {
        const parsed = JSON.parse(t);
        return (Array.isArray(parsed) &&
            parsed.every((item) => item === null || typeof item === "string"));
    }
    catch {
        return false;
    }
}
/** Apply translated strings back into the JSON tree (mutates parents in slots). */
export function applyJsonSlotTranslations(slots, translated) {
    for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        const next = Array.isArray(translated)
            ? translated[i]
            : translated.get(slot.text);
        if (next !== undefined && next.trim()) {
            slot.parent[slot.fieldName] = next;
        }
    }
}
//# sourceMappingURL=jsonExtractRules.js.map