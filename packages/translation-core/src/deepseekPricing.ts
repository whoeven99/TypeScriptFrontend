/**
 * DeepSeek API monetary cost from usage tokens × official CNY list prices.
 *
 * Source: https://api-docs.deepseek.com/zh-cn/quick_start/pricing
 * The chat/completions response does NOT return yuan — only token buckets
 * (prompt_cache_hit_tokens / prompt_cache_miss_tokens / completion_tokens).
 * Cost = tokens × price / 1e6 (docs: 扣减费用 = token 消耗量 × 模型单价).
 *
 * All settlement is in CNY (元). Optional peak 2× (Beijing 09–12 / 14–18) is off
 * until DEEPSEEK_PEAK_PRICING=true — docs say peak pricing is "soon".
 */

export type DeepSeekPriceTier = {
  /** 元 per 1M cache-hit input tokens */
  cacheHitPerMillion: number;
  /** 元 per 1M cache-miss input tokens */
  cacheMissPerMillion: number;
  /** 元 per 1M output tokens */
  outputPerMillion: number;
};

/**
 * Official CNY list prices (元 / 1M tokens) from DeepSeek 中文定价页.
 * Matches console 充值/赠送余额 deduction.
 */
export const DEEPSEEK_CNY_PRICES: Record<string, DeepSeekPriceTier> = {
  "deepseek-v4-flash": {
    cacheHitPerMillion: 0.02,
    cacheMissPerMillion: 1,
    outputPerMillion: 2,
  },
  "deepseek-v4-pro": {
    cacheHitPerMillion: 0.025,
    cacheMissPerMillion: 3,
    outputPerMillion: 6,
  },
};

/** Pin so Admin/blob can show which card was used for reconciliation. */
export const DEEPSEEK_PRICING_SOURCE =
  "api-docs.deepseek.com/zh-cn/quick_start/pricing";

export type DeepSeekCallCostEstimate = {
  /** Official CNY list × usage (元). */
  costCny: number;
  /** 1 normally; 2 when peak pricing env is enabled and clock is in peak window. */
  peakMultiplier: number;
  pricingSource: string;
  model: string;
};

function peakPricingEnabled(): boolean {
  return /^(1|true|yes)$/i.test(process.env.DEEPSEEK_PEAK_PRICING ?? "");
}

/** Beijing peak windows from DeepSeek pricing notes (when peak policy is live). */
export function isDeepSeekPeakHourBeijing(now = new Date()): boolean {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Shanghai",
    hour: "numeric",
    hour12: false,
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  return (hour >= 9 && hour < 12) || (hour >= 14 && hour < 18);
}

export function resolveDeepSeekCnyPrices(model: string): DeepSeekPriceTier | null {
  const m = model.trim().toLowerCase();
  if (!m || m === "google-translate") return null;
  if (DEEPSEEK_CNY_PRICES[m]) return DEEPSEEK_CNY_PRICES[m]!;
  // Legacy / env aliases still billed as DeepSeek — use flash list as default card.
  if (m.startsWith("deepseek")) return DEEPSEEK_CNY_PRICES["deepseek-v4-flash"]!;
  return null;
}

function roundMoney(n: number): number {
  // Keep enough precision for tiny calls; DeepSeek deducts from balance at token grain.
  return Math.round(n * 1e8) / 1e8;
}

/**
 * Estimate provider ¥ for one DeepSeek completion from API usage fields.
 * Returns null for non-DeepSeek models or empty usage.
 */
export function estimateDeepSeekCallCost(args: {
  model: string;
  promptCacheHitTokens?: number;
  promptCacheMissTokens?: number;
  inputTokens?: number;
  outputTokens?: number;
  at?: Date;
}): DeepSeekCallCostEstimate | null {
  const prices = resolveDeepSeekCnyPrices(args.model);
  if (!prices) return null;

  const hit =
    typeof args.promptCacheHitTokens === "number" && args.promptCacheHitTokens >= 0
      ? args.promptCacheHitTokens
      : 0;
  let miss =
    typeof args.promptCacheMissTokens === "number" && args.promptCacheMissTokens >= 0
      ? args.promptCacheMissTokens
      : undefined;
  if (miss === undefined && typeof args.inputTokens === "number" && args.inputTokens >= 0) {
    miss = Math.max(0, args.inputTokens - hit);
  }
  miss = miss ?? 0;
  const out =
    typeof args.outputTokens === "number" && args.outputTokens >= 0 ? args.outputTokens : 0;

  if (hit === 0 && miss === 0 && out === 0) return null;

  const peakMultiplier =
    peakPricingEnabled() && isDeepSeekPeakHourBeijing(args.at ?? new Date()) ? 2 : 1;

  const costCny = roundMoney(
    peakMultiplier *
      ((hit / 1_000_000) * prices.cacheHitPerMillion +
        (miss / 1_000_000) * prices.cacheMissPerMillion +
        (out / 1_000_000) * prices.outputPerMillion),
  );

  return {
    costCny,
    peakMultiplier,
    pricingSource: DEEPSEEK_PRICING_SOURCE,
    model: args.model.trim().toLowerCase(),
  };
}
