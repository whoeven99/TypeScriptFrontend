/** Product rule threshold (chars): long vs short plain; both use digest ?? CRC-32. */
export declare const VALUE_CACHE_THRESHOLD = 200;
export declare function tmKey(shopName: string, target: string, model: string, digest: string): string;
/** Returns the cached translation for a field digest, or null on miss/disabled/error. */
export declare function tmGet(shopName: string, target: string, model: string, digest: string): Promise<string | null>;
/** Stores a translation keyed by field digest. Best-effort; never throws. */
export declare function tmSet(shopName: string, target: string, model: string, digest: string, value: string): Promise<void>;
/** IEEE CRC-32 → 8-char lowercase hex (no deps). */
export declare function crc32Hex(text: string): string;
/**
 * Prefer Shopify digest; otherwise CRC-32.
 * Long (>VALUE_CACHE_THRESHOLD) and short follow the same digest ?? CRC-32 rule.
 */
export declare function valueCacheKeyId(sourceText: string, digest?: string): string;
export declare function valueCacheKey(sourceText: string, source: string, target: string, model: string, digest?: string): string;
/**
 * Look up a translation by value-cache key (digest if present, else CRC-32).
 * Returns null on miss, disabled, or error.
 */
export declare function tmGetByValue(sourceText: string, source: string, target: string, model: string, digest?: string): Promise<string | null>;
/**
 * Store a translation in the value TM. Best-effort; never throws.
 * Oversized payloads are skipped to protect Redis memory.
 */
export declare function tmSetByValue(sourceText: string, source: string, target: string, model: string, translatedText: string, digest?: string): Promise<void>;
//# sourceMappingURL=translationMemory.d.ts.map