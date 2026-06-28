import { useEffect, useMemo, useState } from "react";
import { Button, Empty, Popconfirm, Tabs } from "antd";
import type { CSSProperties } from "react";
import type { TranslationJobProgressSummary } from "~/server/translateV4/progress.server";
import { canPauseV4Job, isAutoV4TaskSource } from "~/server/translateV4/types";
import { v4Colors, v4CardStyle } from "../v4Styles";
import {
  jobDisplayPercent,
  visibleStageIndex,
  VISIBLE_STAGE_LABELS,
} from "../jobStageUtils";
import { ProgressRing, StatusTag, MiniStageTrack } from "./V4JobCardParts";
import { AutoTaskBadge } from "./AutoTranslateMarkers";
import { JobCollapsedMeta, JobSummaryStats, JobStageProgressList } from "./JobExpandedDetail";

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
  const [pending, setPending] = useState<null | "pause" | "resume" | "cancel" | "delete">(null);

  const displayStatusLabel =
    job.status === "TRANSLATE_QUEUED" && translateSlotBusy ? "排队等待翻译" : job.statusLabel;

  const percent = jobDisplayPercent(job);

  const canResume = job.status === "PAUSED" || job.status === "FAILED";
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
        ? "已取消"
        : "已结束"
    : ["VERIFY_QUEUED", "VERIFYING"].includes(job.status)
      ? ""
      : `进行中：${VISIBLE_STAGE_LABELS[visibleStageIndex(job.status, job.errorStage)] ?? "等待"}`;

  return (
    <div
      style={{
        ...v4CardStyle,
        padding: expanded ? "14px 16px" : "12px 16px",
        marginBottom: 10,
        background: expanded ? v4Colors.cardSubdued : v4Colors.cardBg,
        borderColor: expanded ? "#d6e4ff" : v4Colors.cardBorder,
        boxShadow: expanded ? "0 4px 14px rgba(22, 119, 255, 0.07)" : "0 1px 2px rgba(22, 119, 255, 0.04)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <ProgressRing percent={percent} size="sm" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: v4Colors.text }}>
              {job.source} → {job.target}
            </span>
            {isAutoV4TaskSource(job.taskSource) ? <AutoTaskBadge /> : null}
            <StatusTag status={job.status} label={displayStatusLabel} />
            {stageSummary ? (
              <span style={{ fontSize: 12, color: v4Colors.textFaint, fontWeight: 400 }}>
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
            }}
          >
            {expanded ? "收起" : "查看"}
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
                  <ActionChip label="继续" kind="primary" loading={pending === "resume"} onClick={() => runAction("resume")} />
                ) : null}
                {canPause ? (
                  <ActionChip label="暂停" kind="ghost" loading={pending === "pause"} onClick={() => runAction("pause")} />
                ) : null}
                {canCancel ? (
                  <ActionChip label="取消任务" kind="danger" loading={pending === "cancel"} onClick={() => runAction("cancel")} />
                ) : null}
              </div>
              {canDelete ? (
                <Popconfirm
                  title="删除该任务？"
                  description="会清除任务记录及其翻译内容数据，不可恢复。"
                  okText="删除"
                  okButtonProps={{ danger: true, loading: pending === "delete" }}
                  cancelText="取消"
                  onConfirm={() => runAction("delete")}
                >
                  <Button type="link" size="small" danger style={deleteLinkButtonStyle}>
                    删除记录
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

  useEffect(() => {
    if (tab === "current" && currentJobs.length === 0 && historyJobs.length > 0) {
      setTab("history");
    }
  }, [tab, currentJobs.length, historyJobs.length]);

  const displayJobs = useMemo(() => {
    if (tab === "history") {
      return historyExpanded ? historyJobs : historyJobs.slice(0, 6);
    }
    return currentJobs;
  }, [tab, currentJobs, historyJobs, historyExpanded]);

  const helperText =
    tab === "current"
      ? "优先处理进行中、暂停中和失败的任务。"
      : "这里保留已完成或已取消的任务记录。";

  return (
    <div style={{ ...v4CardStyle, padding: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: v4Colors.text }}>
            任务列表 · {jobs.length}
          </h2>
          <div style={{ marginTop: 4, fontSize: 13, color: v4Colors.textMuted, lineHeight: "20px" }}>
            {helperText}
          </div>
        </div>
        <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: v4Colors.textFaint, fontWeight: 600 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: v4Colors.successSoft }} />
          实时同步
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
                  当前任务 {currentJobs.length}
                </span>
              ),
            },
            {
              key: "history",
              label: (
                <span style={tabLabelStyle(tab === "history")}>
                  历史任务 {historyJobs.length}
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
              <span style={{ fontSize: 13, color: v4Colors.textMuted }}>
                {tab === "history"
                  ? "已完成或已取消的任务会显示在这里。"
                  : "选好语言和内容后，点击上方按钮创建第一个翻译任务。"}
              </span>
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
                ? "收起历史记录"
                : `显示更多历史记录（剩余 ${historyJobs.length - displayJobs.length} 条）`}
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
};

function tabLabelStyle(active: boolean): CSSProperties {
  return {
    color: active ? v4Colors.primary : v4Colors.textMuted,
    fontSize: 13,
    fontWeight: active ? 600 : 500,
    transition: "color 0.2s ease",
  };
}
