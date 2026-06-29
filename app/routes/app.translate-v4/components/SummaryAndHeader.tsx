import type { CSSProperties } from "react";
import { v4Colors, V4_OVERVIEW_CARD_MIN_HEIGHT } from "../v4Styles";
import { formatCredits } from "../localeDisplay";
import type { CoverageSummary } from "~/server/translateV4/coverage.server";
import AppPageHeader from "~/ui/components/AppPageHeader";
import AppStatusBadge from "~/ui/components/AppStatusBadge";
import { useCountUp } from "../hooks/useCountUp";

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
  const translatedLanguageCount = summary.locales.filter((row) => (row.percent ?? 0) > 0).length;
  const pendingItems = Math.max(summary.totalItems - summary.translatedItems, 0);

  // 数字滚动动画（挂载时从 0 滚到目标值，刷新统计后重新滚动）
  const animatedPercent = useCountUp(percent);
  const animatedTranslatedLang = useCountUp(translatedLanguageCount);
  const animatedTranslatedItems = useCountUp(summary.translatedItems);
  const animatedPendingItems = useCountUp(pendingItems);
  const dash = `${animatedPercent} 100`;

  if (compact) {
    return (
      <div
        className="v4-enter v4-enter-d1 v4-lift"
        style={{
          background: v4Colors.summaryBg,
          borderRadius: 18,
          padding: "20px 22px",
          color: v4Colors.text,
          width: "100%",
          height: "100%",
          minWidth: 0,
          minHeight: V4_OVERVIEW_CARD_MIN_HEIGHT,
          boxSizing: "border-box",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "stretch",
          flexWrap: "wrap",
          gap: 24,
          border: `1px solid ${v4Colors.cardBorder}`,
          boxShadow: "var(--app-shadow-card-strong)",
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
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: v4Colors.text,
              }}
            >
              站点翻译状态
            </div>
            <div
              style={{
                fontSize: 13,
                color: v4Colors.textMuted,
                marginTop: 6,
                lineHeight: "20px",
                fontWeight: 400,
              }}
            >
              {summary.languageCount} 种目标语言中，已有 {translatedLanguageCount} 种包含翻译内容
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
            <StatFoot label="翻译进度" value={`${animatedPercent}%`} unit="整体完成率" />
            <StatFoot label="已有内容语言" value={`${animatedTranslatedLang}`} unit={`共 ${summary.languageCount} 种`} />
            <StatFoot label="已译条目" value={formatLargeCount(animatedTranslatedItems)} unit="已完成" />
            <StatFoot label="待翻译条目" value={formatLargeCount(animatedPendingItems)} unit="待处理" />
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
                  fontSize: 28,
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                  lineHeight: 1,
                  color: v4Colors.text,
                }}
              >
                {summary.overallPercent != null ? `${animatedPercent}%` : "—"}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: v4Colors.textMuted,
                  marginTop: 6,
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                }}
              >
                整体覆盖率
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
        borderRadius: 16,
        padding: "16px",
        color: v4Colors.text,
        display: "flex",
        flexDirection: "column",
        width: SUMMARY_CARD_WIDTH,
        minWidth: SUMMARY_CARD_WIDTH,
        boxSizing: "border-box",
        flexShrink: 0,
        border: `1px solid ${v4Colors.cardBorder}`,
        boxShadow: "var(--app-shadow-card-strong)",
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
            <span style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1, color: v4Colors.text }}>
              {summary.overallPercent != null ? `${animatedPercent}%` : "—"}
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
      <div style={{ fontSize: 11, color: v4Colors.textMuted, fontWeight: 500, marginBottom: 6, letterSpacing: "-0.01em" }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 24,
          fontWeight: 700,
          lineHeight: 1.1,
          letterSpacing: "-0.03em",
          color: v4Colors.text,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 11, color: v4Colors.textMuted, fontWeight: 500, marginTop: 4, letterSpacing: "-0.01em" }}>
        {unit}
      </div>
    </div>
  );
}

function formatLargeCount(n: number): string {
  return n.toLocaleString();
}

export function PageHeaderBar({
  credits,
  planType,
}: {
  credits: number | null;
  planType: string | null;
}) {
  const planLabel = formatPlanType(planType);

  return (
    <AppPageHeader
      style={{ marginBottom: 18 }}
      title="智能翻译"
      extra={
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          <AppStatusBadge tone="info">{planLabel}</AppStatusBadge>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              borderRadius: 999,
              background: v4Colors.cardBg,
              border: `1px solid ${v4Colors.cardBorder}`,
              color: v4Colors.textMuted,
            }}
          >
            <span style={{ fontSize: 12, color: v4Colors.textMuted }}>可用积分</span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: v4Colors.success,
                letterSpacing: "-0.01em",
              }}
            >
              {credits != null ? `${formatCredits(credits)}` : "—"}
            </span>
          </div>
        </div>
      }
    />
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
