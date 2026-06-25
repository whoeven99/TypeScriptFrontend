import type { TranslationJobProgressSummary } from "~/server/translateV4/progress.server";
import { v4Colors } from "../v4Styles";

export function ProgressRing({ percent }: { percent: number }) {
  const dash = `${percent} 100`;
  const done = percent >= 100;
  return (
    <div style={{ position: "relative", width: 58, height: 58, flexShrink: 0 }}>
      <svg viewBox="0 0 36 36" style={{ width: 58, height: 58, transform: "rotate(-90deg)" }}>
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="#ece9f6" strokeWidth="3.2" />
        <circle
          cx="18"
          cy="18"
          r="15.5"
          fill="none"
          stroke={done ? v4Colors.success : v4Colors.primary}
          strokeWidth="3.2"
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
          fontSize: 12,
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
        fontSize: 11,
        fontWeight: 700,
        padding: "3px 9px",
        borderRadius: 7,
        background: bg,
        color,
      }}
    >
      {label}
    </span>
  );
}
