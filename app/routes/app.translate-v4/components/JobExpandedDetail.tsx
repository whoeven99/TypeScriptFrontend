import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TranslationJobProgressSummary } from "~/server/translateV4/progress.server";
import type { StageName } from "~/server/translateV4/types";
import { capTranslateUnitsByResources } from "~/server/translateV4/metricsUtils";
import { MODULE_LABELS, QUOTA_TOKEN_MULTIPLIER } from "../constants";
import { v4Colors } from "../v4Styles";
import {
  isStageBarComplete,
  jobElapsedMs,
  jobQuotaCredits,
  stageBarPercent,
  stageOf,
} from "../jobStageUtils";
import {
  formatV4Elapsed,
  formatV4JobStartTime,
  getV4ModuleLabel,
  V4_STAGE_KEYS,
} from "../v4I18n";

type StageMetrics = TranslationJobProgressSummary["metrics"];

const STAGE_DEF_KEYS: { key: StageName; labelKey: (typeof V4_STAGE_KEYS)[number] }[] = [
  { key: "INIT", labelKey: "v4.stage.init" },
  { key: "TRANSLATE", labelKey: "v4.stage.translate" },
  { key: "WRITEBACK", labelKey: "v4.stage.writeback" },
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
    const res = `${m.translateDone}/${m.translateTotal}`;
    return m.translateUnitTotal > 0
      ? `${res} · ${capTranslateUnitsByResources(m).toLocaleString()}/${m.translateUnitTotal.toLocaleString()}`
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

function formatCreditsCount(count: number, locale?: string): string {
  return count.toLocaleString(locale);
}

export function JobSummaryStats({ job }: { job: TranslationJobProgressSummary }) {
  const { t, i18n } = useTranslation();
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
  const startTime = formatV4JobStartTime(job.createdAt, i18n.language);

  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          fontSize: 12,
          color: v4Colors.textMuted,
          rowGap: 8,
          lineHeight: 1.5,
        }}
      >
        {startTime ? (
          <span>
            {t("v4.job.startTime")}{" "}
            <strong style={{ color: v4Colors.text }}>{startTime}</strong>
          </span>
        ) : null}
        <span>
          {t("v4.job.translatedResources")}{" "}
          <strong style={{ color: v4Colors.text }}>
            {translatedResources.toLocaleString()}
            {resourceTotal > 0 ? ` / ${resourceTotal.toLocaleString()}` : ""}
          </strong>
        </span>
        {elapsed != null ? (
          <span>
            {t("v4.job.elapsed")}{" "}
            <strong style={{ color: v4Colors.text }}>{formatV4Elapsed(elapsed, t)}</strong>
          </span>
        ) : null}
        {job.usedTokens > 0 ? (
          <span>
            {t("v4.job.creditsUsed")}{" "}
            <strong style={{ color: v4Colors.text }}>
              {t("v4.job.creditsShort", {
                formattedCount: formatCreditsCount(credits, i18n.language),
              })}
            </strong>
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
  const { t, i18n } = useTranslation();
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
  const startTime = formatV4JobStartTime(job.createdAt, i18n.language);

  const items: string[] = [];
  if (startTime) items.push(t("v4.job.startedAt", { time: startTime }));
  if (elapsed != null) items.push(t("v4.job.elapsedShort", { time: formatV4Elapsed(elapsed, t) }));
  if (job.usedTokens > 0) {
    items.push(
      t("v4.job.creditsShort", {
        formattedCount: formatCreditsCount(credits, i18n.language),
      }),
    );
  } else if (!job.isTerminal) {
    items.push(t("v4.job.creditsCounting"));
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
  const { t } = useTranslation();
  const m = job.metrics;
  const timings = job.stageTimings ?? {};
  const activeStage = stageOf(job.status, job.errorStage, m);
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
      {STAGE_DEF_KEYS.map(({ labelKey, key }, idx) => {
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
              width: 56,
                fontSize: 12,
                flexShrink: 0,
              lineHeight: 1.45,
                color: complete
                  ? v4Colors.success
                  : pausedHere || stoppingHere
                    ? v4Colors.warning
                    : current
                      ? v4Colors.text
                      : v4Colors.textFaint,
              }}
            >
              {t(labelKey)}
            </span>
            {initScanning ? (
              <InitScanIndicator
                initDone={m.initDone}
                moduleLabel={
                  m.currentModule
                    ? getV4ModuleLabel(m.currentModule, t) ||
                      MODULE_LABELS[m.currentModule] ||
                      m.currentModule
                    : null
                }
              />
            ) : translateWarmingUp ? (
              <TranslateWorkingIndicator
                moduleLabel={
                  m.currentModule
                    ? getV4ModuleLabel(m.currentModule, t) ||
                      MODULE_LABELS[m.currentModule] ||
                      m.currentModule
                    : null
                }
                usedCredits={jobQuotaCredits(job.usedTokens, QUOTA_TOKEN_MULTIPLIER)}
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
                    minWidth: 132,
                    textAlign: "right",
                    flexShrink: 0,
                    lineHeight: 1.45,
                    overflowWrap: "anywhere",
                  }}
                >
                  {stageDetail(idx, m)}
                  {complete ? " ✓" : ""}
                  {ms != null ? ` · ${t("v4.job.elapsedShort", { time: formatV4Elapsed(ms, t) })}` : ""}
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
  const { t } = useTranslation();
  return (
    <>
      <div className="v4-indet-track" style={{ flex: 1 }}>
        <div className="v4-indet-fill" />
      </div>
      <span
        style={{
          fontSize: 12,
          color: v4Colors.textMuted,
          minWidth: 132,
          textAlign: "right",
          flexShrink: 0,
          lineHeight: 1.45,
          overflowWrap: "anywhere",
        }}
      >
        {t("v4.job.itemsFound", { count: initDone })}
        {moduleLabel ? ` · ${moduleLabel}` : ""}
        <span className="v4-dots" />
      </span>
    </>
  );
}

function TranslateWorkingIndicator({
  moduleLabel,
  usedCredits,
}: {
  moduleLabel: string | null;
  usedCredits: number;
}) {
  const { t, i18n } = useTranslation();
  return (
    <>
      <div className="v4-indet-track" style={{ flex: 1 }}>
        <div className="v4-indet-fill" />
      </div>
      <span
        style={{
          fontSize: 12,
          color: v4Colors.textMuted,
          minWidth: 132,
          textAlign: "right",
          flexShrink: 0,
          lineHeight: 1.45,
          overflowWrap: "anywhere",
        }}
      >
        {t("v4.job.callingModel")}
        {moduleLabel ? ` · ${moduleLabel}` : ""}
        {usedCredits > 0
          ? ` · ${t("v4.job.creditsUsedShort", {
              formattedCount: formatCreditsCount(usedCredits, i18n.language),
            })}`
          : ""}
        <span className="v4-dots" />
      </span>
    </>
  );
}
