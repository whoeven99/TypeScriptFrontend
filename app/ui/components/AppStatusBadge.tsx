import type { CSSProperties } from "react";

type AppStatusTone = "neutral" | "info" | "success" | "caution" | "critical";

interface AppStatusBadgeProps {
  tone?: AppStatusTone;
  children: string;
  style?: CSSProperties;
}

const toneStyles: Record<AppStatusTone, CSSProperties> = {
  neutral: {
    background: "var(--p-color-bg-surface-secondary)",
    color: "var(--app-color-text-secondary)",
    border: "1px solid var(--app-color-border-secondary)",
  },
  info: {
    background: "var(--p-color-bg-surface-info)",
    color: "var(--p-color-text-info)",
    border: "1px solid rgba(84, 103, 255, 0.18)",
  },
  success: {
    background: "var(--p-color-bg-surface-success)",
    color: "var(--p-color-text-success)",
    border: "1px solid rgba(29, 154, 127, 0.18)",
  },
  caution: {
    background: "var(--p-color-bg-surface-caution)",
    color: "var(--p-color-text-caution)",
    border: "1px solid rgba(200, 139, 36, 0.2)",
  },
  critical: {
    background: "var(--p-color-bg-surface-critical)",
    color: "var(--p-color-text-critical)",
    border: "1px solid rgba(208, 77, 95, 0.2)",
  },
};

export default function AppStatusBadge({
  tone = "neutral",
  children,
  style,
}: AppStatusBadgeProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 24,
        padding: "2px 10px",
        borderRadius: 9999,
        fontSize: "var(--app-font-size-caption)",
        lineHeight: "16px",
        fontWeight: 600,
        whiteSpace: "nowrap",
        ...toneStyles[tone],
        ...style,
      }}
    >
      {children}
    </span>
  );
}
