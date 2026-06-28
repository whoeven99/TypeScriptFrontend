import type { CSSProperties } from "react";
import { Button } from "antd";
import { v4Colors } from "../v4Styles";
import { formatCredits } from "../localeDisplay";
import type { CoverageSummary } from "~/server/translateV4/coverage.server";

type Props = {
  summary: CoverageSummary;
  compact?: boolean;
  activeJobsCount?: number;
  queueCount?: number;
  onCreateTask?: () => void;
  onViewTasks?: () => void;
};

/** 左侧摘要卡固定宽度与高度，不随右侧表单展开而拉伸。 */
const SUMMARY_CARD_WIDTH = 296;
const SUMMARY_RING_SIZE = 148;
const SUMMARY_CARD_COMPACT_HEIGHT = 148;
const SUMMARY_RING_SIZE_COMPACT = 92;

export function SummaryDonutCard({
  summary,
  compact = false,
  activeJobsCount = 0,
  queueCount = 0,
  onCreateTask,
  onViewTasks,
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
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                marginTop: 14,
              }}
            >
              <StatusPill label={`${translatedLanguageCount}/${summary.languageCount} 种语言已覆盖`} tone="info" />
              <StatusPill
                label={
                  activeJobsCount > 0
                    ? `${activeJobsCount} 个任务进行中`
                    : queueCount > 0
                      ? `${queueCount} 个任务等待中`
                      : "当前没有进行中的任务"
                }
                tone={activeJobsCount > 0 || queueCount > 0 ? "success" : "neutral"}
              />
            </div>
          </div>
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginTop: 18,
            }}
          >
            <Button type="primary" onClick={onCreateTask}>
              新建翻译任务
            </Button>
            <Button onClick={onViewTasks}>
              查看任务列表
            </Button>
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

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "info" | "success" | "neutral";
}) {
  const toneStyle =
    tone === "success"
      ? { background: v4Colors.successBg, color: v4Colors.success, borderColor: "#d9f7be" }
      : tone === "neutral"
        ? { background: v4Colors.cardBg, color: v4Colors.textMuted, borderColor: v4Colors.cardBorder }
        : { background: v4Colors.primarySoft, color: v4Colors.primary, borderColor: "#bae0ff" };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "5px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        border: `1px solid ${toneStyle.borderColor}`,
        background: toneStyle.background,
        color: toneStyle.color,
      }}
    >
      {label}
    </span>
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
