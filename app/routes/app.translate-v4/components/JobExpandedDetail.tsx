import { useEffect, useState } from "react";
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
];

// 进度色与品牌统一：进行中用主题紫 v4Colors.primary，完成用绿色。
const INIT_SCAN_CSS = `
@keyframes v4-indet { 0% { left: -42%; } 100% { left: 100%; } }
@keyframes v4-dots { 0% { content: ""; } 25% { content: "."; } 50% { content: ".."; } 75%,100% { content: "..."; } }
.v4-indet-track { position: relative; height: 6px; border-radius: 3px; background: var(--p-color-bg-surface-secondary); overflow: hidden; }
.v4-indet-fill { position: absolute; top: 0; height: 100%; width: 42%; border-radius: 3px;
  background: linear-gradient(90deg, transparent, var(--p-color-bg-fill-brand), transparent);
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
  const total = taskResourceTotal(m);
  return `${m.writebackDone}/${total || m.writebackTotal}`;
}

function stageElapsedMs(
  t?: { startedAt: string; endedAt?: string | null },
  freezeAt?: string | null,
  nowMs?: number | null,
): number | null {
  if (!t?.startedAt) return null;
  const end = t.endedAt
    ? new Date(t.endedAt).getTime()
    : freezeAt
      ? new Date(freezeAt).getTime()
      : nowMs ?? null;
  if (end == null) return null;
  const ms = end - new Date(t.startedAt).getTime();
  return Number.isFinite(ms) && ms >= 0 ? ms : null;
}

function useHydratedNow(enabled: boolean) {
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      setNowMs(null);
      return;
    }
    setNowMs(Date.now());
  }, [enabled]);

  return nowMs;
}

export function JobSummaryStats({ job }: { job: TranslationJobProgressSummary }) {
  const m = job.metrics;
  const translatedResources = m.translateDone;
  const resourceTotal = m.translateTotal || taskResourceTotal(m);
  const nowMs = useHydratedNow(
    !job.isTerminal && job.status !== "PAUSED" && job.status !== "CANCELLED",
  );
  const elapsed =
    job.isTerminal || job.status === "PAUSED" || job.status === "CANCELLED"
      ? jobElapsedMs(job)
      : nowMs != null
        ? jobElapsedMs(job, nowMs)
        : null;
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
          color: v4Colors.textMuted,
        }}
      >
        {startTime ? (
          <span>
            开始时间 <strong style={{ color: v4Colors.text }}>{startTime}</strong>
          </span>
        ) : null}
        <span>
          已翻译资源{" "}
          <strong style={{ color: v4Colors.text }}>
            {translatedResources.toLocaleString()}
            {resourceTotal > 0 ? ` / ${resourceTotal.toLocaleString()}` : ""}
          </strong>
        </span>
        {elapsed != null ? (
          <span>
            耗时 <strong style={{ color: v4Colors.text }}>{formatElapsed(elapsed)}</strong>
          </span>
        ) : null}
        {job.usedTokens > 0 ? (
          <span>
            消耗{" "}
            <strong style={{ color: v4Colors.text }}>
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
        color: v4Colors.textFaint,
        fontFamily: v4Colors.mono,
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
  const nowMs = useHydratedNow(
    !job.isTerminal && job.status !== "PAUSED" && job.status !== "CANCELLED",
  );
  const elapsed =
    job.isTerminal || job.status === "PAUSED" || job.status === "CANCELLED"
      ? jobElapsedMs(job)
      : nowMs != null
        ? jobElapsedMs(job, nowMs)
        : null;
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
        color: v4Colors.textMuted,
        lineHeight: 1.4,
      }}
    >
      {items.map((text, i) => (
        <span key={text} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          {i > 0 ? (
            <span style={{ color: v4Colors.textFaint, userSelect: "none" }}>·</span>
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
  const nowMs = useHydratedNow(
    !job.isTerminal && job.status !== "PAUSED" && job.status !== "CANCELLED",
  );
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
        const ms = stageElapsedMs(timings[key], stageFreezeAt, nowMs);
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
                  ? v4Colors.success
                  : pausedHere || stoppingHere
                    ? v4Colors.warning
                    : current
                      ? v4Colors.text
                      : v4Colors.textFaint,
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
                    background: v4Colors.progressTrack,
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
                          ? v4Colors.danger
                          : complete
                            ? v4Colors.success
                            : inProgress
                              ? v4Colors.primary
                              : v4Colors.progressTrack,
                      transition: "width 0.2s",
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: 12,
                    color: v4Colors.textMuted,
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
          color: v4Colors.textMuted,
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
          color: v4Colors.textMuted,
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
