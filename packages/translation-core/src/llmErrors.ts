/** LLM / Azure transport errors and coarse failure classification. */

/** Thrown when shop quota gate refuses a new LLM call (cap=0 or preflight reserve fail). */
export class QuotaExhaustedError extends Error {
  constructor(message = "QUOTA_EXHAUSTED") {
    super(message);
    this.name = "QuotaExhaustedError";
  }
}

export function isQuotaExhaustedError(err: unknown): boolean {
  if (err instanceof QuotaExhaustedError) return true;
  return err instanceof Error && err.message.startsWith("QUOTA_EXHAUSTED");
}

/** Thrown by fetch transport on HTTP 429 so the pool can back off. */
export class LlmRateLimitError extends Error {
  readonly response: Response;
  constructor(response: Response) {
    super("LLM rate limited");
    this.name = "LlmRateLimitError";
    this.response = response;
  }
}

/**
 * Thrown when a streaming completion stalls (no token for the idle window) or
 * exceeds the hard cap. Distinct from a parse error so callers can react
 * differently: a timeout means "too slow / stuck", not "poison data to isolate".
 */
export class LlmTimeoutError extends Error {
  readonly kind: "first-token" | "idle" | "hard";
  constructor(kind: "first-token" | "idle" | "hard") {
    super(`LLM stream ${kind} timeout`);
    this.name = "LlmTimeoutError";
    this.kind = kind;
  }
}

/** Azure 拒绝了提示词内容；同样输入继续拆批或重试仍会被拒绝。 */
export class AzureContentPolicyError extends Error {
  constructor() {
    super("Azure OpenAI content policy rejected request");
    this.name = "AzureContentPolicyError";
  }
}

export function isAzureContentPolicyResponse(status: number, body: string): boolean {
  if (status !== 400) return false;
  return /content management policy|content[_ -]?filter|ResponsibleAIPolicyViolation/i.test(
    body,
  );
}

/** Coarse classification of a non-throttle LLM call failure (telemetry + backoff). */
export type LlmErrorKind = "timeout" | "parse" | "http" | "api" | "other";

/** Per-kind tally of failed call attempts. */
export type LlmErrorTally = { timeout: number; parse: number; http: number; api: number; other: number };

export function emptyErrorTally(): LlmErrorTally {
  return { timeout: 0, parse: 0, http: 0, api: 0, other: 0 };
}

/** Bucket a thrown error so we can tell "endpoint too slow" from "bad data" from "5xx". */
export function classifyLlmError(e: unknown): LlmErrorKind {
  if (e instanceof LlmTimeoutError) return "timeout";
  const msg = e instanceof Error ? e.message : String(e);
  if (/^DeepSeek HTTP \d/.test(msg)) return "http";
  if (/empty response body/i.test(msg)) return "http";
  if (/DeepSeek API error/i.test(msg)) return "api";
  if (e instanceof SyntaxError || /json|unexpected token|no json object/i.test(msg)) return "parse";
  return "other";
}

export function retryAfterMsFromResponse(response: Response, fallbackSec = 10): number {
  const retryAfterSec = Number(response.headers.get("retry-after") ?? String(fallbackSec));
  return Math.max(retryAfterSec * 1_000, 10_000);
}
