import type { TranslationJobProgressSummary } from "~/server/translateV4/progress.server";
import { v4Colors } from "../v4Styles";
import {
  VISIBLE_STAGE_LABELS,
  miniStageSegmentState,
  type VisibleStageIndex,
} from "../jobStageUtils";

export function ProgressRing({ percent, size = "md" }: { percent: number; size?: "md" | "sm" }) {
  const dash = `${percent} 100`;
  const done = percent >= 100;
  const dim = size === "sm" ? 44 : 58;
  const fontSize = size === "sm" ? 10 : 12;
  const strokeWidth = size === "sm" ? 2.8 : 3.2;
  return (
    <div style={{ position: "relative", width: dim, height: dim, flexShrink: 0 }}>
      <svg viewBox="0 0 36 36" style={{ width: dim, height: dim, transform: "rotate(-90deg)" }}>
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="#ece9f6" strokeWidth={strokeWidth} />
        <circle
          cx="18"
          cy="18"
          r="15.5"
          fill="none"
          stroke={done ? v4Colors.success : v4Colors.primary}
          strokeWidth={strokeWidth}
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
          fontFamily: v4Colors.mono,
          fontSize,
          fontWeight: 600,
          color: v4Colors.text,
        }}
      >
        {percent}%
      </div>
    </div>
  );
}

const MINI_STAGE_INDICES: VisibleStageIndex[] = [0, 1, 2];

/** 列表卡片：三阶段迷你进度（初始化 → 翻译 → 写回，不含 verify）。 */
export function MiniStageTrack({ job }: { job: TranslationJobProgressSummary }) {
  const segments = MINI_STAGE_INDICES.map((idx) => ({
    idx,
    label: VISIBLE_STAGE_LABELS[idx],
    ...miniStageSegmentState(idx, job),
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {segments.map((seg, i) => (
          <div key={seg.idx} style={{ flex: 1, display: "flex", alignItems: "center", minWidth: 0 }}>
            {i > 0 ? (
              <span
                aria-hidden
                style={{
                  width: 8,
                  height: 1,
                  flexShrink: 0,
                  marginRight: 6,
                  background:
                    segments[i - 1]!.complete ? v4Colors.successSoft : "#e2e1da",
                }}
              />
            ) : null}
            <div
              style={{
                flex: 1,
                height: 5,
                borderRadius: 999,
                background: "#edecea",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${seg.percent}%`,
                  borderRadius: 999,
                  background: seg.complete
                    ? v4Colors.successSoft
                    : seg.active
                      ? v4Colors.primary
                      : "#d8d7d0",
                  transition: "width 0.45s ease, background 0.2s",
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {segments.map((seg) => (
          <span
            key={seg.idx}
            style={{
              flex: 1,
              minWidth: 0,
              textAlign: "center",
              fontSize: 10,
              fontWeight: seg.active ? 700 : 500,
              color: seg.complete
                ? v4Colors.success
                : seg.active
                  ? v4Colors.primary
                  : v4Colors.textFaint,
              lineHeight: 1.2,
              letterSpacing: "0.01em",
            }}
          >
            {seg.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function StatusTag({
  status,
  label,
}: {
  status: TranslationJobProgressSummary["status"];
  label: string;
}) {
  let bg = v4Colors.primarySoft;
  let color = v4Colors.primary;
  if (status === "COMPLETED") {
    bg = "rgba(37, 99, 235, 0.1)";
    color = "#2563eb";
  } else if (status === "PAUSED") {
    bg = "#fcf0d9";
    color = "#b87a00";
  } else if (status === "CANCELLED") {
    bg = "#eceae6";
    color = "#8a8a94";
  } else if (status === "FAILED") {
    bg = "rgba(220, 38, 38, 0.1)";
    color = v4Colors.danger;
  }

  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        padding: "2px 7px",
        borderRadius: 6,
        background: bg,
        color,
      }}
    >
      {label}
    </span>
  );
}
