import type { CSSProperties } from "react";

export const v4Colors = {
  pageBg: "#f4f3ef",
  cardBg: "#ffffff",
  cardBorder: "#ecebe5",
  summaryBg: "linear-gradient(150deg, #2a2546 0%, #1b1830 100%)",
  primary: "#5b4fcf",
  primaryHover: "#4a3fc0",
  primarySoft: "rgba(91, 79, 207, 0.12)",
  success: "#1f9d6b",
  successSoft: "#22c55e",
  warning: "#f59e0b",
  danger: "#dc2626",
  text: "#1b1b21",
  textMuted: "#6b6b76",
  textFaint: "#9a9aa2",
  textLight: "rgba(255,255,255,0.72)",
  // 字体
  font: "'Manrope', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
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
  borderRadius: 16,
  border: `1px solid ${v4Colors.cardBorder}`,
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
};

export function v4ChipStyle(selected: boolean): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 12px",
    borderRadius: 10,
    border: selected ? `1.5px solid ${v4Colors.primary}` : `1.5px solid #e7e6e0`,
    background: selected ? v4Colors.primarySoft : "#fff",
    color: selected ? v4Colors.primary : v4Colors.text,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s",
    fontFamily: "inherit",
  };
}
