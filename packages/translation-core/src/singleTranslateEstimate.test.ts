import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  estimateSingleTranslateLlmTokens,
  estimateTextTokens,
} from "./llmTranslate.js";

describe("estimateTextTokens", () => {
  it("counts latin at ~4 chars per token", () => {
    assert.equal(estimateTextTokens("abcd"), 1);
    assert.equal(estimateTextTokens("abcdefgh"), 2);
  });

  it("counts CJK roughly one token per char", () => {
    assert.equal(estimateTextTokens("你好"), 2);
  });
});

describe("estimateSingleTranslateLlmTokens", () => {
  it("grows with source text and custom prompt", () => {
    const short = estimateSingleTranslateLlmTokens({
      sourceText: "Hello",
      target: "ar",
      fieldKey: "title",
    });
    const long = estimateSingleTranslateLlmTokens({
      sourceText: "Hello ".repeat(200),
      target: "ar",
      fieldKey: "title",
    });
    const withPrompt = estimateSingleTranslateLlmTokens({
      sourceText: "Hello",
      target: "ar",
      fieldKey: "title",
      customPrompt: "Make it more formal and brand-aligned. ".repeat(20),
    });
    assert.ok(short.estimatedTokens > 0);
    assert.ok(long.estimatedTokens > short.estimatedTokens);
    assert.ok(withPrompt.estimatedTokens > short.estimatedTokens);
    assert.ok(short.systemPromptChars > 200);
    assert.equal(short.inputTokens + short.outputTokens, short.estimatedTokens);
  });

  it("includes glossary lines in system prompt size", () => {
    const base = estimateSingleTranslateLlmTokens({
      sourceText: "Shirt",
      target: "ja",
    });
    const withGlossary = estimateSingleTranslateLlmTokens({
      sourceText: "Shirt",
      target: "ja",
      glossaryLines: ['- Translate "Shirt" as "シャツ".'],
    });
    assert.ok(withGlossary.systemPromptChars > base.systemPromptChars);
    assert.ok(withGlossary.estimatedTokens > base.estimatedTokens);
  });
});
