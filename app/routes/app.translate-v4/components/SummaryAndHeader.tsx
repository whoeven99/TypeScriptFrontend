import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { v4Colors } from "../v4Styles";
import { formatCredits } from "../localeDisplay";
import type { CoverageSummary } from "~/server/translateV4/coverage.server";
import AppPageHeader from "~/ui/components/AppPageHeader";
import AppStatusBadge from "~/ui/components/AppStatusBadge";
import { formatV4PlanType } from "../v4I18n";

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
  const { t } = useTranslation();
  const percent = summary.overallPercent ?? 0;
  const dash = `${percent} 100`;
  const translatedLanguageCount = summary.locales.filter((row) => (row.percent ?? 0) > 0).length;
  const pendingItems = Math.max(summary.totalItems - summary.translatedItems, 0);

  if (compact) {
    return (
      <div
        style={{
          background: v4Colors.summaryBg,
          borderRadius: 18,
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
                fontWeight: 600,
                letterSpacing: "-0.01em",
                color: v4Colors.text,
              }}
            >
              {t("v4.siteTranslationStatus")}
            </div>
            <div
              style={{
                fontSize: 13,
                color: v4Colors.textMuted,
                marginTop: 6,
                lineHeight: "20px",
              }}
            >
              {t("v4.targetLanguagesSummary", {
                total: summary.languageCount,
                translated: translatedLanguageCount,
              })}
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
            <StatFoot label={t("v4.translationProgress")} value={`${summary.overallPercent ?? 0}%`} unit={t("v4.overallCompletion")} />
            <StatFoot label={t("v4.languagesWithContent")} value={`${translatedLanguageCount}`} unit={t("v4.outOfLanguages", { count: summary.languageCount })} />
            <StatFoot label={t("v4.translatedItems")} value={formatLargeCount(summary.translatedItems)} unit={t("v4.done")} />
            <StatFoot label={t("v4.pendingItems")} value={formatLargeCount(pendingItems)} unit={t("v4.pending")} />
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
                  fontSize: 26,
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
                  color: v4Colors.textMuted,
                  marginTop: 6,
                  fontWeight: 600,
                }}
              >
                {t("v4.overallCoverage")}
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
            <span style={{ fontFamily: v4Colors.mono, fontSize: 30, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1, color: v4Colors.text }}>
              {summary.overallPercent != null ? `${summary.overallPercent}%` : "—"}
            </span>
            <span style={{ fontSize: 11, color: v4Colors.primaryHover ?? v4Colors.primary, marginTop: 4, fontWeight: 600 }}>{t("v4.translated")}</span>
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
        <StatFoot label={t("v4.languages")} value={`${summary.languageCount}`} unit={t("v4.languages")} />
        <StatFoot label={t("v4.translatedItems")} value={formatLargeCount(summary.translatedItems)} unit={t("v4.translatedItems")} align="right" />
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
  credits,
  planType,
}: {
  credits: number | null;
  planType: string | null;
}) {
  const { t } = useTranslation();
  const planLabel = formatV4PlanType(planType, t);

  return (
    <AppPageHeader
      style={{ marginBottom: 18 }}
      title={t("v4.title")}
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
            <span style={{ fontSize: 12, color: v4Colors.textMuted }}>{t("v4.availableCredits")}</span>
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
