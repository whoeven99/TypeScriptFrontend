import type { TranslationJobProgressSummary } from "~/server/translateV4/progress.server";
import { v4Colors } from "../v4Styles";

export function ProgressRing({ percent }: { percent: number }) {
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

export function StatusTag({
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
