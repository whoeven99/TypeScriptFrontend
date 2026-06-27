import { useEffect, useMemo, useState } from "react";
import { Popconfirm } from "antd";
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
import { JobSummaryStats, JobStageProgressList } from "./JobExpandedDetail";

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
    <div style={{ ...v4CardStyle, padding: "12px 16px", marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <ProgressRing percent={percent} size="sm" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 800, fontSize: 14, color: v4Colors.text }}>
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
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
          {canDelete ? (
            <Popconfirm
              title="删除该任务？"
              description="会清除任务记录及其翻译内容数据，不可恢复。"
              okText="删除"
              okButtonProps={{ danger: true, loading: pending === "delete" }}
              cancelText="取消"
              onConfirm={() => runAction("delete")}
            >
              <button type="button" style={ghostTextBtn}>删除</button>
            </Popconfirm>
          ) : null}
          <button
            type="button"
            onClick={onToggleExpand}
            style={{
              color: v4Colors.primary,
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "inherit",
              cursor: "pointer",
              border: "none",
              borderRadius: 999,
              padding: "4px 10px",
              background: expanded ? v4Colors.primarySoft : "transparent",
            }}
          >
            {expanded ? "收起" : "查看"}
          </button>
        </div>
      </div>

      {expanded ? (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${v4Colors.divider}` }}>
          <JobSummaryStats job={job} />
          <JobStageProgressList job={job} />

          {canResume || canPause || canCancel ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
              {canResume ? (
                <ActionChip label="继续" kind="primary" loading={pending === "resume"} onClick={() => runAction("resume")} />
              ) : null}
              {canPause ? (
                <ActionChip label="暂停" kind="ghost" loading={pending === "pause"} onClick={() => runAction("pause")} />
              ) : null}
              {canCancel ? (
                <ActionChip label="取消" kind="danger" loading={pending === "cancel"} onClick={() => runAction("cancel")} />
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

const ghostTextBtn: CSSProperties = {
  color: v4Colors.textFaint,
  fontSize: 12,
  fontWeight: 600,
  fontFamily: "inherit",
  cursor: "pointer",
  border: "none",
  background: "none",
  padding: "4px 6px",
};

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
  const map: Record<"primary" | "ghost" | "danger", CSSProperties> = {
    primary: { border: `1px solid ${v4Colors.primary}`, background: v4Colors.primarySoft, color: v4Colors.primary },
    ghost: { border: `1px solid ${v4Colors.cardBorder}`, background: v4Colors.cardBg, color: v4Colors.text },
    danger: { border: `1px solid ${v4Colors.danger}`, background: v4Colors.dangerBg, color: v4Colors.danger },
  } as const;
  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 14px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        fontFamily: "inherit",
        cursor: loading ? "default" : "pointer",
        opacity: loading ? 0.7 : 1,
        ...map[kind],
      }}
    >
      {label}
    </button>
  );
}

export function TaskQueueSection({
  jobs,
  translateSlotBusy,
  onAction,
}: {
  jobs: TranslationJobProgressSummary[];
  translateSlotBusy: boolean;
  onAction: Props["onAction"];
}) {
  const [tab, setTab] = useState<"current" | "history" | "all">(
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
    if (tab === "all") return jobs;
    if (tab === "history") {
      return historyExpanded ? historyJobs : historyJobs.slice(0, 6);
    }
    return currentJobs;
  }, [tab, jobs, currentJobs, historyJobs, historyExpanded]);

  const helperText =
    tab === "current"
      ? "优先处理进行中、暂停中和失败的任务。"
      : tab === "history"
        ? "这里保留已完成或已取消的任务记录。"
        : "查看全部任务，适合排查全局状态。";

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

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => setTab("current")}
          style={filterChipStyle(tab === "current")}
        >
          进行中 {currentJobs.length}
        </button>
        <button
          type="button"
          onClick={() => setTab("history")}
          style={filterChipStyle(tab === "history")}
        >
          历史记录 {historyJobs.length}
        </button>
        <button
          type="button"
          onClick={() => setTab("all")}
          style={filterChipStyle(tab === "all")}
        >
          全部 {jobs.length}
        </button>
      </div>

      {displayJobs.length === 0 ? (
        <div
          style={{
            border: `1px dashed ${v4Colors.cardBorder}`,
            borderRadius: 8,
            padding: "40px 24px",
            textAlign: "center",
            background: v4Colors.cardSubdued,
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, color: v4Colors.text }}>
            {tab === "history" ? "暂无历史记录" : "队列为空"}
          </div>
          <div style={{ fontSize: 13, color: v4Colors.textMuted, lineHeight: "20px" }}>
            {tab === "history"
              ? "已完成或已取消的任务会显示在这里。"
              : "选好语言和内容后，点击上方按钮创建第一个翻译任务。"}
          </div>
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
            <button
              type="button"
              onClick={() => setHistoryExpanded((v) => !v)}
              style={historyToggleStyle}
            >
              {historyExpanded
                ? "收起历史记录"
                : `显示更多历史记录（剩余 ${historyJobs.length - displayJobs.length} 条）`}
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}

function filterChipStyle(active: boolean): CSSProperties {
  return {
    border: `1px solid ${active ? v4Colors.primary : v4Colors.cardBorder}`,
    background: active ? v4Colors.primarySoft : v4Colors.cardBg,
    color: active ? v4Colors.primary : v4Colors.textMuted,
    borderRadius: 999,
    padding: "6px 12px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  };
}

const historyToggleStyle: CSSProperties = {
  background: "none",
  border: "none",
  color: v4Colors.primary,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  padding: "4px 0 0",
  fontFamily: "inherit",
};
