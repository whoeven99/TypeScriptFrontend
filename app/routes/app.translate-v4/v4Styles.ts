import type { CSSProperties } from "react";

export const v4Colors = {
  pageBg: "var(--p-color-bg)",
  cardBg: "var(--p-color-bg-surface)",
  cardSubdued: "var(--p-color-bg-surface-secondary)",
  cardSelected: "var(--p-color-bg-surface-selected)",
  cardBorder: "var(--p-color-border-secondary)",
  divider: "var(--p-color-border-secondary)",
  summaryBg: "var(--p-color-bg-surface-selected)",
  primary: "var(--p-color-bg-fill-brand)",
  primaryTextOnFill: "var(--p-color-text-brand-on-bg-fill)",
  primarySoft: "var(--p-color-bg-surface-selected)",
  infoBg: "var(--p-color-bg-surface-info)",
  info: "var(--p-color-text-info)",
  successBg: "var(--p-color-bg-surface-success)",
  success: "var(--p-color-text-success)",
  successSoft: "var(--p-color-bg-surface-success)",
  warningBg: "var(--p-color-bg-surface-caution)",
  warning: "var(--p-color-text-caution)",
  dangerBg: "var(--p-color-bg-surface-critical)",
  danger: "var(--p-color-text-critical)",
  text: "var(--p-color-text)",
  textMuted: "var(--p-color-text-secondary)",
  textFaint: "var(--p-color-text-tertiary)",
  textLight: "var(--p-color-text-secondary)",
  ringTrack: "var(--p-color-border-secondary)",
  progressTrack: "var(--p-color-bg-surface-secondary)",
  disabledBg: "var(--p-color-bg-surface-disabled)",
  disabledText: "var(--p-color-text-disabled)",
  // 字体
  font: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
} as const;

export const v4PageStyle: CSSProperties = {
  background: v4Colors.pageBg,
  minHeight: "calc(100vh - 48px)",
  margin: "-16px -20px",
  padding: "20px 24px 32px",
  fontFamily: v4Colors.font,
  color: v4Colors.text,
  WebkitFontSmoothing: "antialiased",
};

export const v4CardStyle: CSSProperties = {
  background: v4Colors.cardBg,
  borderRadius: 8,
  border: `1px solid ${v4Colors.cardBorder}`,
  boxShadow: "none",
};

export function v4ChipStyle(selected: boolean): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 12px",
    borderRadius: 999,
    border: `1px solid ${selected ? v4Colors.primary : v4Colors.cardBorder}`,
    background: selected ? v4Colors.primarySoft : v4Colors.cardBg,
    color: selected ? v4Colors.primary : v4Colors.text,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s",
    fontFamily: "inherit",
  };
}
