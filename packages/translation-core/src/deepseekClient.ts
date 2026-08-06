/** DeepSeek HTTP streaming client + model / concurrency helpers. */

import {
  LlmRateLimitError,
  LlmTimeoutError,
} from "./llmErrors.js";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type LlmTransport = { kind: "deepseek-fetch"; apiKey: string; chatUrl: string };

export type ChatCompletionInvokeResult = {
  content: string;
  tokens: number;
  inputTokens?: number;
  outputTokens?: number;
  /** DeepSeek: usage.prompt_cache_hit_tokens (billed at cache-hit rate). */
  promptCacheHitTokens?: number;
  /** DeepSeek: usage.prompt_cache_miss_tokens (billed at cache-miss rate). */
  promptCacheMissTokens?: number;
  requestId?: string;
  response: Response;
  limitHints: string[];
};

export type LlmUsageTokens = {
  tokens: number;
  inputTokens?: number;
  outputTokens?: number;
  promptCacheHitTokens?: number;
  promptCacheMissTokens?: number;
};

/** Provider usage object — DeepSeek adds prompt_cache_* ; OpenAI-style may use prompt_tokens_details. */
export type ApiUsageShape = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  prompt_cache_hit_tokens?: number;
  prompt_cache_miss_tokens?: number;
  prompt_tokens_details?: { cached_tokens?: number };
};

/** Streaming idle: no token for this long after generation started → abort. */
export const LLM_IDLE_TIMEOUT_MS = Math.max(
  10_000,
  Number(process.env.TRANSLATE_LLM_IDLE_TIMEOUT_MS) || 300_000,
);
/**
 * 「等首个 token」窗口下限；实际上限由 `firstTokenBudgetMs()` 自适应，不超过
 * `LLM_FIRST_TOKEN_TIMEOUT_MAX_MS`。默认与 idle 对齐，避免排队中被过早砍掉。
 */
export const LLM_FIRST_TOKEN_TIMEOUT_MS = Math.max(
  LLM_IDLE_TIMEOUT_MS,
  Number(process.env.TRANSLATE_LLM_FIRST_TOKEN_TIMEOUT_MS) || 180_000,
);
/** Multiplier on observed avg latency for the adaptive first-token budget. */
export const LLM_FIRST_TOKEN_LATENCY_FACTOR = Math.max(
  1,
  Number(process.env.TRANSLATE_LLM_FIRST_TOKEN_LATENCY_FACTOR) || 6,
);
/** Hard ceiling on the adaptive first-token wait (ms). */
export const LLM_FIRST_TOKEN_TIMEOUT_MAX_MS = Math.max(
  LLM_FIRST_TOKEN_TIMEOUT_MS,
  Number(process.env.TRANSLATE_LLM_FIRST_TOKEN_TIMEOUT_MAX_MS) || 300_000,
);

/**
 * Hard ceiling on pool concurrency — emergency brake only.
 * Under normal operation the adaptive semaphore stays well below this because
 * `remaining/reset × latency` is naturally bounded by the API's own capacity.
 * Only hits in pathological cases (e.g. provider returns wildly optimistic headers).
 * Not intended as an operational knob; tune key count instead.
 */
export const MAX_POOL_CONCURRENCY = Math.max(1, Number(process.env.LLM_MAX_CONCURRENCY) || 512);

/** Map shop domain → DeepSeek `user_id` ([a-zA-Z0-9\-_]+, max 512). */
export function sanitizeDeepSeekUserId(shop: string): string {
  const normalized = shop.trim().toLowerCase().replace(/[^a-zA-Z0-9\-_]/g, "_");
  const id = normalized.slice(0, 512);
  return id.length > 0 ? id : "unknown_shop";
}

/** Per-account concurrent in-flight request cap from DeepSeek docs (overridable). */
export function resolveDeepSeekAccountConcurrencyLimit(model: string): number {
  const override = Number(process.env.DEEPSEEK_CONCURRENCY_LIMIT);
  if (Number.isFinite(override) && override > 0) return Math.floor(override);

  const m = model.trim().toLowerCase();
  if (m.includes("flash")) return 2500;
  return 500;
}

export function resolveDeepSeekPoolConcurrency(model: string): {
  accountLimit: number;
  ceiling: number;
  initial: number;
} {
  const accountLimit = resolveDeepSeekAccountConcurrencyLimit(model);
  const util = Math.min(
    1,
    Math.max(0.1, Number(process.env.DEEPSEEK_CONCURRENCY_UTIL) || 0.45),
  );
  const ceiling = Math.min(
    MAX_POOL_CONCURRENCY,
    Math.max(1, Math.floor(accountLimit * util)),
  );
  const initialOverride = Number(process.env.DEEPSEEK_INITIAL_CONCURRENCY);
  // Start conservatively and let the latency-aware ramp find the throughput knee.
  // The account in-flight limit is large (500 pro / 2500 flash), but a single
  // slow endpoint saturates long before that: opening at ~40% of the ceiling
  // (≈205 for flash) drove per-request latency to 40s+ and a timeout storm.
  // Begin near 6% of the safe ceiling (floor 48) — high enough to parallelise
  // the first wave, low enough that the congestion guard (high latency / timeout
// rate → shed concurrency) can keep us off the cliff while success-based ramp and
// timed recovery (+4 / 15s when quiet) climb back from the soft floor (16).
  const initial = Number.isFinite(initialOverride) && initialOverride > 0
    ? Math.min(Math.floor(initialOverride), ceiling)
    : Math.min(Math.max(48, Math.floor(ceiling * 0.06)), ceiling);
  return { accountLimit, ceiling, initial };
}

/** Map DEEPSEEK_BASE_URL → POST .../chat/completions (DeepSeek native endpoint). */
export function resolveDeepSeekChatCompletionsUrl(baseURL: string): string {
  const base = baseURL.trim().replace(/\/+$/, "");
  if (base.endsWith("/chat/completions")) return base;
  return `${base}/chat/completions`;
}

export function usageFromApi(usage?: ApiUsageShape): LlmUsageTokens {
  const inputTokens =
    typeof usage?.prompt_tokens === "number" && usage.prompt_tokens >= 0
      ? usage.prompt_tokens
      : undefined;
  const outputTokens =
    typeof usage?.completion_tokens === "number" && usage.completion_tokens >= 0
      ? usage.completion_tokens
      : undefined;
  const total =
    typeof usage?.total_tokens === "number" && usage.total_tokens >= 0
      ? usage.total_tokens
      : (inputTokens ?? 0) + (outputTokens ?? 0);

  let promptCacheHitTokens: number | undefined;
  let promptCacheMissTokens: number | undefined;
  if (
    typeof usage?.prompt_cache_hit_tokens === "number" &&
    usage.prompt_cache_hit_tokens >= 0
  ) {
    promptCacheHitTokens = usage.prompt_cache_hit_tokens;
  } else if (
    typeof usage?.prompt_tokens_details?.cached_tokens === "number" &&
    usage.prompt_tokens_details.cached_tokens >= 0
  ) {
    // OpenAI / Azure-style cached input breakdown.
    promptCacheHitTokens = usage.prompt_tokens_details.cached_tokens;
  }
  if (
    typeof usage?.prompt_cache_miss_tokens === "number" &&
    usage.prompt_cache_miss_tokens >= 0
  ) {
    promptCacheMissTokens = usage.prompt_cache_miss_tokens;
  } else if (
    promptCacheHitTokens !== undefined &&
    inputTokens !== undefined &&
    inputTokens >= promptCacheHitTokens
  ) {
    promptCacheMissTokens = inputTokens - promptCacheHitTokens;
  }

  return {
    tokens: total,
    inputTokens,
    outputTokens,
    promptCacheHitTokens,
    promptCacheMissTokens,
  };
}

export function requestIdFromHeaders(headers: Headers): string | undefined {
  for (const name of ["x-request-id", "x-ms-request-id", "request-id"]) {
    const v = headers.get(name)?.trim();
    if (v) return v;
  }
  return undefined;
}

/**
 * Pull a JSON string field's value out of a raw JSON line WITHOUT parsing the
 * whole object. Returns the decoded string, or null if the field is absent /
 * null / not a string. Escape-aware (\", \\, \n, \uXXXX, surrogate pairs).
 *
 * Hot SSE path: DeepSeek streams one event per token, so a full `JSON.parse`
 * per event (allocating the id/model/choices/delta object graph each time) is
 * the worker's single biggest CPU sink at high concurrency. Scanning out just
 * `delta.content` skips all of that. Matches the FIRST `"content":` — that is
 * `delta.content` (`reasoning_content` has no `"` before `content`, so it never
 * false-matches), and any literal `"content":` inside the value is consumed by
 * the escape-aware scan, not re-matched.
 */
export function extractJsonStringField(raw: string, field: string): string | null {
  const needle = `"${field}":`;
  let i = raw.indexOf(needle);
  if (i < 0) return null;
  i += needle.length;
  while (i < raw.length && (raw[i] === " " || raw[i] === "\t")) i++;
  if (raw[i] !== '"') return null; // null / number / object → not a plain string
  i++; // past opening quote
  let out = "";
  let runStart = i;
  for (; i < raw.length; i++) {
    const c = raw.charCodeAt(i);
    if (c === 34 /* " */) {
      return out + raw.slice(runStart, i);
    }
    if (c === 92 /* \ */) {
      out += raw.slice(runStart, i);
      i++;
      const e = raw[i];
      switch (e) {
        case '"': out += '"'; break;
        case "\\": out += "\\"; break;
        case "/": out += "/"; break;
        case "n": out += "\n"; break;
        case "t": out += "\t"; break;
        case "r": out += "\r"; break;
        case "b": out += "\b"; break;
        case "f": out += "\f"; break;
        case "u": {
          const hex = raw.slice(i + 1, i + 5);
          if (hex.length === 4) {
            out += String.fromCharCode(parseInt(hex, 16));
            i += 4;
          }
          break;
        }
        default: out += e ?? ""; break;
      }
      runStart = i + 1;
    }
  }
  // Unterminated string — only possible for a non-newline-terminated trailing
  // fragment; signal "no complete value" so the caller never appends a partial.
  return null;
}

async function fetchDeepSeekChatCompletion(
  apiKey: string,
  chatUrl: string,
  model: string,
  messages: ChatMessage[],
  timeoutMs: number,
  firstTokenTimeoutMs: number,
  userId?: string,
): Promise<ChatCompletionInvokeResult> {
  // Stream the completion so a slow-but-progressing response is NOT killed:
  // the timeout is on the *idle gap* between tokens, not the total wall clock.
  // A truly stuck connection still trips (idle), and a runaway response trips the
  // hard cap. This recovers the compute otherwise lost when a non-streaming
  // request is aborted at 90% done and re-sent from scratch.
  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: 0.1,
    response_format: { type: "json_object" },
    stream: true,
    stream_options: { include_usage: true },
  };
  if (userId) body.user_id = userId;

  const controller = new AbortController();
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  let gotContent = false; // 收到首个 content token 前用宽松窗口，之后用收紧 idle 窗口
  const armIdle = () => {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(
      () => controller.abort(new LlmTimeoutError(gotContent ? "idle" : "first-token")),
      gotContent ? LLM_IDLE_TIMEOUT_MS : firstTokenTimeoutMs,
    );
  };
  const hardTimer = setTimeout(
    () => controller.abort(new LlmTimeoutError("hard")),
    timeoutMs,
  );
  armIdle();

  try {
    const resp = await fetch(chatUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (resp.status === 429) {
      throw new LlmRateLimitError(resp);
    }
    if (!resp.ok) {
      throw new Error(`DeepSeek HTTP ${resp.status}: ${await resp.text()}`);
    }
    if (!resp.body) {
      throw new Error("DeepSeek stream: empty response body");
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let scanFrom = 0; // resume \n search here — avoids O(n²) buffer.slice per line
    let content = "";
    let tokens = 0;
    let inputTokens: number | undefined;
    let outputTokens: number | undefined;
    let promptCacheHitTokens: number | undefined;
    let promptCacheMissTokens: number | undefined;
    let requestId: string | undefined;
    let apiErrorMsg: string | undefined;

    const handleLine = (line: string): void => {
      if (!line.startsWith("data:")) return;
      const data = line.slice(5).trim();
      if (data === "" || data === "[DONE]") return;

      // Completion id appears on most SSE chunks; capture once for batch correlation.
      if (!requestId) {
        const id = extractJsonStringField(data, "id");
        if (id) requestId = id;
      }

      // Fast path: extract delta.content without JSON.parse-ing the whole event.
      // Runs once per token — the dominant CPU cost under concurrency. A content
      // delta never carries usage/error, so we're done with this line.
      const delta = extractJsonStringField(data, "content");
      if (delta && delta.length > 0) {
        content += delta;
        if (!gotContent) {
          gotContent = true; // 开始吐字 → 收紧空闲窗口（中途卡死更快发现）
          armIdle();
        }
        return;
      }

      // Slow path (rare): usage tally (final event) / error / role-only delta.
      if (
        data.includes('"total_tokens"') ||
        data.includes('"prompt_tokens"') ||
        data.includes('"prompt_cache_') ||
        data.includes('"usage"') ||
        data.includes('"error"')
      ) {
        try {
          const evt = JSON.parse(data) as {
            id?: string;
            usage?: ApiUsageShape;
            error?: { message?: string };
          };
          if (evt.error?.message) apiErrorMsg = evt.error.message;
          if (!requestId && typeof evt.id === "string" && evt.id.trim()) {
            requestId = evt.id.trim();
          }
          if (evt.usage) {
            const u = usageFromApi(evt.usage);
            if (u.tokens > 0) tokens = u.tokens;
            if (u.inputTokens !== undefined) inputTokens = u.inputTokens;
            if (u.outputTokens !== undefined) outputTokens = u.outputTokens;
            if (u.promptCacheHitTokens !== undefined) {
              promptCacheHitTokens = u.promptCacheHitTokens;
            }
            if (u.promptCacheMissTokens !== undefined) {
              promptCacheMissTokens = u.promptCacheMissTokens;
            }
          }
        } catch {
          // partial/keepalive line — wait for more bytes
        }
      }
    };

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      armIdle(); // got bytes → reset the idle window
      buffer += decoder.decode(value, { stream: true });

      let nl: number;
      while ((nl = buffer.indexOf("\n", scanFrom)) >= 0) {
        handleLine(buffer.slice(scanFrom, nl).trim());
        scanFrom = nl + 1;
      }
      // Compact once per read: drop consumed prefix in a single slice (not per line).
      if (scanFrom > 0) {
        buffer = buffer.slice(scanFrom);
        scanFrom = 0;
      }
    }
    // Flush a trailing line that arrived without a final newline.
    if (buffer.length > scanFrom) handleLine(buffer.slice(scanFrom).trim());

    if (apiErrorMsg) throw new Error(`DeepSeek API error: ${apiErrorMsg}`);

    return {
      content: content || "{}",
      tokens,
      inputTokens,
      outputTokens,
      promptCacheHitTokens,
      promptCacheMissTokens,
      requestId: requestId || requestIdFromHeaders(resp.headers),
      response: resp,
      limitHints: [], // body hints unavailable when streaming; headers still logged separately
    };
  } catch (e) {
    // fetch/reader rejects with the abort reason → surface our typed timeout.
    if (controller.signal.aborted && controller.signal.reason instanceof LlmTimeoutError) {
      throw controller.signal.reason;
    }
    throw e;
  } finally {
    if (idleTimer) clearTimeout(idleTimer);
    clearTimeout(hardTimer);
  }
}

export async function invokeChatCompletion(
  transport: LlmTransport,
  model: string,
  messages: ChatMessage[],
  timeoutMs: number,
  firstTokenTimeoutMs: number,
  deepseekUserId?: string,
): Promise<ChatCompletionInvokeResult> {
  return fetchDeepSeekChatCompletion(
    transport.apiKey,
    transport.chatUrl,
    model,
    messages,
    timeoutMs,
    firstTokenTimeoutMs,
    deepseekUserId,
  );
}

// ─── Model resolution ───────────────────────────────────────────────────────────

/** DeepSeek 模型 id 白名单（含将弃用的旧名）。 */
const KNOWN_DEEPSEEK_MODELS = new Set([
  "deepseek-v4-flash",
  "deepseek-v4-pro",
  "deepseek-chat",
  "deepseek-reasoner",
]);

/** 是否为可直接发送的 DeepSeek 模型 id。 */
export function isDeepSeekModelId(s?: string): boolean {
  return KNOWN_DEEPSEEK_MODELS.has((s ?? "").trim().toLowerCase());
}

/**
 * 解析实际发送给 DeepSeek 的模型 id：优先用任务自带的 `aiModel`（前提是已知 DeepSeek 模型），
 * 否则回退 `DEEPSEEK_MODEL` env（默认 deepseek-chat）。非 DeepSeek 值（如 "google-translate"）被忽略。
 */
export function resolveModel(preferred?: string): string {
  const p = (preferred ?? "").trim();
  if (isDeepSeekModelId(p)) return p;
  const configured = process.env.DEEPSEEK_MODEL?.trim();
  return isDeepSeekModelId(configured) ? configured! : "deepseek-chat";
}
