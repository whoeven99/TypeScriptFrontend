/**
 * HTML text-node extraction and reassembly for translation.
 * Parser-based (node-html-parser), aligned with Spring HtmlTranslateStrategyService + Jsoup.
 * Canonical HTML translation implementation shared by App and Worker.
 */

import { parse, HTMLElement, NodeType, type Node } from "node-html-parser";
import { isHtmlContent } from "./htmlContent.js";

export { isHtmlContent };

const LONG_TEXT_THRESHOLD = Math.max(
  500,
  Number(process.env.TRANSLATE_LONG_TEXT_THRESHOLD) || 3_000,
);
const LONG_TEXT_CHUNK_CHARS = Math.max(
  400,
  Number(process.env.TRANSLATE_LONG_TEXT_CHUNK_CHARS) || 2_500,
);

const ATTR_URL_RE = /^https?:\/\//;
const ATTR_HASH_FILENAME_RE =
  /^[a-fA-F0-9]{8,}(-[a-zA-Z0-9]+)*$|^\S+\.(jpg|jpeg|png|gif|bmp|webp|svg|mp4|pdf)$/i;

const BR_PLACEHOLDER = "⟦BR⟧";
// ASCII 占位符：属性经 node-html-parser 序列化后仍完整保留。
// 历史上属性与文本节点共用 __HXLAT_{n}__，会让块合并误把 alt/title
// 等属性文本当成“可见文本”压成纯文本块。现在显式区分两类占位符。
const TEXT_PLACEHOLDER_PREFIX = "__HXLAT_TEXT_";
const ATTR_PLACEHOLDER_PREFIX = "__HXLAT_ATTR_";
const PLACEHOLDER_SUFFIX = "__";

/** 还原时需兼容的历史占位符（含属性序列化后的 NUL 残骸）。 */
const TEXT_PLACEHOLDER_RES: readonly RegExp[] = [
  /__HXLAT_TEXT_(\d+)__/g,
];

const ATTR_PLACEHOLDER_RES: readonly RegExp[] = [
  /__HXLAT_ATTR_(\d+)__/g,
];

const PLACEHOLDER_REPLACE_RES: readonly RegExp[] = [
  ...TEXT_PLACEHOLDER_RES,
  ...ATTR_PLACEHOLDER_RES,
  /__HXLAT_(\d+)__/g,
  /⟦T(\d+)⟧/g,
  /\x00T(\d+)\x00/g,
  /u0000T(\d+)u0000/g,
];

const HTML_PLACEHOLDER_LEAK_RE =
  /__HXLAT_TEXT_\d+__|__HXLAT_ATTR_\d+__|__HXLAT_\d+__|⟦T\d+⟧|\x00T\d+\x00|u0000T\d+u0000/;

function textPlaceholder(idx: number): string {
  return `${TEXT_PLACEHOLDER_PREFIX}${idx}${PLACEHOLDER_SUFFIX}`;
}

function attrPlaceholder(idx: number): string {
  return `${ATTR_PLACEHOLDER_PREFIX}${idx}${PLACEHOLDER_SUFFIX}`;
}

/** 译文 HTML 中是否仍残留内部占位符（含 TM 缓存的脏数据）。 */
export function hasHtmlPlaceholderLeak(html: string): boolean {
  return HTML_PLACEHOLDER_LEAK_RE.test(html);
}

function replacePlaceholdersInString(value: string, translations: string[]): string {
  let out = value;
  for (const re of PLACEHOLDER_REPLACE_RES) {
    re.lastIndex = 0;
    out = out.replace(re, (_, idx) => translations[Number(idx)] ?? "");
  }
  return out;
}

function collectTextPlaceholderIndices(segment: string): number[] {
  const indices: number[] = [];
  for (const re of TEXT_PLACEHOLDER_RES) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
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
} as const;

const HTML_BLOCK_COALESCE_TAGS = "p|li|h[1-6]|dt|dd|blockquote|figcaption";
const HTML_BLOCK_GROUP_TAGS = new Set([
  "p",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "dt",
  "dd",
  "blockquote",
  "figcaption",
]);
const HTML_NESTED_BLOCK_RE =
  /<(p|li|h[1-6]|td|th|dt|dd|blockquote|figcaption|div|ul|ol|table|thead|tbody|tr)\b/i;
const HTML_TABLE_RE = /<table\b[\s\S]*?<\/table>/gi;
const INLINE_PRESERVE_RE = /<(a|strong|b|em|i|u|span|mark|small|sub|sup)\b/i;
const INLINE_TAG_RE = /<\/?(a|strong|b|em|i|u|span|mark|small|sub|sup)\b[^>]*>/gi;
const CJK_BOUNDARY_RE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;
const HTML_SEG_BOUNDARY_PREFIX = "⟦HTML_SEG_";

const SKIP_TAGS = new Set(["script", "style", "pre", "code", "noscript"]);
const TRANSLATABLE_ATTRS = ["alt", "title", "aria-label", "placeholder"] as const;

function isTranslatableAttrValue(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (ATTR_URL_RE.test(v)) return false;
  if (ATTR_HASH_FILENAME_RE.test(v)) return false;
  return true;
}

function preprocessHtmlForTranslation(html: string): string {
  // Only normalize <br>; keep span/style/class and other inline structure (aligned with Jsoup textNodes).
  return html.replace(/<br\s*\/?>/gi, BR_PLACEHOLDER);
}

export function restoreBrPlaceholders(html: string): string {
  return html.replaceAll(BR_PLACEHOLDER, "<br />");
}

export function effectiveTranslation(original: string, translated: string | undefined): string {
  if (translated === undefined) return original;
  if (original.trim() !== "" && translated.trim() === "") return original;
  return translated;
}

function elementTagName(el: HTMLElement): string {
  return (el.rawTagName ?? el.tagName ?? "").toLowerCase();
}

function walkElementNodes(node: Node, visitor: (el: HTMLElement) => void): void {
  if (node.nodeType === NodeType.ELEMENT_NODE) {
    const el = node as HTMLElement;
    visitor(el);
    for (const child of [...node.childNodes]) {
      walkElementNodes(child, visitor);
    }
    return;
  }

  for (const child of [...node.childNodes]) {
    walkElementNodes(child, visitor);
  }
}

/** DOM walk — same idea as Jsoup doc.getAllElements() + textNodes(), skipping script/style. */
function extractHtmlTextNodes(html: string): { template: string; texts: string[] } {
  const texts: string[] = [];
  const root = parse(html, HTML_PARSE_OPTIONS);

  walkElementNodes(root, (el) => {
    for (const attr of TRANSLATABLE_ATTRS) {
      const val = el.getAttribute(attr);
      if (val == null || !isTranslatableAttrValue(val)) continue;
      const idx = texts.length;
      texts.push(val.trim());
      el.setAttribute(attr, attrPlaceholder(idx));
    }
  });

  function walkTextNodes(node: Node): void {
    if (node.nodeType === NodeType.TEXT_NODE) {
      const raw = node.rawText ?? "";
      if (!raw.trim()) return;
      const leading = raw.match(/^[\s\u00a0]*/)?.[0] ?? "";
      const trailing = raw.match(/[\s\u00a0]*$/)?.[0] ?? "";
      const core = raw.slice(leading.length, raw.length - trailing.length);
      if (!core.trim()) return;
      const idx = texts.length;
      texts.push(core.trim());
      node.rawText = `${leading}${textPlaceholder(idx)}${trailing}`;
      return;
    }
    if (node.nodeType !== NodeType.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    if (SKIP_TAGS.has(elementTagName(el))) return;
    for (const child of [...node.childNodes]) {
      walkTextNodes(child);
    }
  }

  for (const child of [...root.childNodes]) {
    walkTextNodes(child);
  }

  return { template: root.toString(), texts };
}

export function restoreHtmlTextNodes(template: string, translations: string[]): string {
  const root = parse(template, HTML_PARSE_OPTIONS);

  walkElementNodes(root, (el) => {
    for (const attr of TRANSLATABLE_ATTRS) {
      const val = el.getAttribute(attr);
      if (val == null || !HTML_PLACEHOLDER_LEAK_RE.test(val)) continue;
      const restored = replacePlaceholdersInString(val, translations);
      if (restored !== val) el.setAttribute(attr, restored);
    }
  });

  function walkRestore(node: Node): void {
    if (node.nodeType === NodeType.TEXT_NODE) {
      const raw = node.rawText ?? "";
      if (!HTML_PLACEHOLDER_LEAK_RE.test(raw)) return;
      node.rawText = replacePlaceholdersInString(raw, translations);
      return;
    }
    if (node.nodeType !== NodeType.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    if (SKIP_TAGS.has(elementTagName(el))) return;
    for (const child of [...node.childNodes]) walkRestore(child);
  }

  for (const child of [...root.childNodes]) walkRestore(child);

  let result = root.toString();
  if (hasHtmlPlaceholderLeak(result)) {
    result = replacePlaceholdersInString(result, translations);
  }
  return result;
}

export function sanitizeHtmlTextTranslation(original: string, translated: string): string {
  if (!translated.includes("<")) return translated;
  const stripped = translated
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!stripped) return original;
  return stripped;
}

function coalesceBlockTextNodesInner(
  template: string,
  texts: string[],
  newTexts: string[],
): { template: string; texts: string[] } {
  const blockRe = new RegExp(
    `<(${HTML_BLOCK_COALESCE_TAGS})\\b[^>]*>([\\s\\S]*?)<\\/\\1>`,
    "gi",
  );

  const newTemplate = template.replace(blockRe, (full, tag: string, inner: string) => {
    if (HTML_NESTED_BLOCK_RE.test(inner)) return full;
    // Only coalesce when the block body is effectively just placeholder-backed
    // text. If markup like <img ... alt="__HXLAT_0__"> is still present,
    // collapsing would erase the element and leak its attribute text.
    const innerWithoutPlaceholders = replacePlaceholdersInString(
      inner,
      Array.from({ length: texts.length }, () => ""),
    );
    if (/<[a-z!/]/i.test(innerWithoutPlaceholders)) return full;

    const indices = collectTextPlaceholderIndices(inner);
    if (indices.length <= 1) return full;
    if (INLINE_PRESERVE_RE.test(inner)) return full;

    const merged = indices
      .map((i) => texts[i])
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    const newIdx = newTexts.length;
    newTexts.push(merged);

    const openTag = full.match(new RegExp(`<${tag}\\b[^>]*>`, "i"))![0];
    return `${openTag}${textPlaceholder(newIdx)}</${tag}>`;
  });

  return { template: newTemplate, texts: newTexts };
}

function coalesceBlockTextNodes(
  template: string,
  texts: string[],
): { template: string; texts: string[] } {
  const newTexts = [...texts];
  if (!HTML_TABLE_RE.test(template)) {
    return coalesceBlockTextNodesInner(template, texts, newTexts);
  }

  HTML_TABLE_RE.lastIndex = 0;
  let out = "";
  let cursor = 0;
  let m: RegExpExecArray | null;
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

function buildHtmlSegmentBoundary(groupId: number, boundaryIndex: number): string {
  return `${HTML_SEG_BOUNDARY_PREFIX}${groupId}_${boundaryIndex}⟧`;
}

function shouldInsertSpaceBetweenSegments(prev: string, next: string): boolean {
  if (!prev || !next) return false;
  if (CJK_BOUNDARY_RE.test(prev) || CJK_BOUNDARY_RE.test(next)) return false;
  if (/^[,.;:!?%)}\]"'”’]/u.test(next)) return false;
  if (/[([{/"'“‘-]$/u.test(prev)) return false;
  return true;
}

function shouldAttachBoundarySpaceToNext(prev: string): boolean {
  return /[.!?;:,)\]"'”’]$/u.test(prev);
}

function buildGroupedHtmlText(
  placeholderIndices: number[],
  texts: string[],
  groupId: number,
): {
  text: string;
  boundarySpaceHints: HtmlNodeGroup["boundarySpaceHints"];
} {
  let merged = texts[placeholderIndices[0]] ?? "";
  const boundarySpaceHints: HtmlNodeGroup["boundarySpaceHints"] = [];
  for (let i = 1; i < placeholderIndices.length; i++) {
    const prev = texts[placeholderIndices[i - 1]] ?? "";
    const next = texts[placeholderIndices[i]] ?? "";
    const boundary = buildHtmlSegmentBoundary(groupId, i - 1);
    if (!shouldInsertSpaceBetweenSegments(prev, next)) {
      merged += boundary;
      merged += next;
      boundarySpaceHints.push({
        trimTrailingSpaceFromPrevious: false,
        trimLeadingSpaceFromNext: false,
      });
      continue;
    }
    if (shouldAttachBoundarySpaceToNext(prev)) {
      merged += `${boundary} ${next}`;
      boundarySpaceHints.push({
        trimTrailingSpaceFromPrevious: false,
        trimLeadingSpaceFromNext: true,
      });
      continue;
    }
    merged += ` ${boundary}${next}`;
    boundarySpaceHints.push({
      trimTrailingSpaceFromPrevious: true,
      trimLeadingSpaceFromNext: false,
    });
  }
  return { text: merged, boundarySpaceHints };
}

function splitGroupedHtmlText(
  translated: string,
  groupId: number,
  segmentCount: number,
  boundarySpaceHints: HtmlNodeGroup["boundarySpaceHints"],
): string[] | null {
  const out: string[] = [];
  let cursor = 0;

  for (let i = 0; i < segmentCount - 1; i++) {
    const boundary = buildHtmlSegmentBoundary(groupId, i);
    const idx = translated.indexOf(boundary, cursor);
    if (idx < 0) return null;
    out.push(translated.slice(cursor, idx));
    cursor = idx + boundary.length;
  }

  out.push(translated.slice(cursor));
  if (out.length !== segmentCount) return null;

  for (let i = 0; i < boundarySpaceHints.length; i++) {
    const hint = boundarySpaceHints[i];
    if (!hint) continue;
    if (hint.trimTrailingSpaceFromPrevious) {
      out[i] = out[i]!.replace(/ $/, "");
    }
    if (hint.trimLeadingSpaceFromNext) {
      out[i + 1] = out[i + 1]!.replace(/^ /, "");
    }
  }

  return out;
}

function buildInlineAwareNodeGroups(
  template: string,
  texts: string[],
): HtmlNodeGroup[] {
  const groups: HtmlNodeGroup[] = [];
  const groupedIndices = new Set<number>();
  let groupId = 0;
  const root = parse(template, HTML_PARSE_OPTIONS);

  walkElementNodes(root, (el) => {
    if (!HTML_BLOCK_GROUP_TAGS.has(elementTagName(el))) return;
    const inner = el.innerHTML ?? "";
    if (!INLINE_PRESERVE_RE.test(inner) || HTML_NESTED_BLOCK_RE.test(inner)) return;

    const indices = collectTextPlaceholderIndices(inner);
    if (indices.length <= 1 || indices.some((idx) => groupedIndices.has(idx))) return;

    const innerWithoutPlaceholders = replacePlaceholdersInString(
      inner,
      Array.from({ length: texts.length }, () => ""),
    );
    const withoutInlineTags = innerWithoutPlaceholders.replace(INLINE_TAG_RE, "");
    if (/<[a-z!/]/i.test(withoutInlineTags)) return;

    const currentGroupId = groupId++;
    const grouped = buildGroupedHtmlText(indices, texts, currentGroupId);
    groups.push({
      groupId: currentGroupId,
      placeholderIndices: indices,
      parts: splitPlainText(grouped.text),
      boundarySpaceHints: grouped.boundarySpaceHints,
    });
    indices.forEach((idx) => groupedIndices.add(idx));
  });

  for (let idx = 0; idx < texts.length; idx++) {
    if (groupedIndices.has(idx)) continue;
    groups.push({
      groupId: groupId++,
      placeholderIndices: [idx],
      parts: texts[idx]!.length > LONG_TEXT_THRESHOLD ? splitPlainText(texts[idx]!) : [texts[idx]!],
      boundarySpaceHints: [],
    });
  }

  groups.sort((a, b) => (a.placeholderIndices[0] ?? 0) - (b.placeholderIndices[0] ?? 0));
  return groups;
}

function splitPlainText(text: string): string[] {
  if (text.length <= LONG_TEXT_THRESHOLD) return [text];

  const parts: string[] = [];
  let remaining = text;

  while (remaining.length > LONG_TEXT_CHUNK_CHARS) {
    let splitIdx = -1;

    const paraIdx = remaining.lastIndexOf("\n\n", LONG_TEXT_CHUNK_CHARS);
    if (paraIdx >= LONG_TEXT_CHUNK_CHARS * 0.4) splitIdx = paraIdx + 2;

    if (splitIdx < 0) {
      const sentIdx = remaining.lastIndexOf(". ", LONG_TEXT_CHUNK_CHARS);
      if (sentIdx >= LONG_TEXT_CHUNK_CHARS * 0.4) splitIdx = sentIdx + 2;
    }

    if (splitIdx <= 0) {
      const wordIdx = remaining.lastIndexOf(" ", LONG_TEXT_CHUNK_CHARS);
      splitIdx = wordIdx > 0 ? wordIdx : LONG_TEXT_CHUNK_CHARS;
    }

    parts.push(remaining.slice(0, splitIdx));
    remaining = remaining.slice(splitIdx).trimStart();
  }

  if (remaining.length > 0) parts.push(remaining);
  return parts;
}

export type HtmlNodeGroup = {
  groupId: number;
  placeholderIndices: number[];
  parts: string[];
  boundarySpaceHints: Array<{
    trimTrailingSpaceFromPrevious: boolean;
    trimLeadingSpaceFromNext: boolean;
  }>;
};

export type HtmlNodePlan = { template: string; texts: string[]; nodeGroups: HtmlNodeGroup[] };

/** Split HTML into a structural template and translatable text-node parts. */
export function htmlNodePartsOf(value: string): HtmlNodePlan {
  let { template, texts } = extractHtmlTextNodes(preprocessHtmlForTranslation(value));
  ({ template, texts } = coalesceBlockTextNodes(template, texts));
  return {
    template,
    texts,
    nodeGroups: buildInlineAwareNodeGroups(template, texts),
  };
}

export function htmlNodeTextParts(plan: HtmlNodePlan): string[] {
  return plan.nodeGroups.flatMap((group) => group.parts);
}

/**
 * True when HTML contains translatable text outside script/style/pre/code blocks.
 * Script-only embeds (e.g. Loox widget snippets) return false.
 */
export function isTranslatableHtmlContent(value: string): boolean {
  if (!isHtmlContent(value)) return false;
  return htmlNodeTextParts(htmlNodePartsOf(value)).some((part) => part.trim().length > 0);
}

/** Flatten node parts to per-marker translations for reassembly. */
export function flattenHtmlNodeTranslations(
  plan: HtmlNodePlan,
  translatePart: (part: string, partIndex: number) => string,
): string[] {
  let partIndex = 0;
  const out = [...plan.texts];

  for (const group of plan.nodeGroups) {
    const pieces = group.parts.map((part) => translatePart(part, partIndex++));
    const joined = pieces.join("");

    if (group.placeholderIndices.length === 1) {
      const idx = group.placeholderIndices[0]!;
      out[idx] = effectiveTranslation(
        plan.texts[idx] ?? "",
        sanitizeHtmlTextTranslation(plan.texts[idx] ?? "", joined.trim()),
      );
      continue;
    }

    const translatedSegments = splitGroupedHtmlText(
      joined,
      group.groupId,
      group.placeholderIndices.length,
      group.boundarySpaceHints,
    );
    if (!translatedSegments) continue;

    group.placeholderIndices.forEach((placeholderIdx, index) => {
      const original = plan.texts[placeholderIdx] ?? "";
      out[placeholderIdx] = effectiveTranslation(
        original,
        sanitizeHtmlTextTranslation(original, translatedSegments[index] ?? ""),
      );
    });
  }

  return out;
}

/** Reassemble translated text nodes back into HTML. */
export function reassembleHtmlTranslation(template: string, nodeTranslations: string[]): string {
  return restoreBrPlaceholders(restoreHtmlTextNodes(template, nodeTranslations));
}

/** Round-trip helper for tests. */
export function roundtripHtmlForTest(
  html: string,
  translateFn: (text: string, index: number) => string,
): string {
  const plan = htmlNodePartsOf(html);
  const out = flattenHtmlNodeTranslations(plan, (text, i) => translateFn(text, i));
  return reassembleHtmlTranslation(plan.template, out);
}
