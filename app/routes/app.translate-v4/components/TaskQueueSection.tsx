import { useMemo, useState } from "react";
import { Button, Empty, Popconfirm, Tabs } from "antd";
import { useTranslation } from "react-i18next";
import type { CSSProperties } from "react";
import type { TranslationJobProgressSummary } from "~/server/translateV4/progress.server";
import { canPauseV4Job, isAutoV4TaskSource } from "~/server/translateV4/types";
import { v4Colors, v4CardStyle } from "../v4Styles";
import { formatLocaleRoute } from "../localeDisplay";
import { jobDisplayPercent } from "../jobStageUtils";
import { ProgressRing, StatusTag, MiniStageTrack } from "./V4JobCardParts";
import { AutoTaskBadge } from "./AutoTranslateMarkers";
import { JobCollapsedMeta, JobSummaryStats, JobStageProgressList } from "./JobExpandedDetail";
import { getV4JobStatusLabel, getV4VisibleStageLabel } from "../v4I18n";

type Props = {
  job: TranslationJobProgressSummary;
  translateSlotBusy: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onAction: (
    taskId: string,
    action: "pause" | "resume" | "cancel" | "delete",
  ) => Promise<boolean>;
};

export function CompactJobCard({
  job,
  translateSlotBusy,
  expanded,
  onToggleExpand,
  onAction,
}: Props) {
  const { t } = useTranslation();
  const [pending, setPending] = useState<null | "pause" | "resume" | "cancel" | "delete">(null);

  const displayStatusLabel = getV4JobStatusLabel(job, t, translateSlotBusy);

  const percent = jobDisplayPercent(job);

  const canResume = job.canResume;
  const canPause = canPauseV4Job(job.status) && !job.isStopping;
  const canCancel = job.status !== "COMPLETED" && job.status !== "CANCELLED" && !job.isStopping;
  const canDelete =
    job.isTerminal ||
    job.status === "PAUSED" ||
    job.status === "CANCELLED" ||
    job.status === "FAILED" ||
    job.status === "COMPLETED";

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
        ? t("v4.tasks.cancelled")
        : t("v4.tasks.ended")
    : t("v4.tasks.inProgress", { stage: getV4VisibleStageLabel(job, t) });

  return (
    <div
      style={{
        ...v4CardStyle,
        padding: expanded ? "14px 16px" : "12px 16px",
        marginBottom: 10,
        background: expanded ? v4Colors.cardSubdued : v4Colors.cardBg,
        border: expanded ? "1px solid #d6e4ff" : "none",
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
          <Button
            type="text"
            size="small"
            onClick={onToggleExpand}
            style={{
              color: expanded ? v4Colors.primaryHover : v4Colors.primary,
              fontWeight: 600,
              borderRadius: 8,
              background: expanded ? v4Colors.primarySoft : v4Colors.cardSubdued,
              border: `1px solid ${expanded ? "#bfdbff" : v4Colors.cardBorder}`,
              whiteSpace: "normal",
              textAlign: "center",
              height: "auto",
              lineHeight: 1.35,
            }}
          >
            {expanded ? t("v4.tasks.collapse") : t("v4.tasks.view")}
          </Button>
        </div>
      </div>

      {expanded ? (
        <div
          style={{
            marginTop: 14,
            paddingTop: 14,
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
                <Popconfirm
                  title={t("v4.tasks.deleteConfirmTitle")}
                  description={t("v4.tasks.deleteConfirmDesc")}
                  okText={t("Delete")}
                  okButtonProps={{ danger: true, loading: pending === "delete" }}
                  cancelText={t("Cancel")}
                  onConfirm={() => runAction("delete")}
                >
                  <Button type="link" size="small" danger style={deleteLinkButtonStyle}>
                    {t("v4.tasks.deleteRecord")}
                  </Button>
                </Popconfirm>
              ) : null}
            </div>
          ) : null}

          {job.errorMessage ? (
            <div style={{ fontSize: 12, color: v4Colors.danger, marginTop: 8 }}>{job.errorMessage}</div>
          ) : null}
        </div>
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
  const typeMap: Record<"primary" | "ghost" | "danger", "primary" | "default" | "text"> = {
    primary: "primary",
    ghost: "default",
    danger: "text",
  };
  return (
    <Button
      type={typeMap[kind]}
      danger={kind === "danger"}
      size="small"
      disabled={loading}
      onClick={onClick}
      style={{
        fontWeight: 600,
        borderRadius: 8,
        whiteSpace: "normal",
        textAlign: "center",
        height: "auto",
        lineHeight: 1.35,
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
                paddingInline: 4,
              }),
      }}
    >
      {label}
    </Button>
  );
}

const deleteLinkButtonStyle: CSSProperties = {
  paddingInline: 0,
  fontWeight: 500,
};

export function TaskQueueSection({
  jobs,
  translateSlotBusy,
  onAction,
}: {
  jobs: TranslationJobProgressSummary[];
  translateSlotBusy: boolean;
  onAction: Props["onAction"];
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"current" | "history">(
    "current",
  );
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [historyExpanded, setHistoryExpanded] = useState(false);

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

      <div style={{ marginBottom: 12 }}>
        <Tabs
          activeKey={tab}
          onChange={(value) => setTab(value as "current" | "history")}
          size="small"
          items={[
            {
              key: "current",
              label: (
                <span style={tabLabelStyle(tab === "current")}>
                  {t("v4.tasks.currentTab", { count: currentJobs.length })}
                </span>
              ),
            },
            {
              key: "history",
              label: (
                <span style={tabLabelStyle(tab === "history")}>
                  {t("v4.tasks.historyTab", { count: historyJobs.length })}
                </span>
              ),
            },
          ]}
          style={{ marginBottom: 0 }}
        />
      </div>

      {displayJobs.length === 0 ? (
        <div style={{ borderRadius: 8, background: v4Colors.cardSubdued, padding: "32px 16px" }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: v4Colors.text }}>
                  {emptyTitle}
                </span>
                <span style={{ fontSize: 13, color: v4Colors.textMuted }}>
                  {emptyDescription}
                </span>
              </div>
            }
          />
        </div>
      ) : (
        <>
          {displayJobs.map((job) => (
            <CompactJobCard
              key={job.taskId}
              job={job}
              translateSlotBusy={translateSlotBusy}
              expanded={expandedTaskId === job.taskId}
              onToggleExpand={() =>
                setExpandedTaskId((current) =>
                  current === job.taskId ? null : job.taskId,
                )
              }
              onAction={onAction}
            />
          ))}
          {tab === "history" && historyJobs.length > 6 ? (
            <Button
              type="link"
              size="small"
              onClick={() => setHistoryExpanded((v) => !v)}
              style={historyToggleStyle}
            >
              {historyExpanded
                ? t("v4.tasks.collapseHistory")
                : t("v4.tasks.showMoreHistory", {
                    count: historyJobs.length - displayJobs.length,
                  })}
            </Button>
          ) : null}
        </>
      )}
    </div>
  );
}

const historyToggleStyle: CSSProperties = {
  paddingInline: 0,
  fontWeight: 600,
  marginTop: 4,
  whiteSpace: "normal",
  textAlign: "left",
  height: "auto",
  lineHeight: 1.35,
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
