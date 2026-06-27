import { useEffect } from "react";
import type { CSSProperties } from "react";
import { v4Colors } from "../v4Styles";
import { formatCredits } from "../localeDisplay";
import type { CoverageSummary } from "~/server/translateV4/coverage.server";

type Props = {
  summary: CoverageSummary;
};

/** 左侧摘要卡固定宽度与高度，不随右侧表单展开而拉伸。 */
const SUMMARY_CARD_WIDTH = 296;
const SUMMARY_RING_SIZE = 148;

export function SummaryDonutCard({ summary }: Props) {
  const percent = summary.overallPercent ?? 0;
  const dash = `${percent} 100`;

  return (
    <div
      style={{
        background: v4Colors.summaryBg,
        borderRadius: 20,
        padding: "22px 24px 18px",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        width: SUMMARY_CARD_WIDTH,
        minWidth: SUMMARY_CARD_WIDTH,
        boxSizing: "border-box",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "8px 0 20px",
        }}
      >
        <div style={{ position: "relative", width: SUMMARY_RING_SIZE, height: SUMMARY_RING_SIZE }}>
          <svg
            viewBox="0 0 36 36"
            style={{ width: SUMMARY_RING_SIZE, height: SUMMARY_RING_SIZE, transform: "rotate(-90deg)" }}
          >
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="3" />
            <circle
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              stroke="#8b7cf8"
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
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontFamily: v4Colors.mono, fontSize: 30, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1 }}>
              {summary.overallPercent != null ? `${summary.overallPercent}%` : "—"}
            </span>
            <span style={{ fontSize: 11, color: "#8c84c4", marginTop: 4, fontWeight: 600 }}>已翻译</span>
          </div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          borderTop: "1px solid rgba(255,255,255,0.12)",
          paddingTop: 16,
          flexShrink: 0,
        }}
      >
        <StatFoot label="语言" value={`${summary.languageCount}`} unit="语言" />
        <StatFoot label="已译条目" value={formatLargeCount(summary.translatedItems)} unit="已译条目" align="right" />
      </div>
    </div>
  );
}

function StatFoot({
  label,
  value,
  unit,
  align = "left",
}: {
  label: string;
  value: string;
  unit: string;
  align?: "left" | "right";
}) {
  return (
    <div style={{ textAlign: align, minWidth: 0 }}>
      <div style={{ fontFamily: v4Colors.mono, fontSize: 18, fontWeight: 600, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 11, color: "#9a92cc", fontWeight: 600, marginTop: 3 }}>{unit}</div>
    </div>
  );
}

function formatLargeCount(n: number): string {
  return n.toLocaleString();
}

export function PageHeaderBar({
  shop,
  credits,
}: {
  shop: string;
  credits: number | null;
}) {
  // 自动注入 Manrope / JetBrains Mono（CDN 不可用时回退系统字体）。
  useEffect(() => {
    const id = "ciwi-v4-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap";
    document.head.appendChild(link);
  }, []);

  const avatarLetter = (shop[0] ?? "C").toUpperCase();

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 22,
        gap: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 11,
            background: v4Colors.primary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 6px 16px rgba(91,79,207,0.32)",
          }}
        >
          <div
            style={{
              width: 15,
              height: 15,
              border: "2.5px solid #fff",
              borderRadius: "50%",
              borderRightColor: "transparent",
              transform: "rotate(-30deg)",
            }}
          />
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em", color: v4Colors.text }}>
            Ciwi <span style={{ color: "#8a8a94", fontWeight: 600 }}>Localize</span>
          </div>
          <div style={{ fontSize: 11.5, color: v4Colors.textFaint, fontWeight: 500 }}>{shop}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {credits != null ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "7px 12px",
              borderRadius: 10,
              background: "#fff",
              border: `1px solid ${v4Colors.cardBorder}`,
              fontSize: 12.5,
              fontWeight: 600,
              color: v4Colors.text,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: v4Colors.success,
                boxShadow: "0 0 0 3px rgba(31,157,107,0.16)",
              }}
            />
            {formatCredits(credits)} 积分可用
          </span>
        ) : null}
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: v4Colors.primarySoft,
            color: v4Colors.primary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          {avatarLetter}
        </div>
      </div>
    </header>
  );
}

export function coverageBarColor(percent: number | null): string {
  if (percent == null) return v4Colors.textMuted;
  if (percent >= 100) return v4Colors.successSoft;
  if (percent >= 60) return "#8b7cf8";
  return v4Colors.warning;
}

export const segmentBarStyle = (filled: boolean, color: string): CSSProperties => ({
  flex: 1,
  height: 6,
  borderRadius: 3,
  background: filled ? color : "#e2e8f0",
  transition: "background 0.2s",
});
