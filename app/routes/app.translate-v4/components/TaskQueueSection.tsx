import { useState } from "react";
import { Popconfirm } from "antd";
import type { CSSProperties } from "react";
import type { TranslationJobProgressSummary } from "~/server/translateV4/progress.server";
import { canPauseV4Job, isAutoV4TaskSource } from "~/server/translateV4/types";
import { v4Colors, v4CardStyle } from "../v4Styles";
import {
  jobDisplayPercent,
  stageBarPercent,
  isStageBarComplete,
  stageOf,
} from "../jobStageUtils";
import { ProgressRing, StatusTag } from "./V4JobCardParts";
import { AutoTaskBadge } from "./AutoTranslateMarkers";
import { JobSummaryStats, JobStageProgressList } from "./JobExpandedDetail";

const STAGE_NAMES = ["初始化", "翻译", "写回", "校验"];

type Props = {
  job: TranslationJobProgressSummary;
  translateSlotBusy: boolean;
  onAction: (
    taskId: string,
    action: "pause" | "resume" | "cancel" | "delete",
  ) => Promise<boolean>;
};

export function CompactJobCard({ job, translateSlotBusy, onAction }: Props) {
  const [expanded, setExpanded] = useState(false);
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

  // 顶部四段迷你进度条
  const activeIdx = stageOf(job.status, job.errorStage);
  const miniStages = [0, 1, 2, 3].map((idx) => {
    const pct = stageBarPercent(idx, job.metrics, job.status);
    const complete = isStageBarComplete(idx, job.metrics, job.status);
    const color = complete ? v4Colors.successSoft : pct > 0 ? v4Colors.primary : "#e2e8f0";
    return { pct, color };
  });
  const stageSummary = job.isTerminal
    ? job.status === "COMPLETED"
      ? ""
      : job.status === "CANCELLED"
        ? "已取消"
        : "已结束"
    : `进行中：${STAGE_NAMES[activeIdx] ?? "等待"}`;

  return (
    <div style={{ ...v4CardStyle, padding: "10px 14px", marginBottom: 8 }}>
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
              <span style={{ fontSize: 11.5, color: v4Colors.textFaint, fontWeight: 500 }}>
                {stageSummary}
              </span>
            ) : null}
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {miniStages.map((s, i) => (
              <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: "#f0efe9", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${s.pct}%`, background: s.color, borderRadius: 2, transition: "width 0.5s" }} />
              </div>
            ))}
          </div>
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
            onClick={() => setExpanded((e) => !e)}
            style={{
              color: v4Colors.primary,
              fontSize: 12,
              fontWeight: 700,
              fontFamily: "inherit",
              cursor: "pointer",
              border: "none",
              borderRadius: 6,
              padding: "4px 10px",
              background: expanded ? "rgba(91,79,207,0.1)" : "transparent",
            }}
          >
            {expanded ? "收起" : "查看"}
          </button>
        </div>
      </div>

      {expanded ? (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #efeee8" }}>
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
    primary: { border: `1px solid ${v4Colors.primary}`, background: "rgba(91,79,207,0.1)", color: v4Colors.primary },
    ghost: { border: "1px solid #e2e1da", background: "#fff", color: v4Colors.text },
    danger: { border: "1px solid #f4cccc", background: "rgba(220,60,60,0.06)", color: "#c0392b" },
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
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 700,
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
  const displayJobs = jobs.slice(0, 10);

  return (
    <div style={{ ...v4CardStyle, padding: "14px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: v4Colors.text }}>
            任务列表 · {jobs.length}
          </h2>
        </div>
        <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: v4Colors.textFaint, fontWeight: 600 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: v4Colors.successSoft }} />
          实时同步
        </span>
      </div>

      {displayJobs.length === 0 ? (
        <div
          style={{
            border: "1px dashed #d8d7d0",
            borderRadius: 16,
            padding: "48px 24px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 30, marginBottom: 12 }}>🌐</div>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6, color: v4Colors.text }}>队列为空</div>
          <div style={{ fontSize: 13, color: v4Colors.textFaint }}>选好语言和内容，点上面的按钮创建第一个任务。</div>
        </div>
      ) : (
        displayJobs.map((job) => (
          <CompactJobCard key={job.taskId} job={job} translateSlotBusy={translateSlotBusy} onAction={onAction} />
        ))
      )}
    </div>
  );
}
