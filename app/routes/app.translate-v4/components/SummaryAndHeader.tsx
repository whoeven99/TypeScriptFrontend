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

export function SummaryDonutCard({
  summary,
  compact = false,
}: Props) {
  const percent = summary.overallPercent ?? 0;
  const dash = `${percent} 100`;
  const translatedLanguageCount = summary.locales.filter((row) => (row.percent ?? 0) > 0).length;
  const pendingItems = Math.max(summary.totalItems - summary.translatedItems, 0);

  if (compact) {
    return (
      <div
        style={{
          background: v4Colors.summaryBg,
          borderRadius: 12,
          padding: "20px 22px",
          color: v4Colors.text,
          width: "100%",
          minWidth: 0,
          minHeight: 208,
          boxSizing: "border-box",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "stretch",
          flexWrap: "wrap",
          gap: 24,
          border: `1px solid ${v4Colors.cardBorder}`,
          boxShadow: "0 8px 24px rgba(22, 119, 255, 0.08)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            minWidth: 0,
            flex: 1,
            flexBasis: 320,
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
              整体翻译进度、覆盖语言和当前任务状态
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
              gap: 12,
              borderTop: `1px solid ${v4Colors.divider}`,
              paddingTop: 14,
              marginTop: 18,
            }}
          >
            <StatFoot label="翻译进度" value={`${summary.overallPercent ?? 0}%`} unit="整体完成率" />
            <StatFoot label="覆盖语言" value={`${translatedLanguageCount}`} unit={`共 ${summary.languageCount} 种`} />
            <StatFoot label="已译条目" value={formatLargeCount(summary.translatedItems)} unit="已完成" />
            <StatFoot label="待翻译条目" value={formatLargeCount(pendingItems)} unit="待处理" />
          </div>
        </div>
        <div
          style={{
            width: 148,
            minWidth: 148,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginLeft: "auto",
          }}
        >
          <div
            style={{
              position: "relative",
              width: 132,
              height: 132,
              flexShrink: 0,
            }}
          >
            <svg
              viewBox="0 0 36 36"
              style={{
                width: 132,
                height: 132,
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
                  fontSize: 28,
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  lineHeight: 1,
                  color: v4Colors.text,
                }}
              >
                {summary.overallPercent != null ? `${summary.overallPercent}%` : "—"}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: v4Colors.primaryHover ?? v4Colors.primary,
                  marginTop: 6,
                  fontWeight: 600,
                }}
              >
                已翻译
              </span>
            </div>
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
      <div style={{ fontSize: 11, color: v4Colors.textMuted, fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: v4Colors.mono, fontSize: 20, fontWeight: 700, lineHeight: 1.1, color: v4Colors.text }}>{value}</div>
      <div style={{ fontSize: 11, color: v4Colors.textMuted, fontWeight: 500, marginTop: 4 }}>{unit}</div>
    </div>
  );
}

function formatLargeCount(n: number): string {
  return n.toLocaleString();
}

export function PageHeaderBar({
  shop,
  credits,
  planType,
}: {
  shop: string;
  credits: number | null;
  planType: string | null;
}) {
  const planLabel = formatPlanType(planType);

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 18,
        gap: 14,
        flexWrap: "wrap",
      }}
    >
      <div
        style={{
          minWidth: 0,
          flex: "1 1 240px",
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: v4Colors.text,
            lineHeight: 1.2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {shop}
        </div>
        <div
          style={{
            marginTop: 4,
            fontSize: 12,
            color: v4Colors.textFaint,
            fontWeight: 500,
          }}
        >
          智能翻译工作台
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 0,
          borderRadius: 10,
          overflow: "hidden",
          border: `1px solid ${v4Colors.cardBorder}`,
          background: v4Colors.cardBg,
          minWidth: "min(100%, 300px)",
        }}
      >
        <HeaderMetaItem label="付费计划" value={planLabel} />
        <div style={{ width: 1, background: v4Colors.divider, alignSelf: "stretch" }} />
        <HeaderMetaItem
          label="可用积分"
          value={credits != null ? `${formatCredits(credits)}` : "—"}
          valueColor={v4Colors.success}
        />
      </div>
    </header>
  );
}

function HeaderMetaItem({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div
      style={{
        padding: "8px 14px",
        minWidth: 126,
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, color: v4Colors.textMuted, lineHeight: 1.2 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 13.5,
          fontWeight: 700,
          color: valueColor ?? v4Colors.text,
          letterSpacing: "-0.01em",
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function formatPlanType(planType: string | null): string {
  if (!planType) return "未开通";

  const normalized = planType.trim().toLowerCase();
  if (normalized === "free") return "免费版";
  if (normalized === "basic") return "基础版";
  if (normalized === "pro" || normalized === "professional") return "专业版";
  if (normalized === "enterprise" || normalized === "unlimited") return "企业版";
  return planType;
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
