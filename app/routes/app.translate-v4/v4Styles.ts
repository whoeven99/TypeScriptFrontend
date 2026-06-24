import type { CSSProperties } from "react";

export const v4Colors = {
  pageBg: "#eef0f4",
  cardBg: "#ffffff",
  cardBorder: "rgba(15, 23, 42, 0.06)",
  summaryBg: "linear-gradient(145deg, #1a1744 0%, #2d2860 55%, #1e1b4b 100%)",
  primary: "#5b4fcf",
  primaryHover: "#4a3fc0",
  primarySoft: "rgba(91, 79, 207, 0.12)",
  success: "#16a34a",
  successSoft: "#22c55e",
  warning: "#f59e0b",
  text: "#0f172a",
  textMuted: "#64748b",
  textLight: "rgba(255,255,255,0.72)",
};

export const v4PageStyle: CSSProperties = {
  background: v4Colors.pageBg,
  minHeight: "calc(100vh - 48px)",
  margin: "-16px -20px",
  padding: "20px 24px 32px",
};

export const v4CardStyle: CSSProperties = {
  background: v4Colors.cardBg,
  borderRadius: 16,
  border: `1px solid ${v4Colors.cardBorder}`,
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
};
