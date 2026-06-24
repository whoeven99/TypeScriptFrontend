import { useState } from "react";
import { Button, Popconfirm } from "antd";
import type { TranslationJobProgressSummary } from "~/server/translateV4/progress.server";
import { canPauseV4Job } from "~/server/translateV4/types";
import { v4Colors, v4CardStyle } from "../v4Styles";
import { jobDisplayPercent } from "../jobStageUtils";
import { JobSummaryStats, JobStageProgressList } from "./JobExpandedDetail";

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
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <ProgressRing percent={percent} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: v4Colors.text }}>
              {job.source} → {job.target}
            </span>
            <StatusTag status={job.status} label={displayStatusLabel} />
          </div>
        </div>
        <Button size="small" onClick={() => setExpanded((e) => !e)}>
          {expanded ? "收起" : "查看"}
        </Button>
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

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            {canResume ? (
              <Button
                size="small"
                type="primary"
                loading={pending === "resume"}
                onClick={() => runAction("resume")}
              >
                继续
              </Button>
            ) : null}
            {canPause ? (
              <Button
                size="small"
                loading={pending === "pause"}
                onClick={() => runAction("pause")}
              >
                暂停
              </Button>
            ) : null}
            {canCancel ? (
              <Button
                size="small"
                danger
                loading={pending === "cancel"}
                onClick={() => runAction("cancel")}
              >
                取消
              </Button>
            ) : null}
            {canDelete ? (
              <Popconfirm
                title="删除该任务？"
                description="会清除任务记录及其翻译内容数据，不可恢复。"
                okText="删除"
                okButtonProps={{ danger: true }}
                cancelText="取消"
                onConfirm={() => runAction("delete")}
              >
                <Button size="small" danger loading={pending === "delete"}>
                  删除
                </Button>
              </Popconfirm>
            ) : null}
          </div>

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

function ProgressRing({ percent }: { percent: number }) {
  const dash = `${percent} 100`;
  return (
    <div style={{ position: "relative", width: 48, height: 48, flexShrink: 0 }}>
      <svg
        viewBox="0 0 36 36"
        style={{ width: 48, height: 48, transform: "rotate(-90deg)" }}
      >
        <circle
          cx="18"
          cy="18"
          r="15.5"
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="3"
        />
        <circle
          cx="18"
          cy="18"
          r="15.5"
          fill="none"
          stroke={percent >= 100 ? v4Colors.successSoft : v4Colors.primary}
          strokeWidth="3"
          strokeDasharray={dash}
          strokeLinecap="round"
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 700,
          color: v4Colors.text,
        }}
      >
        {percent}%
      </div>
    </div>
  );
}

function StatusTag({
  status,
  label,
}: {
  status: TranslationJobProgressSummary["status"];
  label: string;
}) {
  const isDone = status === "COMPLETED";
  const isFail = status === "FAILED" || status === "CANCELLED";
  const bg = isDone
    ? "rgba(34, 197, 94, 0.12)"
    : isFail
      ? "rgba(239, 68, 68, 0.1)"
      : v4Colors.primarySoft;
  const color = isDone ? v4Colors.success : isFail ? "#dc2626" : v4Colors.primary;

  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: 6,
        background: bg,
        color,
      }}
    >
      {label}
    </span>
  );
}

export function TaskQueueSection({
  jobs,
  translateSlotBusy,
  onAction,
  onRefresh,
}: {
  jobs: TranslationJobProgressSummary[];
  translateSlotBusy: boolean;
  onAction: Props["onAction"];
  onRefresh: () => void;
}) {
  const displayJobs = jobs.slice(0, 10);

  return (
    <div style={{ ...v4CardStyle, padding: "18px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: v4Colors.text }}>
            任务队列 · {jobs.length}
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
        <Button size="small" type="text" onClick={onRefresh}>刷新</Button>
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
