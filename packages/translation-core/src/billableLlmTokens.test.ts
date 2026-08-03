import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { billableLlmTokens } from "./llmTranslate.js";

describe("billableLlmTokens", () => {
  it("excludes cache hit when DeepSeek breakdown is present", () => {
    assert.equal(
      billableLlmTokens({
        totalTokens: 1000,
        inputTokens: 800,
        outputTokens: 200,
        promptCacheHitTokens: 700,
        promptCacheMissTokens: 100,
      }),
      300, // miss 100 + out 200
    );
  });

  it("derives miss from input − hit when miss omitted", () => {
    assert.equal(
      billableLlmTokens({
        totalTokens: 500,
        inputTokens: 400,
        outputTokens: 100,
        promptCacheHitTokens: 350,
      }),
      150, // miss 50 + out 100
    );
  });

  it("falls back to totalTokens when no cache hit", () => {
    assert.equal(
      billableLlmTokens({
        totalTokens: 500,
        inputTokens: 400,
        outputTokens: 100,
      }),
      500,
    );
  });

  it("ignores zero cache hit and uses total", () => {
    assert.equal(
      billableLlmTokens({
        totalTokens: 500,
        inputTokens: 400,
        outputTokens: 100,
        promptCacheHitTokens: 0,
        promptCacheMissTokens: 400,
      }),
      500,
    );
  });
});
