import type { TranslationJobProgressSummary } from "~/server/translateV4/progress.server";
import type { StageName, TranslationV4Status } from "~/server/translateV4/types";
import { MODULE_LABELS, QUOTA_TOKEN_MULTIPLIER } from "../constants";
import { stageOf } from "../jobStageUtils";

type StageMetrics = TranslationJobProgressSummary["metrics"];

const STAGE_DEFS: { name: string; key: StageName }[] = [
  { name: "初始化", key: "INIT" },
  { name: "翻译", key: "TRANSLATE" },
  { name: "写回", key: "WRITEBACK" },
  { name: "校验", key: "VERIFY" },
];

const INIT_SCAN_CSS = `
@keyframes v4-indet { 0% { left: -42%; } 100% { left: 100%; } }
@keyframes v4-dots { 0% { content: ""; } 25% { content: "."; } 50% { content: ".."; } 75%,100% { content: "..."; } }
.v4-indet-track { position: relative; height: 6px; border-radius: 3px; background: #f0f0f0; overflow: hidden; }
.v4-indet-fill { position: absolute; top: 0; height: 100%; width: 42%; border-radius: 3px;
  background: linear-gradient(90deg, rgba(22,119,255,0.15), #1677ff, rgba(22,119,255,0.15));
  animation: v4-indet 1.1s ease-in-out infinite; }
.v4-dots::after { content: ""; animation: v4-dots 1.2s steps(1) infinite; }
`;

function ratioPercent(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((done / total) * 100));
}

function taskResourceTotal(m: StageMetrics): number {
  return m.translateTotal || m.initTotal || 0;
}

function translateStageProgress(m: StageMetrics): { done: number; total: number } {
  if (m.translateUnitTotal > 0) {
    return { done: m.translateUnitDone, total: m.translateUnitTotal };
  }
  return { done: m.translateDone, total: taskResourceTotal(m) };
}

function stageBarPercent(
  idx: number,
  m: StageMetrics,
  jobStatus: TranslationV4Status,
): number {
  if (jobStatus === "COMPLETED") return 100;
  switch (idx) {
    case 0:
      return ratioPercent(m.initDone, m.initTotal);
    case 1: {
      const { done, total } = translateStageProgress(m);
      return ratioPercent(done, total);
    }
    case 2: {
      const total = taskResourceTotal(m);
      return total > 0 ? ratioPercent(m.writebackDone, total) : 0;
    }
    case 3:
      return ratioPercent(m.verifyDone, m.verifyTotal);
    default:
      return 0;
  }
}

function isStageBarComplete(
  idx: number,
  m: StageMetrics,
  jobStatus: TranslationV4Status,
): boolean {
  if (jobStatus === "COMPLETED") return true;
  switch (idx) {
    case 0:
      return m.initTotal > 0 && m.initDone >= m.initTotal;
    case 1: {
      const { done, total } = translateStageProgress(m);
      return total > 0 && done >= total;
    }
    case 2: {
      const total = taskResourceTotal(m);
      return total > 0 && m.writebackDone >= total;
    }
    case 3:
      return m.verifyTotal > 0 && m.verifyDone >= m.verifyTotal;
    default:
      return false;
  }
}

function stageDetail(idx: number, m: StageMetrics): string {
  if (idx === 0) return `${m.initDone}/${m.initTotal}`;
  if (idx === 1) {
    const res = `资源 ${m.translateDone}/${m.translateTotal}`;
    return m.translateUnitTotal > 0
      ? `${res} · 节点 ${m.translateUnitDone}/${m.translateUnitTotal}`
      : res;
  }
  if (idx === 2) {
    const total = taskResourceTotal(m);
    return `${m.writebackDone}/${total || m.writebackTotal}`;
  }
  return `${m.verifyDone}/${m.verifyTotal}`;
}

function formatElapsed(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}秒`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  if (m < 60) return rs ? `${m}分${rs}秒` : `${m}分`;
  const h = Math.floor(m / 60);
  return `${h}时${m % 60}分`;
}

function stageElapsedMs(
  t?: { startedAt: string; endedAt?: string | null },
  freezeAt?: string | null,
): number | null {
  if (!t?.startedAt) return null;
  const end = t.endedAt
    ? new Date(t.endedAt).getTime()
    : freezeAt
      ? new Date(freezeAt).getTime()
      : Date.now();
  const ms = end - new Date(t.startedAt).getTime();
  return Number.isFinite(ms) && ms >= 0 ? ms : null;
}

function jobElapsedMs(job: TranslationJobProgressSummary): number | null {
  const freezeAt =
    job.status === "PAUSED" || job.status === "CANCELLED" || job.isTerminal
      ? job.updatedAt
      : null;
  const ms = stageElapsedMs({ startedAt: job.createdAt, endedAt: freezeAt });
  return ms;
}

export function JobSummaryStats({ job }: { job: TranslationJobProgressSummary }) {
  const m = job.metrics;
  const translatedResources = m.translateDone;
  const resourceTotal = m.translateTotal || taskResourceTotal(m);
  const elapsed = jobElapsedMs(job);
  const credits =
    job.usedTokens > 0
      ? Math.round(job.usedTokens * QUOTA_TOKEN_MULTIPLIER)
      : 0;

  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          fontSize: 12,
          color: "#64748b",
        }}
      >
        <span>
          已翻译资源{" "}
          <strong style={{ color: "#0f172a" }}>
            {translatedResources.toLocaleString()}
            {resourceTotal > 0 ? ` / ${resourceTotal.toLocaleString()}` : ""}
          </strong>
        </span>
        {elapsed != null ? (
          <span>
            耗时 <strong style={{ color: "#0f172a" }}>{formatElapsed(elapsed)}</strong>
          </span>
        ) : null}
        {job.usedTokens > 0 ? (
          <span>
            消耗{" "}
            <strong style={{ color: "#0f172a" }}>
              {credits.toLocaleString()} 积分
            </strong>
            <span style={{ opacity: 0.75 }}>（{job.usedTokens.toLocaleString()} tokens）</span>
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function JobStageProgressList({ job }: { job: TranslationJobProgressSummary }) {
  const m = job.metrics;
  const timings = job.stageTimings ?? {};
  const activeStage = stageOf(job.status, job.errorStage);
  const isPaused = job.status === "PAUSED";
  const freezeAt =
    job.status === "PAUSED" || job.status === "CANCELLED" || job.isTerminal
      ? job.updatedAt
      : null;

  return (
    <div>
      <style>{INIT_SCAN_CSS}</style>
      {STAGE_DEFS.map(({ name, key }, idx) => {
        const complete = isStageBarComplete(idx, m, job.status);
        const percent = stageBarPercent(idx, m, job.status);
        const current =
          idx === activeStage && !job.isTerminal && !isPaused && !job.isStopping;
        const pausedHere = isPaused && idx === activeStage;
        const stoppingHere = job.isStopping && idx === activeStage;
        const stageFreezeAt =
          (job.status === "PAUSED" || job.status === "CANCELLED") && idx === activeStage
            ? freezeAt
            : undefined;
        const ms = stageElapsedMs(timings[key], stageFreezeAt);
        const initScanning = idx === 0 && current && m.initTotal <= 0;
        const translateWarmingUp =
          idx === 1 &&
          current &&
          job.status === "TRANSLATING" &&
          m.translateUnitTotal > 0 &&
          m.translateUnitDone <= 0;
        const inProgress = percent > 0 && !complete;

        return (
          <div
            key={key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 6,
            }}
          >
            <span
              style={{
                width: 44,
                fontSize: 12,
                flexShrink: 0,
                color: complete
                  ? "#16a34a"
                  : pausedHere || stoppingHere
                    ? "#d97706"
                    : current
                      ? "#0f172a"
                      : "#94a3b8",
              }}
            >
              {name}
            </span>
            {initScanning ? (
              <InitScanIndicator
                initDone={m.initDone}
                moduleLabel={
                  m.currentModule ? MODULE_LABELS[m.currentModule] ?? m.currentModule : null
                }
              />
            ) : translateWarmingUp ? (
              <TranslateWorkingIndicator
                moduleLabel={
                  m.currentModule ? MODULE_LABELS[m.currentModule] ?? m.currentModule : null
                }
                usedTokens={job.usedTokens}
              />
            ) : (
              <>
                <div
                  style={{
                    flex: 1,
                    height: 6,
                    borderRadius: 3,
                    background: "#f0f0f0",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${percent}%`,
                      height: "100%",
                      borderRadius: 3,
                      background:
                        job.status === "FAILED" && (current || pausedHere)
                          ? "#ff4d4f"
                          : complete
                            ? "#22c55e"
                            : inProgress
                              ? "#1677ff"
                              : "#e2e8f0",
                      transition: "width 0.2s",
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: 12,
                    color: "#64748b",
                    minWidth: 170,
                    textAlign: "right",
                    flexShrink: 0,
                  }}
                >
                  {stageDetail(idx, m)}
                  {complete ? " ✓" : ""}
                  {ms != null ? ` · 耗时 ${formatElapsed(ms)}` : ""}
                </span>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function InitScanIndicator({
  initDone,
  moduleLabel,
}: {
  initDone: number;
  moduleLabel: string | null;
}) {
  return (
    <>
      <div className="v4-indet-track" style={{ flex: 1 }}>
        <div className="v4-indet-fill" />
      </div>
      <span
        style={{
          fontSize: 12,
          color: "#64748b",
          minWidth: 170,
          textAlign: "right",
          flexShrink: 0,
        }}
      >
        已发现 {initDone.toLocaleString()} 项
        {moduleLabel ? ` · ${moduleLabel}` : ""}
        <span className="v4-dots" />
      </span>
    </>
  );
}

function TranslateWorkingIndicator({
  moduleLabel,
  usedTokens,
}: {
  moduleLabel: string | null;
  usedTokens: number;
}) {
  return (
    <>
      <div className="v4-indet-track" style={{ flex: 1 }}>
        <div className="v4-indet-fill" />
      </div>
      <span
        style={{
          fontSize: 12,
          color: "#64748b",
          minWidth: 170,
          textAlign: "right",
          flexShrink: 0,
        }}
      >
        正在调用模型
        {moduleLabel ? ` · ${moduleLabel}` : ""}
        {usedTokens > 0 ? ` · ${usedTokens.toLocaleString()} tokens` : ""}
        <span className="v4-dots" />
      </span>
    </>
  );
}
