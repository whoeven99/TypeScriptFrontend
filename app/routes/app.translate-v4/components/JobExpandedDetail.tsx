import type { TranslationJobProgressSummary } from "~/server/translateV4/progress.server";
import type { StageName } from "~/server/translateV4/types";
import { MODULE_LABELS, QUOTA_TOKEN_MULTIPLIER } from "../constants";
import { v4Colors } from "../v4Styles";
import {
  formatElapsed,
  formatJobStartTime,
  isStageBarComplete,
  jobElapsedMs,
  jobQuotaCredits,
  stageBarPercent,
  stageOf,
} from "../jobStageUtils";

type StageMetrics = TranslationJobProgressSummary["metrics"];

const STAGE_DEFS: { name: string; key: StageName }[] = [
  { name: "初始化", key: "INIT" },
  { name: "翻译", key: "TRANSLATE" },
  { name: "写回", key: "WRITEBACK" },
  { name: "校验", key: "VERIFY" },
];

// 进度色与品牌统一：进行中用主题紫 v4Colors.primary，完成用绿色。
const INIT_SCAN_CSS = `
@keyframes v4-indet { 0% { left: -42%; } 100% { left: 100%; } }
@keyframes v4-dots { 0% { content: ""; } 25% { content: "."; } 50% { content: ".."; } 75%,100% { content: "..."; } }
.v4-indet-track { position: relative; height: 6px; border-radius: 3px; background: #f0f0f0; overflow: hidden; }
.v4-indet-fill { position: absolute; top: 0; height: 100%; width: 42%; border-radius: 3px;
  background: linear-gradient(90deg, rgba(91,79,207,0.15), #5b4fcf, rgba(91,79,207,0.15));
  animation: v4-indet 1.1s ease-in-out infinite; }
.v4-dots::after { content: ""; animation: v4-dots 1.2s steps(1) infinite; }
`;

function taskResourceTotal(m: StageMetrics): number {
  return m.translateTotal || m.initTotal || 0;
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

export function JobSummaryStats({ job }: { job: TranslationJobProgressSummary }) {
  const m = job.metrics;
  const translatedResources = m.translateDone;
  const resourceTotal = m.translateTotal || taskResourceTotal(m);
  const elapsed = jobElapsedMs(job);
  const credits = jobQuotaCredits(job.usedTokens, QUOTA_TOKEN_MULTIPLIER);
  const startTime = formatJobStartTime(job.createdAt);

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
        {startTime ? (
          <span>
            开始时间 <strong style={{ color: "#0f172a" }}>{startTime}</strong>
          </span>
        ) : null}
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
            <span style={{ opacity: 0.75 }}>
              （{job.usedTokens.toLocaleString()} tokens）
            </span>
            <TaskIdSuffix taskId={job.taskId} />
          </span>
        ) : (
          <TaskIdSuffix taskId={job.taskId} />
        )}
      </div>
    </div>
  );
}

function TaskIdSuffix({ taskId }: { taskId: string }) {
  const prefix = taskId.split("-")[0] ?? taskId.slice(0, 8);
  return (
    <span
      style={{
        marginLeft: 8,
        color: "#cbd5e1",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: 11,
        letterSpacing: "0.02em",
      }}
    >
      #{prefix}
    </span>
  );
}

/** 收起态：启动时间、耗时、积分一行摘要。 */
export function JobCollapsedMeta({ job }: { job: TranslationJobProgressSummary }) {
  const elapsed = jobElapsedMs(job);
  const credits = jobQuotaCredits(job.usedTokens, QUOTA_TOKEN_MULTIPLIER);
  const startTime = formatJobStartTime(job.createdAt);

  const items: string[] = [];
  if (startTime) items.push(`启动 ${startTime}`);
  if (elapsed != null) items.push(`耗时 ${formatElapsed(elapsed)}`);
  if (job.usedTokens > 0) {
    items.push(`消耗 ${credits.toLocaleString()} 积分`);
  } else if (!job.isTerminal) {
    items.push("积分统计中");
  }

  if (items.length === 0) return null;

  return (
    <div
      style={{
        marginTop: 10,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        color: "#64748b",
        lineHeight: 1.4,
      }}
    >
      {items.map((text, i) => (
        <span key={text} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          {i > 0 ? (
            <span style={{ color: "#cbd5e1", userSelect: "none" }}>·</span>
          ) : null}
          <span>{text}</span>
        </span>
      ))}
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
                              ? v4Colors.primary
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
