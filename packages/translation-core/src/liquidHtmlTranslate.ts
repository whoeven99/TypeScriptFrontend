/**
 * Liquid-template-aware HTML translation utilities.
 *
 * Shopify email/packing-slip templates embed Liquid block tags ({% ... %})
 * inside HTML. The standard HTML text-node extractor sees those tags as raw
 * text and would incorrectly send them to the LLM for translation.
 *
 * Strategy:
 *  1. Replace every Liquid block tag ({% ... %} / {%- ... -%}) with a
 *     void-like HTML element sentinel (`<ciwi-liq n="0"></ciwi-liq>`) before
 *     HTML parsing. Element sentinels stay in the structural template and are
 *     never extracted as text nodes — unlike text sentinels (⟨Ln⟩), which used
 *     to share nodes with human copy and get rewritten by the LLM.
 *  2. Run the existing `htmlNodePartsOf` on the masked content. Text nodes
 *     now contain only real human text plus Liquid output expressions
 *     ({{ ... }}) — the latter are already protected by `maskPlaceholders`
 *     inside the per-part LLM call.
 *  3. After translation + HTML reassembly, restore the element sentinels back
 *     to the original Liquid block tags.
 *
 * The Liquid output expressions ({{ ... }}) are intentionally left in-place
 * so they remain visible to `maskPlaceholders` when individual text parts are
 * sent to the LLM (e.g. "Order {{ order_name }}" → LLM sees "Order ⟦0⟧").
 */

import {
  htmlNodePartsOf,
  reassembleHtmlTranslation,
  type HtmlNodePlan,
} from "./htmlTranslate.js";

/** Custom element kept in the HTML template; not extracted as a text node. */
const LIQUID_SENT_TAG = "ciwi-liq";

function liquidSentinel(index: number): string {
  return `<${LIQUID_SENT_TAG} n="${index}"></${LIQUID_SENT_TAG}>`;
}

/**
 * Matches serialized element sentinels after node-html-parser round-trips
 * (attribute order / quoting may vary; self-closing forms accepted).
 */
const LIQUID_SENT_RE = new RegExp(
  `<${LIQUID_SENT_TAG}\\b[^>]*\\bn\\s*=\\s*["']?(\\d+)["']?[^>]*(?:\\/\\s*>|><\\/${LIQUID_SENT_TAG}>)`,
  "gi",
);

/**
 * Matches Liquid block tags including whitespace-strip variants:
 *   {% tag ... %}   {%- tag ... -%}   {%- tag ... %}   {% tag ... -%}
 *
 * Non-greedy to correctly split multiple tags on the same line.
 * [\s\S] allows multiline tags (rare, but possible in long comments).
 */
const LIQUID_BLOCK_TAG_RE = /\{%-?[\s\S]*?-?%\}/g;

/** True when the string contains at least one Liquid block tag. */
export function isLiquidTemplate(value: string): boolean {
  LIQUID_BLOCK_TAG_RE.lastIndex = 0;
  return LIQUID_BLOCK_TAG_RE.test(value);
}

/**
 * Replace every Liquid block tag with an HTML element sentinel.
 * Returns the masked string and the original tokens array (index → original).
 */
export function maskLiquidBlockTags(value: string): { masked: string; tokens: string[] } {
  const tokens: string[] = [];
  LIQUID_BLOCK_TAG_RE.lastIndex = 0;
  const masked = value.replace(LIQUID_BLOCK_TAG_RE, (match) => {
    const i = tokens.length;
    tokens.push(match);
    return liquidSentinel(i);
  });
  return { masked, tokens };
}

/** Restore element sentinels back to original Liquid block tags. */
export function restoreLiquidBlockTags(text: string, tokens: string[]): string {
  LIQUID_SENT_RE.lastIndex = 0;
  return text.replace(LIQUID_SENT_RE, (_m, d: string) => tokens[Number(d)] ?? "");
}

export type LiquidHtmlNodePlan = {
  plan: HtmlNodePlan;
  liquidTokens: string[];
};

/**
 * Liquid-aware wrapper around `htmlNodePartsOf`.
 *
 * Masks Liquid block tags first, then delegates to the standard HTML
 * text-node extractor. The returned `liquidTokens` must be passed to
 * `reassembleLiquidHtmlTranslation` after translation to restore the tags.
 */
export function liquidHtmlNodePartsOf(value: string): LiquidHtmlNodePlan {
  const { masked, tokens } = maskLiquidBlockTags(value);
  const plan = htmlNodePartsOf(masked);
  return { plan, liquidTokens: tokens };
}

/**
 * Reassemble a translated Liquid HTML template.
 *
 * 1. Restores HTML text-node placeholders (standard step).
 * 2. Restores Liquid block tag sentinels to original tags.
 */
export function reassembleLiquidHtmlTranslation(
  template: string,
  nodeTranslations: string[],
  liquidTokens: string[],
): string {
  const assembled = reassembleHtmlTranslation(template, nodeTranslations);
  return restoreLiquidBlockTags(assembled, liquidTokens);
}
