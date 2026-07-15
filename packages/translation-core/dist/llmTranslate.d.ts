import { htmlNodePartsOf, roundtripHtmlForTest } from "./htmlTranslate.js";
type PoolInitOptions = {
    model?: string;
};
/** Map shop domain → DeepSeek `user_id` ([a-zA-Z0-9\-_]+, max 512). */
export declare function sanitizeDeepSeekUserId(shop: string): string;
/** Per-account concurrent in-flight request cap from DeepSeek docs (overridable). */
export declare function resolveDeepSeekAccountConcurrencyLimit(model: string): number;
export declare function resolveDeepSeekPoolConcurrency(model: string): {
    accountLimit: number;
    ceiling: number;
    initial: number;
};
type SlotRateLimit = {
    limitReq: number;
    remainingReq: number;
    resetReqMs: number;
    limitTok: number;
    remainingTok: number;
    resetTokMs: number;
};
type KeySlotStats = {
    calls: number;
    tokens: number;
    totalLatencyMs: number;
    throttleCount: number;
    errors: number;
    errorsByKind: LlmErrorTally;
};
type LlmTransport = {
    kind: "deepseek-fetch";
    apiKey: string;
    chatUrl: string;
};
type KeySlot = {
    transport: LlmTransport;
    model: string;
    label: string;
    throttledUntil: number;
    rateLimit: SlotRateLimit | null;
    stats: KeySlotStats;
};
/** Coarse classification of a non-throttle LLM call failure (telemetry + backoff). */
export type LlmErrorKind = "timeout" | "parse" | "http" | "api" | "other";
/** Per-kind tally of failed call attempts. */
export type LlmErrorTally = {
    timeout: number;
    parse: number;
    http: number;
    api: number;
    other: number;
};
export declare function gptConfigured(): boolean;
/** 该 aiModel 是否走 GPT（gpt-* 前缀）且已配置 key。 */
export declare function isGptModel(aiModel: string | undefined | null): boolean;
export declare function kimiConfigured(): boolean;
/** 该 aiModel 是否走 Kimi（kimi* 前缀）且已配置 key。 */
export declare function isKimiModel(aiModel: string | undefined | null): boolean;
export declare function geminiConfigured(): boolean;
/** 该 aiModel 是否走 Gemini（gemini* 前缀）且已配置 key。 */
export declare function isGeminiModel(aiModel: string | undefined | null): boolean;
declare class LLMKeyPool {
    private readonly slots;
    private cursor;
    private readonly sem;
    /** EWMA of LLM call durations (ms). Seed at 3 s — conservative starting point. */
    private readonly latency;
    /** EWMA of tokens consumed per request. Used for TPM-based concurrency calc. */
    private readonly tokPerReq;
    /** Per-slot quota log throttle (epoch ms). */
    private readonly _quotaLogAt;
    /** Last logged quota snapshot per slot — skip duplicate lines. */
    private readonly _lastQuotaSnap;
    /** Slots that have logged their first successful response. */
    private readonly _firstResponseLogged;
    private static readonly QUOTA_LOG_INTERVAL_MS;
    /** True once any slot has reported recognised rate-limit headers. */
    private _hasSeenAnyHeaders;
    /** Successful call counter — drives additive-increase ramp in blind mode. */
    private _blindSuccesses;
    /**
     * Max concurrency per key in blind mode.
     * Default 8; override with LLM_BLIND_PER_KEY_MAX env var.
     * With N keys the hard ceiling is N × this value (also bounded by MAX_POOL_CONCURRENCY).
     */
    private readonly _blindPerKeyCap;
    /** DeepSeek: account-level in-flight cap. */
    private readonly _limitMode;
    private _deepseekConcCeiling;
    private _deepseekRampSuccesses;
    /** EWMA of recent timeout occurrences (1=timeout, 0=ok). Congestion signal. */
    private readonly _timeoutRate;
    /** Wall-clock anchor for time-based timeout-rate decay (not success-driven). */
    private _timeoutRateDecayedAt;
    /** Epoch ms of last LLM timeout — drives timed recovery. */
    private _lastTimeoutAt;
    /** Epoch ms of last timed +N recovery step. */
    private _lastTimedRecoveryAt;
    /** Epoch ms of last soft backoff — rate-limits successive cuts. */
    private _lastSoftBackoffAt;
    /** Pool-level count of fields that exhausted retries and fell back to original. */
    private _terminalFallbacks;
    constructor(slots: KeySlot[], options?: PoolInitOptions);
    get size(): number;
    /**
     * Acquire a key slot + semaphore slot for one LLM call.
     * Blocks if at max concurrency or if all slots are throttled.
     *
     * Caller MUST call `release()` in a finally block.
     * Caller SHOULD call `onResponse()` on success and `onThrottle()` on 429.
     */
    acquire(): Promise<{
        transport: LlmTransport;
        model: string;
        label: string;
        onThrottle: (waitMs: number) => void;
        onResponse: (headers: Record<string, string>, durationMs: number, tokens: number, limitHints?: string[]) => void;
        onError: (kind: LlmErrorKind) => void;
        release: () => void;
    }>;
    private _applyHeaders;
    /** Log first response per slot, then quota changes (throttled). */
    private _logResponseQuota;
    private _maybeLogQuota;
    /**
     * Additive increase: after every RAMP_STEP successful calls without a 429,
     * increment the semaphore cap by 1.  The ceiling is slots × _blindPerKeyCap
     * (default 8 per key, so 24 total with 3 keys).
     */
    private _blindOnSuccess;
    /**
     * Multiplicative decrease: on a 429, halve the concurrency cap and reset the
     * success counter so the ramp restarts from the new lower baseline.
     */
    /**
     * DeepSeek docs: limit = concurrent in-flight requests per account.
     * Ramp toward documented ceiling; back off on 429.
     */
    private _deepseekOnSuccess;
    /** Feed a failed attempt into the congestion guard. Timeouts drive the brake. */
    private _onAttemptError;
    /**
     * Decay timeout-rate EWMA toward 0 on wall clock — avoids staying "guilty" at
     * floor 4 when successes are sparse (40s+ latency) and success-count decay stalls.
     */
    private _applyTimeoutRateTimeDecay;
    /**
     * Timed recovery: if no recent timeouts, add concurrency on an interval.
     * Recovery speed adapts to conditions — fast when healthy, cautious when near
     * the ceiling or when latency is elevated. This ensures the pool climbs back
     * from a backoff-induced floor without waiting for the success-count ramp
     * (which stalls when concurrency is very low and successes are sparse).
     */
    private _maybeTimedRecovery;
    /** Multiplicative concurrency cut from a soft (latency/timeout) congestion signal. */
    private _softBackoff;
    /**
     * Adaptive "wait for first token" budget (ms). When the endpoint is slow or
     * queued, the first token legitimately takes longer; being patient here turns
     * a premature abort + retry (which wastes work AND adds load) into a slow
     * success. Scales with observed latency, clamped to a sane floor/ceiling.
     */
    firstTokenBudgetMs(): number;
    /** Record fields that exhausted retries and fell back to the original text. */
    recordTerminalFallback(n?: number): void;
    /** Aggregate failed-attempt counts by cause + terminal fallbacks across slots. */
    getErrorBreakdown(): {
        byKind: LlmErrorTally;
        terminalFallbacks: number;
    };
    private _deepseekOnThrottle;
    private _blindOnThrottle;
    private _quotaSummary;
    /**
     * Recalculate the safe concurrency ceiling based on current rate-limit state.
     *
     * For each active slot:
     *   safeRPS   = remainingRequests / windowRemainSeconds   (sustainable req/s)
     *   safeConc  = safeRPS × avgLatencySeconds               (Little's Law)
     *
     * Both the requests dimension and the token dimension are evaluated; the
     * stricter constraint wins.  Results are summed across slots and clamped to
     * [1, MAX_POOL_CONCURRENCY].
     */
    private _recalc;
    getKeyStats(): Array<{
        label: string;
        calls: number;
        tokens: number;
        avgLatencyMs: number;
        throttleCount: number;
        errors: number;
        errorsByKind: LlmErrorTally;
        poolConcurrency: number;
        rateLimit: SlotRateLimit | null;
    }>;
}
/** 仅测试用：切换 provider/env 后重建 key pool */
export declare function resetLlmPoolForTests(): void;
/**
 * Write the current key-pool stats snapshot to Redis.
 * Throttled internally to at most one write per 10 seconds.
 * Safe to call in a hot path (progress callback, etc.).
 */
/** Synchronous snapshot of LLM key pool stats. Returns [] if pool not yet initialised. */
export declare function getLlmPoolStats(): ReturnType<LLMKeyPool["getKeyStats"]>;
/** Aggregate failed-attempt counts by cause + terminal fallbacks. For QPS telemetry. */
export declare function getLlmErrorBreakdown(): {
    byKind: LlmErrorTally;
    terminalFallbacks: number;
};
/** Record that `n` fields exhausted retries and fell back to the original text. */
export declare function recordLlmTerminalFallback(n?: number): void;
export declare function flushKeyStats(): Promise<void>;
/** 由额度逻辑调用：设置某 shop 的 LLM 并发上限（0=禁止新调用；硬停由调用方 abort 负责）。 */
export declare function setShopQuotaCap(shop: string, cap: number): void;
type Engine = "llm" | "google";
/**
 * The engine actually used for a job — real data for Cosmos. With routing on, it
 * reports "auto" plus the configured engines; when forced, the single engine.
 */
export declare function resolveEngine(aiModel: string): {
    provider: string;
    model: string;
};
export type TranslateItem = {
    key: string;
    value: string;
    digest: string;
    /** Shopify translatableContent.type from INIT blob. */
    shopifyType?: string;
};
export type TranslateResult = {
    key: string;
    translatedValue: string;
    digest: string;
    /** "translated" = produced by the engine; "fallback" = engine failed, original text returned. */
    status: "translated" | "fallback";
};
export declare function isHandleFieldKey(key: string): boolean;
/** Align with SpringBackend StringUtils.replaceHyphensWithSpaces before handle LLM. */
export declare function prepareHandleSourceText(value: string): string;
export declare function alreadyInTarget(text: string, source: string, target: string): boolean;
/**
 * Returns true if `text` contains at least one character from the source
 * language's script. Used internally by alreadyInTarget.
 */
export declare function containsSourceScript(text: string, source: string): boolean;
export declare function classifyField(key: string, value?: string, shopifyType?: string): "skip" | "html" | "json" | "list" | "plain";
/**
 * Number of translation units (nodes) a field expands into: HTML → text-node
 * count, plain → split-part count, skip → 0. Used for node-level progress so the
 * total computed at init matches what translate processes.
 */
export declare function countFieldUnits(key: string, value: string, shopifyType?: string): number;
/** LLM-first engine order ⇒ rich tier (HTML/JSON/long plain). Google-first ⇒ trivial. */
export declare function resolveBatchLimits(order: Engine[]): {
    maxChars: number;
    maxItems: number;
};
/** Scale timeout with batch size so large (but capped) batches get more wall clock. */
export declare function llmTimeoutMsForBatch(itemCount: number): number;
/**
 * Run `fn` over `items` with at most `concurrency` tasks in-flight at a time.
 * Preserves ordering in the returned array. Exported so translateWorker can
 * reuse it for chunk-level parallelism.
 */
export declare function pAll<T, R>(items: T[], concurrency: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]>;
export { htmlNodePartsOf as htmlNodePartsOfForTest, roundtripHtmlForTest };
export { looksLikeUntranslated, looksLikeWrongScriptLeak } from "./translateQuality.js";
/** @internal Exported for unit tests. */
export { maskPlaceholders as maskPlaceholdersForTest } from "./placeholderMask.js";
export type ResourceInput = {
    resourceId: string;
    fields: TranslateItem[];
};
export type ResourceResult = {
    resourceId: string;
    results: TranslateResult[];
};
/** Per-engine-model tally of how much content each engine translated. */
export type EngineUsage = Record<string, {
    units: number;
    chars: number;
    tokens: number;
}>;
export type TranslateChunkResult = {
    resources: ResourceResult[];
    usage: EngineUsage;
};
export declare function mergeEngineUsage(into: EngineUsage, from: EngineUsage): void;
/**
 * Translate every field across a whole chunk of resources in one pass.
 *
 * Key optimizations over per-resource translation:
 *  - Cross-resource batching: identical-engine text units from all resources are
 *    translated together (fewer round-trips, better prompt-cache amortization).
 *  - Dedup: each unique (engine-order, text) is translated once and reused
 *    everywhere it occurs in the chunk.
 *
 * Engine selection: cost-tiered routing (Google for short/simple, DeepSeek for rich)
 * with cross-engine fallback, unless the job sets aiModel=google-translate.
 * Placeholders are masked across all engines; TM cache keyed by tier model.
 */
export type TranslatedResourceOutput = {
    resourceId: string;
    results: TranslateResult[];
};
export type TranslateResourcesOptions = {
    /** 与 TSF `isHandle` 对齐：`false` 时 handle 原样跳过；默认 `true`（INIT 已过滤时 blob 里本就不含 handle）。 */
    translateHandle?: boolean;
    /**
     * 用户自定义提示词：描述本次翻译的方向/风格，注入 system prompt。
     * 非空时默认跳过 TM 缓存读写（避免命中旧缓存 / 污染共享缓存）。
     */
    customPrompt?: string;
    /** 跳过 TM 缓存读取，强制走翻译引擎。管理翻译页手动点击翻译时应为 true。 */
    skipCacheRead?: boolean;
    /** 跳过 TM 缓存写入。批量任务带 customPrompt 时默认为 true。 */
    skipCacheWrite?: boolean;
    /**
     * 管理页单条翻译专用：把每次 LLM 调用的原文 / prompt / raw 完整打到日志。
     * 批量 worker 路径不要开启。
     */
    logSingleTranslate?: boolean;
};
export declare function translateResources(resources: ResourceInput[], source: string, target: string, aiModel: string, shopName: string, onProgress?: (doneUnitsDelta: number, tokensDelta: number) => Promise<void>, onResourceDone?: (resource: TranslatedResourceOutput) => Promise<void>, shouldAbort?: () => boolean | Promise<boolean>, options?: TranslateResourcesOptions): Promise<TranslateChunkResult>;
/**
 * Translate all fields for a single resource. Thin wrapper over translateResources.
 */
export declare function translateBatch(items: TranslateItem[], source: string, target: string, aiModel: string, shopName: string, options?: TranslateResourcesOptions): Promise<TranslateResult[]>;
//# sourceMappingURL=llmTranslate.d.ts.map