import type { TranslationJobProgressSummary } from "~/server/translateV4/progress.server";
import { v4Colors } from "../v4Styles";

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
    bg = "rgba(31, 157, 107, 0.12)";
    color = v4Colors.success;
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
