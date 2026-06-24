import type { CSSProperties } from "react";
import { v4Colors } from "../v4Styles";
import { formatCredits } from "../localeDisplay";
import type { CoverageSummary } from "~/server/translateV4/coverage.server";

type Props = {
  summary: CoverageSummary;
};

/** 固定正方形尺寸，不随右侧创建任务卡高度拉伸。 */
const SUMMARY_CARD_SIZE = 296;
const SUMMARY_RING_SIZE = 144;

export function SummaryDonutCard({ summary }: Props) {
  const percent = summary.overallPercent ?? 0;
  const dash = `${percent} 100`;

  return (
    <div
      style={{
        background: v4Colors.summaryBg,
        borderRadius: 20,
        padding: "20px 24px 18px",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        width: SUMMARY_CARD_SIZE,
        height: SUMMARY_CARD_SIZE,
        minWidth: SUMMARY_CARD_SIZE,
        minHeight: SUMMARY_CARD_SIZE,
        maxWidth: SUMMARY_CARD_SIZE,
        maxHeight: SUMMARY_CARD_SIZE,
        boxSizing: "border-box",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 0,
        }}
      >
        <div
          style={{
            position: "relative",
            width: SUMMARY_RING_SIZE,
            height: SUMMARY_RING_SIZE,
          }}
        >
          <svg
            viewBox="0 0 36 36"
            style={{
              width: SUMMARY_RING_SIZE,
              height: SUMMARY_RING_SIZE,
              transform: "rotate(-90deg)",
            }}
          >
            <circle
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="3"
            />
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
            <span style={{ fontSize: 44, fontWeight: 700, lineHeight: 1 }}>
              {summary.overallPercent != null ? `${summary.overallPercent}%` : "—"}
            </span>
            <span style={{ fontSize: 22, color: v4Colors.textLight, marginTop: 4 }}>已翻译</span>
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
        <StatFoot label="语言" value={`${summary.languageCount} 语言`} />
        <StatFoot
          label="已译条目"
          value={`${formatLargeCount(summary.translatedItems)} 已译条目`}
          align="right"
        />
      </div>
    </div>
  );
}

function StatFoot({
  label,
  value,
  align = "left",
}: {
  label: string;
  value: string;
  align?: "left" | "right";
}) {
  return (
    <div style={{ textAlign: align, minWidth: 0 }}>
      <div style={{ fontSize: 20, color: v4Colors.textLight }}>{label}</div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 600,
          marginTop: 2,
          lineHeight: 1.25,
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function formatLargeCount(n: number): string {
  if (n >= 10_000) return n.toLocaleString();
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
        marginBottom: 20,
        gap: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: v4Colors.primary,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 18,
          }}
        >
          C
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: v4Colors.text }}>Ciwi Localize</div>
          <div style={{ fontSize: 13, color: v4Colors.textMuted }}>{shop}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {credits != null ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 14px",
              borderRadius: 999,
              background: "#fff",
              border: `1px solid ${v4Colors.cardBorder}`,
              fontSize: 13,
              fontWeight: 600,
              color: v4Colors.text,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: v4Colors.successSoft,
                boxShadow: `0 0 0 3px rgba(34, 197, 94, 0.2)`,
              }}
            />
            {formatCredits(credits)} 积分可用
          </span>
        ) : null}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: v4Colors.primarySoft,
            color: v4Colors.primary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
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
