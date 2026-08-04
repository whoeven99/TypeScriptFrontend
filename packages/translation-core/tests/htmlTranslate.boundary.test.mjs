import assert from "node:assert/strict";
import test from "node:test";
import {
  flattenHtmlNodeTranslations,
  htmlNodePartsOf,
  reassembleHtmlTranslation,
} from "../.build/htmlTranslate.js";

const INLINE_LINKS_HTML =
  "<p>Your selected AIO-6 unit: <a>AIO-6 Max</a> or <a>AIO-6 LTE</a> BMW Quick Release Module</p>";

function translateInlineDemo(source) {
  return source
    .replace(/Your selected AIO-6 unit:/g, "您选择的 AIO-6 车机：")
    .replace(/ or /g, " 或 ")
    .replace(/BMW Quick Release Module/g, "BMW快速拆卸模块");
}

function toAsciiBoundaries(text) {
  return text.replace(/\u27E6/g, "[").replace(/\u27E7/g, "]");
}

test("flattenHtmlNodeTranslations splits grouped inline segments", () => {
  const plan = htmlNodePartsOf(INLINE_LINKS_HTML);
  const merged = plan.nodeParts[0][0];
  const translated = translateInlineDemo(merged);
  const out = flattenHtmlNodeTranslations(plan, () => translated);
  const result = reassembleHtmlTranslation(plan.template, out);

  assert.match(result, /您选择的 AIO-6 车机：/);
  assert.match(result, /AIO-6 Max/);
  assert.match(result, /AIO-6 LTE/);
  assert.match(result, /BMW快速拆卸模块/);
  assert.doesNotMatch(result, /HTML_SEG_/);
  assert.doesNotMatch(result, /⟦/);
});

test("flattenHtmlNodeTranslations tolerates ASCII HTML_SEG boundaries from LLM", () => {
  const plan = htmlNodePartsOf(INLINE_LINKS_HTML);
  const merged = plan.nodeParts[0][0];
  const translated = toAsciiBoundaries(translateInlineDemo(merged));
  const out = flattenHtmlNodeTranslations(plan, () => translated);
  const result = reassembleHtmlTranslation(plan.template, out);

  assert.match(result, /您选择的 AIO-6 车机：/);
  assert.match(result, /BMW快速拆卸模块/);
  assert.doesNotMatch(result, /HTML_SEG_/);
});
