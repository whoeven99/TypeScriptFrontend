import type { CSSProperties } from "react";
import { v4Colors } from "../v4Styles";
import { formatCredits } from "../localeDisplay";
import type { CoverageSummary } from "~/server/translateV4/coverage.server";

type Props = {
  summary: CoverageSummary;
  compact?: boolean;
};

/** 左侧摘要卡固定宽度与高度，不随右侧表单展开而拉伸。 */
const SUMMARY_CARD_WIDTH = 296;
const SUMMARY_RING_SIZE = 148;
const SUMMARY_CARD_COMPACT_HEIGHT = 148;
const SUMMARY_RING_SIZE_COMPACT = 92;

export function SummaryDonutCard({ summary, compact = false }: Props) {
  const percent = summary.overallPercent ?? 0;
  const dash = `${percent} 100`;

  if (compact) {
    return (
      <div
        style={{
          background: v4Colors.summaryBg,
          borderRadius: 8,
          padding: "16px 18px",
          color: v4Colors.text,
          width: SUMMARY_CARD_WIDTH,
          minWidth: SUMMARY_CARD_WIDTH,
          height: SUMMARY_CARD_COMPACT_HEIGHT,
          boxSizing: "border-box",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 16,
          border: `1px solid ${v4Colors.cardBorder}`,
          boxShadow: "0 4px 14px rgba(22, 119, 255, 0.06)",
        }}
      >
        <div
          style={{
            position: "relative",
            width: SUMMARY_RING_SIZE_COMPACT,
            height: SUMMARY_RING_SIZE_COMPACT,
            flexShrink: 0,
          }}
        >
          <svg
            viewBox="0 0 36 36"
            style={{
              width: SUMMARY_RING_SIZE_COMPACT,
              height: SUMMARY_RING_SIZE_COMPACT,
              transform: "rotate(-90deg)",
            }}
          >
            <circle
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              stroke={v4Colors.ringTrack}
              strokeWidth="3"
            />
            <circle
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              stroke={v4Colors.primary}
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
            <span
              style={{
                fontFamily: v4Colors.mono,
                fontSize: 22,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                lineHeight: 1,
                color: v4Colors.text,
              }}
            >
              {summary.overallPercent != null ? `${summary.overallPercent}%` : "—"}
            </span>
            <span
              style={{
                fontSize: 10,
                color: v4Colors.primaryHover ?? v4Colors.primary,
                marginTop: 4,
                fontWeight: 600,
              }}
            >
              已翻译
            </span>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            minWidth: 0,
            alignSelf: "stretch",
            flex: 1,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: "-0.01em",
                color: v4Colors.text,
              }}
            >
              站点翻译状态
            </div>
            <div
              style={{
                fontSize: 13,
                color: v4Colors.textMuted,
                marginTop: 4,
                lineHeight: "20px",
              }}
            >
              当前店铺多语言翻译完成情况
            </div>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              borderTop: `1px solid ${v4Colors.divider}`,
              paddingTop: 12,
            }}
          >
            <StatFoot label="语言" value={`${summary.languageCount}`} unit="语言" />
            <StatFoot
              label="已译条目"
              value={formatLargeCount(summary.translatedItems)}
              unit="已译条目"
              align="right"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: v4Colors.summaryBg,
        borderRadius: 8,
        padding: "16px",
        color: v4Colors.text,
        display: "flex",
        flexDirection: "column",
        width: SUMMARY_CARD_WIDTH,
        minWidth: SUMMARY_CARD_WIDTH,
        boxSizing: "border-box",
        flexShrink: 0,
        border: `1px solid ${v4Colors.cardBorder}`,
        boxShadow: "0 4px 14px rgba(22, 119, 255, 0.06)",
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
            <circle cx="18" cy="18" r="15.5" fill="none" stroke={v4Colors.ringTrack} strokeWidth="3" />
            <circle
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              stroke={v4Colors.primary}
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
            <span style={{ fontFamily: v4Colors.mono, fontSize: 30, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1, color: v4Colors.text }}>
              {summary.overallPercent != null ? `${summary.overallPercent}%` : "—"}
            </span>
            <span style={{ fontSize: 11, color: v4Colors.primaryHover ?? v4Colors.primary, marginTop: 4, fontWeight: 600 }}>已翻译</span>
          </div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          borderTop: `1px solid ${v4Colors.divider}`,
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
      <div style={{ fontFamily: v4Colors.mono, fontSize: 18, fontWeight: 600, lineHeight: 1.1, color: v4Colors.text }}>{value}</div>
      <div style={{ fontSize: 11, color: v4Colors.textMuted, fontWeight: 600, marginTop: 3 }}>{unit}</div>
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
            borderRadius: 8,
            background: v4Colors.primarySoft,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `1px solid ${v4Colors.cardBorder}`,
          }}
        >
          <div
            style={{
              width: 15,
              height: 15,
              border: `2.5px solid ${v4Colors.primary}`,
              borderRadius: "50%",
              borderRightColor: "transparent",
              transform: "rotate(-30deg)",
            }}
          />
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em", color: v4Colors.text }}>
            Ciwi <span style={{ color: v4Colors.textMuted, fontWeight: 600 }}>Localize</span>
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
              borderRadius: 999,
              background: v4Colors.cardBg,
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
            background: v4Colors.cardSelected,
            color: v4Colors.primary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 13,
            border: `1px solid ${v4Colors.cardBorder}`,
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
  if (percent >= 100) return v4Colors.success;
  if (percent >= 60) return v4Colors.primary;
  return v4Colors.warning;
}

export const segmentBarStyle = (filled: boolean, color: string): CSSProperties => ({
  flex: 1,
  height: 6,
  borderRadius: 3,
  background: filled ? color : v4Colors.progressTrack,
  transition: "background 0.2s",
});
