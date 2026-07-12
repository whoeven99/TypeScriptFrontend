import { reportClientLog } from "~/utils/clientLog";

const PERF_FLAG_KEY = "CIWI_PERF_DEBUG";

function parsePerfFlag(value: string | null): boolean {
  if (!value) return false;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

export function isPerfDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;

  try {
    const search = new URLSearchParams(window.location.search);
    if (parsePerfFlag(search.get("perf"))) return true;
  } catch {
    // Ignore malformed URL state.
  }

  try {
    return parsePerfFlag(window.localStorage.getItem(PERF_FLAG_KEY));
  } catch {
    return false;
  }
}

export function markPerfStart(name: string): number {
  if (typeof performance === "undefined") return Date.now();
  const markName = `${name}:start`;
  performance.mark(markName);
  return performance.now();
}

export function markPerfEnd(
  name: string,
  startedAt: number,
  extraContext?: Record<string, unknown>,
) {
  const durationMs =
    typeof performance === "undefined"
      ? Date.now() - startedAt
      : performance.now() - startedAt;

  if (typeof performance !== "undefined") {
    const startMark = `${name}:start`;
    const endMark = `${name}:end`;
    performance.mark(endMark);
    performance.measure(name, startMark, endMark);
  }

  if (!isPerfDebugEnabled()) return;

  const payload = {
    event: "perf_span",
    action: name,
    level: "info" as const,
    kind: "event" as const,
    status: "success" as const,
    message: `${name} finished`,
    durationMs,
    context: extraContext,
  };

  console.info(`[perf] ${name}`, {
    durationMs: Number(durationMs.toFixed(2)),
    ...(extraContext ?? {}),
  });

  void reportClientLog(payload);
}

export function logReactProfilerRender(
  id: string,
  phase: "mount" | "update" | "nested-update",
  actualDuration: number,
  baseDuration: number,
  startTime: number,
  commitTime: number,
) {
  if (!isPerfDebugEnabled()) return;

  const context = {
    phase,
    actualDurationMs: Number(actualDuration.toFixed(2)),
    baseDurationMs: Number(baseDuration.toFixed(2)),
    startTimeMs: Number(startTime.toFixed(2)),
    commitTimeMs: Number(commitTime.toFixed(2)),
  };

  console.info(`[perf][react] ${id}`, context);

  void reportClientLog({
    event: "react_profiler_commit",
    action: id,
    level: "info",
    kind: "event",
    status: "success",
    durationMs: actualDuration,
    context,
  });
}
