import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { estimateDeepSeekCallCost } from "./deepseekPricing.js";

describe("estimateDeepSeekCallCost", () => {
  it("matches flash CNY list card: hit+miss+out → 元", () => {
    // 700 hit, 100 miss, 200 out on deepseek-v4-flash
    // CNY = 700*0.02/1e6 + 100*1/1e6 + 200*2/1e6
    //     = 0.000014 + 0.0001 + 0.0004 = 0.000514
    const est = estimateDeepSeekCallCost({
      model: "deepseek-v4-flash",
      promptCacheHitTokens: 700,
      promptCacheMissTokens: 100,
      outputTokens: 200,
    });
    assert.ok(est);
    assert.equal(est!.costCny, 0.000514);
    assert.equal(est!.peakMultiplier, 1);
  });

  it("returns null for non-DeepSeek models", () => {
    assert.equal(
      estimateDeepSeekCallCost({
        model: "gpt-4.1-nano",
        inputTokens: 100,
        outputTokens: 50,
      }),
      null,
    );
  });

  it("uses flash CNY card for legacy deepseek-chat alias", () => {
    const est = estimateDeepSeekCallCost({
      model: "deepseek-chat",
      promptCacheMissTokens: 1_000_000,
      outputTokens: 0,
    });
    assert.ok(est);
    assert.equal(est!.costCny, 1);
  });

  it("matches pro CNY miss rate (3元/1M)", () => {
    const est = estimateDeepSeekCallCost({
      model: "deepseek-v4-pro",
      promptCacheMissTokens: 1_000_000,
      outputTokens: 0,
    });
    assert.ok(est);
    assert.equal(est!.costCny, 3);
  });
});
