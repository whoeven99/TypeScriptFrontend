import { useState } from "react";
import { Button, Popconfirm } from "antd";
import type { TranslationJobProgressSummary } from "~/server/translateV4/progress.server";
import { canPauseV4Job, isAutoV4TaskSource } from "~/server/translateV4/types";
import { v4Colors, v4CardStyle } from "../v4Styles";
import { jobDisplayPercent } from "../jobStageUtils";
import { ProgressRing, StatusTag } from "./V4JobCardParts";
import { AutoTaskBadge } from "./AutoTranslateMarkers";
import {
  JobCollapsedMeta,
  JobSummaryStats,
  JobStageProgressList,
} from "./JobExpandedDetail";

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
  const [pending, setPending] = useState<null | "pause" | "resume" | "cancel" | "delete">(
    null,
  );

  const displayStatusLabel =
    job.status === "TRANSLATE_QUEUED" && translateSlotBusy
      ? "排队等待翻译"
      : job.statusLabel;

  const percent = jobDisplayPercent(job);

  const canResume = job.status === "PAUSED" || job.status === "FAILED";
  const canPause = canPauseV4Job(job.status) && !job.isStopping;
  const canCancel =
    job.status !== "COMPLETED" && job.status !== "CANCELLED" && !job.isStopping;
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

  return (
    <div
      style={{
        ...v4CardStyle,
        padding: "14px 16px",
        marginBottom: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <ProgressRing percent={percent} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 14, color: v4Colors.text }}>
              {job.source} → {job.target}
            </span>
            {isAutoV4TaskSource(job.taskSource) ? <AutoTaskBadge /> : null}
            <StatusTag status={job.status} label={displayStatusLabel} />
          </div>
          {!expanded ? <JobCollapsedMeta job={job} /> : null}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            flexShrink: 0,
          }}
        >
          {canDelete ? (
            <Popconfirm
              title="删除该任务？"
              description="会清除任务记录及其翻译内容数据，不可恢复。"
              okText="删除"
              okButtonProps={{ danger: true }}
              cancelText="取消"
              onConfirm={() => runAction("delete")}
            >
              <Button
                type="text"
                size="small"
                loading={pending === "delete"}
                style={{
                  color: v4Colors.textMuted,
                  fontSize: 12,
                  height: 28,
                  paddingInline: 8,
                }}
              >
                删除
              </Button>
            </Popconfirm>
          ) : null}
          <Button
            size="small"
            type="text"
            onClick={() => setExpanded((e) => !e)}
            style={{
              color: v4Colors.primary,
              fontSize: 12,
              fontWeight: 600,
              height: 28,
              paddingInline: 10,
              background: expanded ? v4Colors.primarySoft : "transparent",
              borderRadius: 8,
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
            borderTop: `1px solid ${v4Colors.cardBorder}`,
          }}
        >
          <JobSummaryStats job={job} />
          <JobStageProgressList job={job} />

          {(canResume || canPause || canCancel) ? (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                marginTop: 12,
              }}
            >
              {canResume ? (
                <ActionChip
                  label="继续"
                  primary
                  loading={pending === "resume"}
                  onClick={() => runAction("resume")}
                />
              ) : null}
              {canPause ? (
                <ActionChip
                  label="暂停"
                  loading={pending === "pause"}
                  onClick={() => runAction("pause")}
                />
              ) : null}
              {canCancel ? (
                <ActionChip
                  label="取消"
                  danger
                  loading={pending === "cancel"}
                  onClick={() => runAction("cancel")}
                />
              ) : null}
            </div>
          ) : null}

          {job.errorMessage ? (
            <div style={{ fontSize: 12, color: "#dc2626", marginTop: 8 }}>
              {job.errorMessage}
            </div>
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
  primary,
  danger,
}: {
  label: string;
  onClick: () => void;
  loading?: boolean;
  primary?: boolean;
  danger?: boolean;
}) {
  const border = danger ? "#fecaca" : primary ? v4Colors.primary : "#e2e8f0";
  const bg = danger ? "rgba(239, 68, 68, 0.06)" : primary ? v4Colors.primarySoft : "#fff";
  const color = danger ? "#dc2626" : primary ? v4Colors.primary : v4Colors.text;

  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        borderRadius: 8,
        border: `1px solid ${border}`,
        background: bg,
        color,
        fontSize: 12,
        fontWeight: 600,
        cursor: loading ? "default" : "pointer",
        opacity: loading ? 0.7 : 1,
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
    <div style={{ ...v4CardStyle, padding: "18px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: v4Colors.text }}>
            任务列表 · {jobs.length}
          </h2>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: v4Colors.textMuted,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: v4Colors.successSoft,
              }}
            />
            实时同步
          </span>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        {displayJobs.length === 0 ? (
          <div style={{ fontSize: 13, color: v4Colors.textMuted, padding: "24px 0" }}>
            暂无任务，创建一个开始翻译吧。
          </div>
        ) : (
          displayJobs.map((job) => (
            <CompactJobCard
              key={job.taskId}
              job={job}
              translateSlotBusy={translateSlotBusy}
              onAction={onAction}
            />
          ))
        )}
      </div>
    </div>
  );
}
