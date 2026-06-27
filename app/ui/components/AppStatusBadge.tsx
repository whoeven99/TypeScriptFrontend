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
  },
  info: {
    background: "var(--p-color-bg-surface-info)",
    color: "var(--p-color-text-info)",
  },
  success: {
    background: "var(--p-color-bg-surface-success)",
    color: "var(--p-color-text-success)",
  },
  caution: {
    background: "var(--p-color-bg-surface-caution)",
    color: "var(--p-color-text-caution)",
  },
  critical: {
    background: "var(--p-color-bg-surface-critical)",
    color: "var(--p-color-text-critical)",
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
        fontWeight: 500,
        whiteSpace: "nowrap",
        ...toneStyles[tone],
        ...style,
      }}
    >
      {children}
    </span>
  );
}
