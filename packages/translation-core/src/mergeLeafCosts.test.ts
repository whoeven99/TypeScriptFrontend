import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mergeLeafCosts, type TranslationFieldCost } from "./llmTranslate.js";

describe("mergeLeafCosts", () => {
  it("returns undefined for empty input", () => {
    assert.equal(mergeLeafCosts([]), undefined);
    assert.equal(mergeLeafCosts([undefined, undefined]), undefined);
  });

  it("passes through a single cost", () => {
    const cost: TranslationFieldCost = {
      provider: "llm",
      model: "gpt-4.1-nano",
      requestId: "req-1",
      inputTokens: 10,
      outputTokens: 4,
      batchSize: 3,
    };
    assert.deepEqual(mergeLeafCosts([cost]), cost);
  });

  it("dedupes LLM calls by requestId and sums tokens", () => {
    const a: TranslationFieldCost = {
      provider: "llm",
      model: "gpt-4.1-nano",
      requestId: "req-1",
      inputTokens: 100,
      outputTokens: 40,
      batchSize: 5,
    };
    const b: TranslationFieldCost = {
      provider: "llm",
      model: "gpt-4.1-nano",
      requestId: "req-1",
      inputTokens: 100,
      outputTokens: 40,
      batchSize: 5,
    };
    const c: TranslationFieldCost = {
      provider: "llm",
      model: "gpt-4.1-nano",
      requestId: "req-2",
      inputTokens: 20,
      outputTokens: 8,
      batchSize: 2,
    };
    const merged = mergeLeafCosts([a, b, c]);
    assert.equal(merged?.provider, "llm");
    assert.ok(merged && "calls" in merged);
    assert.equal(merged.calls?.length, 2);
    assert.equal(merged.inputTokens, 120);
    assert.equal(merged.outputTokens, 48);
  });

  it("sums Google chars without requestId", () => {
    const merged = mergeLeafCosts([
      { provider: "google", model: "google-translate", chars: 12 },
      { provider: "google", model: "google-translate", chars: 8 },
    ]);
    assert.deepEqual(merged, {
      provider: "google",
      model: "google-translate",
      chars: 20,
    });
  });

  it("marks mixed when LLM and Google both present", () => {
    const merged = mergeLeafCosts([
      {
        provider: "llm",
        model: "gpt-4.1-nano",
        requestId: "req-1",
        inputTokens: 10,
        outputTokens: 2,
      },
      { provider: "google", model: "google-translate", chars: 5 },
    ]);
    assert.equal(merged?.provider, "mixed");
    assert.ok(merged && "calls" in merged);
    assert.equal(merged.calls?.length, 1);
    assert.equal(merged.chars, 5);
  });
});
