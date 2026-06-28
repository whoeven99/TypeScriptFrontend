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
    border: "1px solid color-mix(in srgb, var(--p-color-text-info) 10%, var(--app-color-border-secondary))",
  },
  success: {
    background: "var(--p-color-bg-surface-success)",
    color: "var(--p-color-text-success)",
    border: "1px solid color-mix(in srgb, var(--p-color-text-success) 10%, var(--app-color-border-secondary))",
  },
  caution: {
    background: "var(--p-color-bg-surface-caution)",
    color: "var(--p-color-text-caution)",
    border: "1px solid color-mix(in srgb, var(--p-color-text-caution) 12%, var(--app-color-border-secondary))",
  },
  critical: {
    background: "var(--p-color-bg-surface-critical)",
    color: "var(--p-color-text-critical)",
    border: "1px solid color-mix(in srgb, var(--p-color-text-critical) 12%, var(--app-color-border-secondary))",
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
