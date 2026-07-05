import { globalStore } from "~/globalStore";

export type ClientLogLevel = "info" | "warn" | "error";
export type ClientLogKind = "event" | "action" | "exception" | "network";
export type ClientLogStatus = "start" | "success" | "failure";

export type ClientLogError = {
  name?: string;
  message?: string;
  stack?: string;
  status?: number;
  statusText?: string;
  data?: unknown;
};

export type ClientLogPayload = {
  event: string;
  action?: string;
  level?: ClientLogLevel;
  kind?: ClientLogKind;
  status?: ClientLogStatus;
  shop?: string;
  route?: string;
  url?: string;
  traceId?: string;
  message?: string;
  durationMs?: number;
  context?: Record<string, unknown>;
  error?: ClientLogError;
  timestamp?: string;
};

export type ClientLogTrace = {
  traceId: string;
  startedAt: number;
  payload: ClientLogPayload;
};

function trimText(value: string | undefined, max = 4_000): string | undefined {
  if (!value) return value;
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

export function serializeClientError(error: unknown): ClientLogError {
  if (error instanceof Error) {
    const withStatus = error as Error & {
      status?: number;
      statusText?: string;
      data?: unknown;
    };
    return {
      name: error.name,
      message: trimText(error.message, 1_000),
      stack: trimText(error.stack),
      status: withStatus.status,
      statusText: trimText(withStatus.statusText, 200),
      data: withStatus.data,
    };
  }

  if (typeof error === "string") {
    return { message: trimText(error, 1_000) };
  }

  if (error && typeof error === "object") {
    const value = error as Record<string, unknown>;
    return {
      name: typeof value.name === "string" ? value.name : undefined,
      message: trimText(
        typeof value.message === "string"
          ? value.message
          : JSON.stringify(value),
        1_000,
      ),
      stack: trimText(typeof value.stack === "string" ? value.stack : undefined),
      status:
        typeof value.status === "number" ? value.status : undefined,
      statusText:
        typeof value.statusText === "string" ? trimText(value.statusText, 200) : undefined,
      data: value.data,
    };
  }

  return { message: trimText(String(error), 1_000) };
}

function currentRoute() {
  if (typeof window === "undefined") return undefined;
  return `${window.location.pathname}${window.location.search}`;
}

function currentUrl() {
  if (typeof window === "undefined") return undefined;
  return window.location.href;
}

export function createClientTraceId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `trace_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function buildPayload(payload: ClientLogPayload): ClientLogPayload {
  return {
    ...payload,
    level: payload.level ?? "info",
    kind: payload.kind ?? "event",
    shop: payload.shop ?? globalStore.shop,
    route: payload.route ?? currentRoute(),
    url: payload.url ?? currentUrl(),
    timestamp: payload.timestamp ?? new Date().toISOString(),
  };
}

export async function reportClientLog(
  payload: ClientLogPayload,
  options?: { beacon?: boolean },
) {
  if (typeof window === "undefined") return;

  const body = JSON.stringify(buildPayload(payload));
  if (options?.beacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
    try {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/log", blob);
      return;
    } catch {
      // fall through to fetch
    }
  }

  try {
    await fetch("/log", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body,
      keepalive: options?.beacon === true,
      credentials: "same-origin",
    });
  } catch {
    // Logging failures should never break UI flow.
  }
}

export function startClientLogTrace(payload: ClientLogPayload): ClientLogTrace {
  const traceId = payload.traceId ?? createClientTraceId();
  const tracePayload = {
    ...payload,
    traceId,
    kind: payload.kind ?? "action",
    status: payload.status ?? "start",
  } satisfies ClientLogPayload;
  void reportClientLog(tracePayload);
  return {
    traceId,
    startedAt: Date.now(),
    payload: tracePayload,
  };
}

export function finishClientLogTrace(
  trace: ClientLogTrace | null | undefined,
  payload?: Omit<Partial<ClientLogPayload>, "error"> & { error?: unknown },
) {
  if (!trace) return;
  const { error, ...restPayload } = payload ?? {};

  const mergedPayload: ClientLogPayload = {
    ...trace.payload,
    ...restPayload,
    traceId: trace.traceId,
    durationMs: restPayload.durationMs ?? Date.now() - trace.startedAt,
    context: {
      ...(trace.payload.context ?? {}),
      ...(restPayload.context ?? {}),
    },
  };

  if (error !== undefined) {
    mergedPayload.error = serializeClientError(error);
  }

  void reportClientLog(mergedPayload, {
    beacon: mergedPayload.kind === "exception",
  });
}

export function reportClientError(
  event: string,
  error: unknown,
  payload?: Omit<ClientLogPayload, "event" | "error" | "kind" | "level" | "status">,
) {
  return reportClientLog({
    ...payload,
    event,
    kind: event.includes("network") ? "network" : "exception",
    level: "error",
    status: "failure",
    error: serializeClientError(error),
  }, {
    beacon: true,
  });
}
