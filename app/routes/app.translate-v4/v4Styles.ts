import type { CSSProperties } from "react";

export const v4Colors = {
  pageBg: "#f5f7fb",
  cardBg: "#ffffff",
  cardSubdued: "#fafcff",
  cardSelected: "#f0f5ff",
  cardBorder: "#e5eaf3",
  divider: "#edf1f7",
  summaryBg: "linear-gradient(135deg, #f8fbff 0%, #eef4ff 100%)",
  primary: "#1677ff",
  primaryHover: "#0958d9",
  primaryTextOnFill: "#ffffff",
  primarySoft: "#e6f4ff",
  infoBg: "#e6f4ff",
  info: "#1677ff",
  successBg: "#f6ffed",
  success: "#52c41a",
  successSoft: "#b7eb8f",
  warningBg: "#fffbe6",
  warning: "#faad14",
  dangerBg: "#fff2f0",
  danger: "#ff4d4f",
  text: "#1f1f1f",
  textMuted: "#595959",
  textFaint: "#8c8c8c",
  textLight: "#595959",
  ringTrack: "#d9e2f2",
  progressTrack: "#eef2f8",
  disabledBg: "#f5f5f5",
  disabledText: "#bfbfbf",
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
  boxShadow: "0 1px 2px rgba(22, 119, 255, 0.04)",
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
