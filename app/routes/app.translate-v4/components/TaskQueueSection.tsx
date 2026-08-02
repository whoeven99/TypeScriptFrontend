import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { CSSProperties, ReactNode } from "react";
import type { TranslationJobProgressSummary } from "~/server/translateV4/progress.server";
import { canPauseV4Job, isAutoV4TaskSource } from "~/server/translateV4/types";
import V4Button from "./V4Button";
import { v4Colors, v4CardStyle } from "../v4Styles";
import { formatLocaleRoute } from "../localeDisplay";
import { jobDisplayPercent } from "../jobStageUtils";
import { ProgressRing, StatusTag, MiniStageTrack } from "./V4JobCardParts";
import { AutoTaskBadge } from "./AutoTranslateMarkers";
import { JobCollapsedMeta, JobSummaryStats, JobStageProgressList } from "./JobExpandedDetail";
import {
  getV4JobStatusLabel,
  getV4VisibleStageLabel,
} from "../v4I18n";
import { getV4JobNotice } from "../v4JobNotice";

type Props = {
  job: TranslationJobProgressSummary;
  translateSlotBusy: boolean;
  highlighted?: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onBuyCredits: () => void;
  onAction: (
    taskId: string,
    action: "pause" | "resume" | "cancel" | "delete",
  ) => Promise<boolean>;
};

export function CompactJobCard({
  job,
  translateSlotBusy,
  highlighted = false,
  expanded,
  onToggleExpand,
  onBuyCredits,
  onAction,
}: Props) {
  const { t } = useTranslation();
  const [pending, setPending] = useState<null | "pause" | "resume" | "cancel" | "delete">(null);

  const displayStatusLabel = getV4JobStatusLabel(job, t, translateSlotBusy);
  const notice = getV4JobNotice(job.errorMessage, t);
  const isCancelledLike = job.status === "CANCELLED" || notice.kind === "cancelled";

  const percent = jobDisplayPercent(job);

  const canResume = job.canResume && !isCancelledLike;
  const canPause = canPauseV4Job(job.status) && !job.isStopping;
  const canCancel =
    job.status !== "COMPLETED" &&
    job.status !== "CANCELLED" &&
    !job.isStopping &&
    !isCancelledLike;
  const canDelete =
    job.isTerminal ||
    job.status === "PAUSED" ||
    job.status === "CANCELLED" ||
    job.status === "FAILED" ||
    isCancelledLike ||
    job.status === "COMPLETED";

  useEffect(() => {
    if (!pending) return;
    if (pending === "resume" && !canResume) {
      setPending(null);
      return;
    }
    if (pending === "pause" && !canPause) {
      setPending(null);
      return;
    }
    if (pending === "cancel" && (isCancelledLike || !canCancel)) {
      setPending(null);
    }
  }, [pending, canResume, canPause, canCancel, isCancelledLike]);

  const runAction = (action: "pause" | "resume" | "cancel" | "delete") => {
    setPending(action);
    void (async () => {
      const ok = await onAction(job.taskId, action);
      if (!ok) setPending(null);
    })();
  };

  // 顶部三阶段迷你进度（不含 verify）
  const stageSummary = job.isTerminal
    ? job.status === "COMPLETED"
      ? ""
      : job.status === "CANCELLED"
        ? ""
        : t("v4.tasks.ended")
    : t("v4.tasks.inProgress", { stage: getV4VisibleStageLabel(job, t) });

  return (
    <div
      className={highlighted ? "v4-task-card-spotlight" : undefined}
      style={{
        ...v4CardStyle,
        padding: expanded ? "16px 18px" : "14px 16px",
        marginBottom: 10,
        background: expanded ? v4Colors.cardSubdued : v4Colors.cardBg,
        border: highlighted
          ? `1px solid ${v4Colors.primary}`
          : expanded
            ? "1px solid #d6e4ff"
            : "none",
        boxShadow: "var(--app-shadow-card)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <ProgressRing percent={percent} size="sm" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 800, fontSize: 14, color: v4Colors.text, minWidth: 0, overflowWrap: "anywhere" }}>
              {formatLocaleRoute(job.source, job.target)}
            </span>
            {highlighted ? <JustCreatedBadge /> : null}
            {isAutoV4TaskSource(job.taskSource) ? <AutoTaskBadge /> : null}
            <StatusTag status={job.status} label={displayStatusLabel} />
            {stageSummary ? (
              <span style={{ fontSize: 12, color: v4Colors.textFaint, fontWeight: 400, minWidth: 0, overflowWrap: "anywhere" }}>
                {stageSummary}
              </span>
            ) : null}
          </div>
          <MiniStageTrack job={job} />
          {!expanded ? <JobCollapsedMeta job={job} /> : null}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0, marginTop: -2 }}>
          <V4Button
            type="text"
            size="small"
            onClick={onToggleExpand}
            style={detailToggleButtonStyle(expanded)}
          >
            {expanded ? t("v4.tasks.collapse") : t("v4.tasks.view")}
          </V4Button>
        </div>
      </div>

      {expanded ? (
        <div
          style={{
            marginTop: 14,
            padding: "14px 14px 12px",
            borderTop: `1px solid ${v4Colors.divider}`,
            background: "rgba(255,255,255,0.6)",
            borderRadius: 10,
          }}
        >
          <JobSummaryStats job={job} />
          <JobStageProgressList job={job} />

          {canResume || canPause || canCancel || canDelete ? (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
                marginTop: 14,
                paddingTop: 12,
                borderTop: `1px solid ${v4Colors.divider}`,
              }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {canResume ? (
                  <ActionChip label={t("v4.tasks.resume")} kind="primary" loading={pending === "resume"} onClick={() => runAction("resume")} />
                ) : null}
                {canPause ? (
                  <ActionChip label={t("v4.tasks.pause")} kind="ghost" loading={pending === "pause"} onClick={() => runAction("pause")} />
                ) : null}
                {canCancel ? (
                  <ActionChip label={t("v4.tasks.cancelTask")} kind="danger" loading={pending === "cancel"} onClick={() => runAction("cancel")} />
                ) : null}
              </div>
              {canDelete ? (
                <DeleteConfirm
                  title={t("v4.tasks.deleteConfirmTitle")}
                  description={t("v4.tasks.deleteConfirmDesc")}
                  okText={t("Delete")}
                  cancelText={t("Cancel")}
                  triggerLabel={t("v4.tasks.deleteRecord")}
                  loading={pending === "delete"}
                  onConfirm={() => runAction("delete")}
                />
              ) : null}
            </div>
          ) : null}

        </div>
      ) : null}

      {notice.message ? (
        <JobNoticeBar
          message={notice.message}
          tone={job.status === "FAILED" ? "danger" : "warning"}
          actionLabel={notice.action === "buy_credits" ? t("Buy credits") : null}
          onAction={notice.action === "buy_credits" ? onBuyCredits : undefined}
        />
      ) : null}
    </div>
  );
}

function JustCreatedBadge() {
  const { t } = useTranslation();

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: 999,
        background: v4Colors.primarySoft,
        color: v4Colors.primary,
        fontSize: 11,
        fontWeight: 700,
        lineHeight: 1.5,
      }}
    >
      {t("v4.tasks.justCreated")}
    </span>
  );
}

function JobNoticeBar({
  message,
  tone,
  actionLabel,
  onAction,
}: {
  message: string;
  tone: "warning" | "danger";
  actionLabel?: string | null;
  onAction?: () => void;
}) {
  const isDanger = tone === "danger";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
        marginTop: 12,
        padding: "10px 12px",
        borderRadius: 10,
        background: isDanger ? v4Colors.dangerBg : v4Colors.warningBg,
        border: `1px solid ${isDanger ? "#ffccc7" : "#ffe58f"}`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
          minWidth: 0,
          flex: 1,
        }}
      >
        <span
          aria-hidden
          style={{
            width: 6,
            height: 6,
            marginTop: 6,
            borderRadius: "50%",
            flexShrink: 0,
            background: isDanger ? v4Colors.danger : v4Colors.warning,
          }}
        />
        <span
          style={{
            fontSize: 12,
            lineHeight: 1.5,
            color: isDanger ? v4Colors.danger : v4Colors.warning,
            overflowWrap: "anywhere",
          }}
        >
          {message}
        </span>
      </div>
      {actionLabel && onAction ? (
        <V4Button
          size="small"
          type="primary"
          onClick={onAction}
          style={{
            flexShrink: 0,
            borderRadius: 8,
            boxShadow: "none",
          }}
        >
          {actionLabel}
        </V4Button>
      ) : null}
    </div>
  );
}

function ActionChip({
  label,
  onClick,
  loading,
  kind,
}: {
  label: string;
  onClick: () => void;
  loading?: boolean;
  kind: "primary" | "ghost" | "danger";
}) {
  const typeMap: Record<"primary" | "ghost" | "danger", "primary" | "default" | "default"> = {
    primary: "primary",
    ghost: "default",
    danger: "default",
  };
  return (
    <V4Button
      type={typeMap[kind]}
      danger={kind === "danger"}
      size="small"
      loading={loading}
      onClick={onClick}
      style={{
        fontWeight: 600,
        borderRadius: 8,
        whiteSpace: "normal",
        textAlign: "center",
        height: "auto",
        lineHeight: 1.35,
        padding: kind === "danger" ? "4px 6px" : "4px 10px",
        ...(kind === "primary"
          ? {
              boxShadow: "none",
            }
          : kind === "ghost"
            ? {
                background: v4Colors.cardBg,
                borderColor: v4Colors.cardBorder,
                color: v4Colors.text,
              }
            : {
                background: "var(--app-color-surface-critical)",
                borderColor: "rgba(208, 77, 95, 0.2)",
              }),
      }}
    >
      {label}
    </V4Button>
  );
}

function detailToggleButtonStyle(expanded: boolean): CSSProperties {
  return {
    color: expanded ? v4Colors.primary : v4Colors.textMuted,
    fontWeight: 600,
    borderRadius: 8,
    background: expanded ? v4Colors.primarySoft : "transparent",
    border: `1px solid ${expanded ? "#bfdbff" : "transparent"}`,
    whiteSpace: "normal",
    textAlign: "center",
    height: "auto",
    lineHeight: 1.35,
    padding: "4px 8px",
  };
}

const deleteButtonStyle: CSSProperties = {
  padding: "4px 10px",
  fontWeight: 600,
  borderRadius: 8,
  background: "var(--app-color-surface-critical)",
  borderColor: "rgba(208, 77, 95, 0.2)",
};

const confirmPopoverStyle: CSSProperties = {
  position: "absolute",
  bottom: "calc(100% + 8px)",
  right: 0,
  width: 248,
  maxWidth: "calc(100vw - 48px)",
  padding: "12px 14px",
  borderRadius: 12,
  background: v4Colors.cardBg,
  border: `1px solid ${v4Colors.cardBorder}`,
  boxShadow: "var(--app-shadow-card-strong)",
  zIndex: 20,
};

/** 就地删除确认（替代 antd Popconfirm）：点击触发按钮弹出确认气泡。 */
function DeleteConfirm({
  title,
  description,
  okText,
  cancelText,
  triggerLabel,
  loading,
  onConfirm,
}: {
  title: string;
  description: string;
  okText: string;
  cancelText: string;
  triggerLabel: string;
  loading?: boolean;
  onConfirm: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} style={{ position: "relative", display: "inline-flex" }}>
      <V4Button
        type="default"
        size="small"
        danger
        style={deleteButtonStyle}
        onClick={() => setOpen((v) => !v)}
      >
        {triggerLabel}
      </V4Button>
      {open ? (
        <div role="dialog" aria-label={title} style={confirmPopoverStyle}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: v4Colors.text,
              lineHeight: 1.4,
            }}
          >
            {title}
          </div>
          <div
            style={{
              marginTop: 4,
              fontSize: 12,
              color: v4Colors.textMuted,
              lineHeight: 1.5,
            }}
          >
            {description}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              marginTop: 12,
            }}
          >
            <V4Button size="small" onClick={() => setOpen(false)}>
              {cancelText}
            </V4Button>
            <V4Button
              size="small"
              type="primary"
              danger
              loading={loading}
              onClick={() => {
                onConfirm();
                setOpen(false);
              }}
            >
              {okText}
            </V4Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const segmentedRowStyle: CSSProperties = {
  display: "flex",
  gap: 18,
  borderBottom: `1px solid ${v4Colors.divider}`,
};

/** 分段切换（替代 antd Tabs）：底部指示条对齐容器分割线。 */
function SegTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      style={{
        background: "none",
        border: "none",
        padding: "6px 2px",
        marginBottom: -1,
        borderBottom: `2px solid ${active ? v4Colors.primary : "transparent"}`,
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      <span style={tabLabelStyle(active)}>{children}</span>
    </button>
  );
}

/** 空态（替代 antd Empty）。 */
function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        textAlign: "center",
      }}
    >
      <svg
        width="42"
        height="42"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
        style={{ marginBottom: 6, opacity: 0.6 }}
      >
        <path
          d="M3 7.5 12 3l9 4.5-9 4.5-9-4.5Z"
          stroke={v4Colors.textFaint}
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path
          d="M3 7.5V16.5l9 4.5 9-4.5V7.5"
          stroke={v4Colors.textFaint}
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path d="M12 12v9" stroke={v4Colors.textFaint} strokeWidth="1.4" />
      </svg>
      <span style={{ fontSize: 14, fontWeight: 600, color: v4Colors.text }}>
        {title}
      </span>
      <span style={{ fontSize: 13, color: v4Colors.textMuted }}>
        {description}
      </span>
    </div>
  );
}

export function TaskQueueSection({
  jobs,
  spotlightTaskIds = [],
  translateSlotBusy,
  onBuyCredits,
  onAction,
}: {
  jobs: TranslationJobProgressSummary[];
  spotlightTaskIds?: string[];
  translateSlotBusy: boolean;
  onBuyCredits: () => void;
  onAction: Props["onAction"];
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"current" | "history">(
    "current",
  );
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const spotlightTaskIdSet = useMemo(
    () => new Set(spotlightTaskIds),
    [spotlightTaskIds],
  );

  useEffect(() => {
    if (spotlightTaskIds.length === 0) return;
    setTab("current");
    setExpandedTaskId(spotlightTaskIds[0] ?? null);
    setHistoryExpanded(false);
  }, [spotlightTaskIds]);

  const currentJobs = useMemo(
    () =>
      jobs.filter(
        (job) =>
          !job.isTerminal || job.status === "PAUSED" || job.status === "FAILED",
      ),
    [jobs],
  );
  const historyJobs = useMemo(
    () =>
      jobs.filter(
        (job) =>
          job.isTerminal && job.status !== "PAUSED" && job.status !== "FAILED",
      ),
    [jobs],
  );

  const displayJobs = useMemo(() => {
    if (tab === "history") {
      return historyExpanded ? historyJobs : historyJobs.slice(0, 6);
    }
    return currentJobs;
  }, [tab, currentJobs, historyJobs, historyExpanded]);

  const helperText =
    tab === "current"
      ? t("v4.tasks.currentHelper")
      : t("v4.tasks.historyHelper");

  const emptyTitle =
    tab === "history" ? t("v4.tasks.noHistory") : t("v4.tasks.noCurrent");
  const emptyDescription =
    tab === "history"
      ? t("v4.tasks.noHistoryDesc")
      : t("v4.tasks.noCurrentDesc");

  return (
    <div style={{ ...v4CardStyle, padding: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: v4Colors.text }}>
            {t("v4.tasks.title", { count: jobs.length })}
          </h2>
          <div style={{ marginTop: 4, fontSize: 13, color: v4Colors.textMuted, lineHeight: "20px" }}>
            {helperText}
          </div>
        </div>
        <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: v4Colors.textFaint, fontWeight: 600, minWidth: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: v4Colors.successSoft }} />
          {t("v4.tasks.syncLive")}
        </span>
      </div>

      {spotlightTaskIds.length > 0 ? (
        <div
          className="v4-row-enter"
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            marginBottom: 12,
            padding: "10px 12px",
            borderRadius: 10,
            background: v4Colors.infoBg,
            border: `1px solid ${v4Colors.primarySoft}`,
            color: v4Colors.info,
          }}
        >
          <span
            aria-hidden
            className="v4-livedot"
            style={{
              width: 8,
              height: 8,
              marginTop: 6,
              borderRadius: "50%",
              background: "currentColor",
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 13, lineHeight: "20px", overflowWrap: "anywhere" }}>
            {t("v4.tasks.createdHint", { count: spotlightTaskIds.length })}
          </span>
        </div>
      ) : null}

      <div style={{ marginBottom: 12 }}>
        <div role="tablist" style={segmentedRowStyle}>
          <SegTab active={tab === "current"} onClick={() => setTab("current")}>
            {t("v4.tasks.currentTab", { count: currentJobs.length })}
          </SegTab>
          <SegTab active={tab === "history"} onClick={() => setTab("history")}>
            {t("v4.tasks.historyTab", { count: historyJobs.length })}
          </SegTab>
        </div>
      </div>

      {displayJobs.length === 0 ? (
        <div style={{ borderRadius: 8, background: v4Colors.cardSubdued, padding: "32px 16px" }}>
          <EmptyState title={emptyTitle} description={emptyDescription} />
        </div>
      ) : (
        <>
          {displayJobs.map((job) => (
            <CompactJobCard
              key={job.taskId}
              job={job}
              highlighted={spotlightTaskIdSet.has(job.taskId)}
              translateSlotBusy={translateSlotBusy}
              expanded={expandedTaskId === job.taskId}
              onBuyCredits={onBuyCredits}
              onToggleExpand={() =>
                setExpandedTaskId((current) =>
                  current === job.taskId ? null : job.taskId,
                )
              }
              onAction={onAction}
            />
          ))}
          {tab === "history" && historyJobs.length > 6 ? (
            <V4Button
              type="text"
              size="small"
              onClick={() => setHistoryExpanded((v) => !v)}
              style={historyToggleStyle}
            >
              {historyExpanded
                ? t("v4.tasks.collapseHistory")
                : t("v4.tasks.showMoreHistory", {
                    count: historyJobs.length - displayJobs.length,
                  })}
            </V4Button>
          ) : null}
        </>
      )}
    </div>
  );
}

const historyToggleStyle: CSSProperties = {
  padding: "4px 8px",
  fontWeight: 600,
  marginTop: 4,
  whiteSpace: "normal",
  textAlign: "left",
  height: "auto",
  lineHeight: 1.35,
  borderRadius: 8,
  color: v4Colors.textMuted,
};

function tabLabelStyle(active: boolean): CSSProperties {
  return {
    display: "inline-block",
    maxWidth: "100%",
    color: active ? v4Colors.primary : v4Colors.textMuted,
    fontSize: 13,
    fontWeight: active ? 600 : 500,
    lineHeight: 1.35,
    textAlign: "center",
    whiteSpace: "normal",
    overflowWrap: "anywhere",
    transition: "color 0.2s ease",
  };
}
