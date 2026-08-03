/**
 * Shop-scan pacing knobs. Defaults favor a flat CPU curve over speed —
 * metrics scans have no hard deadline.
 *
 * Env:
 *   SHOP_SCAN_DRAIN_MAX (default 1) — shops per worker tick
 *   SHOP_SCAN_BULK_DOWNLOAD_CONCURRENCY (default 1)
 *   SHOP_SCAN_BULK_SUBMIT_WINDOW (default 2)
 *   SHOP_SCAN_JSONL_YIELD_EVERY_LINES (default 200; 0 = off)
 *   SHOP_SCAN_JSONL_YIELD_MS (default 25)
 *   SHOP_SCAN_INTER_SHOP_DELAY_MS (default 5000; after each completed shop)
 */

function positiveInt(envName: string, fallback: number, clamp?: {
  min?: number;
  max?: number;
}): number {
  const n = Number(process.env[envName]);
  let value = Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
  if (clamp?.min != null) value = Math.max(clamp.min, value);
  if (clamp?.max != null) value = Math.min(clamp.max, value);
  return value;
}

function nonNegativeInt(envName: string, fallback: number): number {
  const n = Number(process.env[envName]);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.floor(n);
}

/** Shops claimed per runShopScanWorker invocation (overlapping ticks are also serialized). */
export function getShopScanDrainMax(): number {
  return positiveInt("SHOP_SCAN_DRAIN_MAX", 1, { min: 1, max: 10 });
}

/** Parallel JSONL downloads while counting one shop (independent of init bulk). */
export function getShopScanBulkDownloadConcurrency(): number {
  return positiveInt("SHOP_SCAN_BULK_DOWNLOAD_CONCURRENCY", 1, {
    min: 1,
    max: 5,
  });
}

/** Shopify bulk submit window for scan counts (lower = fewer bursts). */
export function getShopScanBulkSubmitWindow(): number {
  return positiveInt("SHOP_SCAN_BULK_SUBMIT_WINDOW", 2, { min: 1, max: 5 });
}

/** Yield during JSONL parse every N resource lines (0 disables). */
export function getShopScanJsonlYieldEveryLines(): number {
  return nonNegativeInt("SHOP_SCAN_JSONL_YIELD_EVERY_LINES", 200);
}

/** Sleep ms when JSONL yield triggers. */
export function getShopScanJsonlYieldMs(): number {
  return nonNegativeInt("SHOP_SCAN_JSONL_YIELD_MS", 25);
}

/** Pause after finishing one shop before claiming another in the same tick. */
export function getShopScanInterShopDelayMs(): number {
  return nonNegativeInt("SHOP_SCAN_INTER_SHOP_DELAY_MS", 5_000);
}
