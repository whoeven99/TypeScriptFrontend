import { useEffect, useMemo, useState } from "react";
import { Button } from "antd";
import type { LocaleCoverageRow } from "~/server/translateV4/coverage.server";
import { v4Colors, v4CardStyle, V4_OVERVIEW_CARD_MIN_HEIGHT } from "../v4Styles";
import { localeRegionCode, localeShortName } from "../localeDisplay";
import { coverageBarColor } from "./SummaryAndHeader";
import { AutoTranslateBadge } from "./AutoTranslateMarkers";
import { formatLastAutoUpdateDisplay, formatNextAutoUpdateDisplay } from "../nextAutoUpdateDisplay";

const AUTO_BADGE_HOVER_CSS = `
.v4-auto-badge-wrap { position: relative; display: inline-flex; vertical-align: middle; cursor: default; }
.v4-auto-badge-hints {
  position: absolute; left: 0; top: calc(100% + 4px);
  display: flex; flex-direction: column; gap: 2px;
  padding: 6px 8px; border-radius: 6px;
  background: var(--p-color-bg-surface); border: 1px solid var(--p-color-border-secondary);
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
  font-size: 10px; font-weight: 500; color: var(--p-color-text-secondary);
  white-space: nowrap; z-index: 20;
  opacity: 0; visibility: hidden; pointer-events: none;
  transition: opacity 0.12s ease, visibility 0.12s;
}
.v4-auto-badge-wrap:hover .v4-auto-badge-hints,
.v4-auto-badge-wrap:focus-within .v4-auto-badge-hints {
  opacity: 1; visibility: visible;
}
`;

/** 默认仅展示前 N 种语言，保持与左侧摘要卡等高；其余通过「查看全部」展开。 */
const COVERAGE_PREVIEW_COUNT = 3;

type Props = {
  locales: LocaleCoverageRow[];
  loading: boolean;
  onRefresh: () => void;
  compact?: boolean;
  onManageLanguages?: () => void;
  onExpandedChange?: (expanded: boolean) => void;
  /** 与左侧摘要卡同列拉伸等高（默认收起态） */
  fillPairHeight?: boolean;
};

export function CoverageCard({
  locales,
  loading,
  onRefresh,
  compact = false,
  onManageLanguages,
  onExpandedChange,
  fillPairHeight = false,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const toggleExpanded = () => {
    setExpanded((prev) => {
      const next = !prev;
      onExpandedChange?.(next);
      return next;
    });
  };

  const autoTranslateCount = useMemo(
    () => locales.filter((row) => row.autoTranslate).length,
    [locales],
  );
  const lowCoverageCount = useMemo(
    () => locales.filter((row) => (row.percent ?? 0) < 100).length,
    [locales],
  );

  if (compact) {
    const hasMore = locales.length > COVERAGE_PREVIEW_COUNT;
    const visibleLocales = expanded ? locales : locales.slice(0, COVERAGE_PREVIEW_COUNT);

    return (
      <div
        className="v4-enter v4-enter-d2 v4-lift"
        style={{
          ...v4CardStyle,
          width: "100%",
          height: fillPairHeight ? "100%" : undefined,
          minWidth: 0,
          minHeight: V4_OVERVIEW_CARD_MIN_HEIGHT,
          padding: "20px 22px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          borderRadius: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h2
              style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: "-0.01em",
                color: v4Colors.text,
              }}
            >
              语言覆盖率
            </h2>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
            <Button size="small" onClick={onManageLanguages}>
              管理语言
            </Button>
            <Button size="small" onClick={onRefresh} loading={loading}>
              刷新统计
            </Button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "14px 0 12px" }}>
          <HeadMetric label="目标语言" value={`${locales.length}`} />
          <HeadMetric label="自动翻译" value={`${autoTranslateCount}`} />
          <HeadMetric label="待完善" value={`${lowCoverageCount}`} />
        </div>

        <style>{AUTO_BADGE_HOVER_CSS}</style>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {visibleLocales.length === 0 ? (
            <div style={{ fontSize: 13, color: v4Colors.textMuted }}>
              暂无目标语言，请先在语言页添加。
            </div>
          ) : (
            visibleLocales.map((row) => (
              <CompactCoverageRow key={row.locale} row={row} />
            ))
          )}
        </div>

        {hasMore ? (
          <button
            type="button"
            className="v4-press"
            onClick={toggleExpanded}
            style={{
              marginTop: 12,
              alignSelf: "flex-start",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              fontWeight: 600,
              padding: "5px 11px",
              borderRadius: 8,
              background: v4Colors.cardBg,
              border: `1px solid ${v4Colors.cardBorder}`,
              color: v4Colors.primary,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {expanded ? "收起" : `查看全部 ${locales.length} 种`}
            <span className={`v4-caret${expanded ? " v4-caret--open" : ""}`} aria-hidden>
              ⌄
            </span>
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div style={{ ...v4CardStyle, padding: "16px", position: "sticky", top: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em", color: v4Colors.text }}>
            语言覆盖率
          </h2>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          style={{
            background: "none",
            border: "none",
            color: v4Colors.textMuted,
            fontSize: 12.5,
            fontWeight: 600,
            cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.6 : 1,
            fontFamily: "inherit",
            padding: "4px 6px",
          }}
        >
          {loading ? "刷新中…" : "刷新统计"}
        </button>
      </div>

      <style>{AUTO_BADGE_HOVER_CSS}</style>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {locales.length === 0 ? (
          <div style={{ fontSize: 13, color: v4Colors.textMuted }}>暂无目标语言，请先在语言页添加。</div>
        ) : (
          locales.map((row) => <CoverageRow key={row.locale} row={row} />)
        )}
      </div>
    </div>
  );
}

function HeadMetric({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        minWidth: 92,
        padding: "8px 10px",
        borderRadius: 10,
        background: v4Colors.cardSubdued,
        border: `1px solid ${v4Colors.cardBorder}`,
      }}
    >
      <div style={{ fontSize: 11, color: v4Colors.textMuted, fontWeight: 600 }}>{label}</div>
      <div
        style={{
          marginTop: 4,
          fontFamily: v4Colors.mono,
          fontWeight: 700,
          fontSize: 18,
          color: v4Colors.text,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function CompactCoverageRow({ row }: { row: LocaleCoverageRow }) {
  const percent = row.percent;
  const barColor = coverageBarColor(percent);
  const width = percent != null ? `${percent}%` : "0%";
  const label = localeShortName(row.locale, row.label);

  return (
    <div className="v4-row-enter">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          marginBottom: 4,
          fontSize: 12,
          lineHeight: 1.2,
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            minWidth: 0,
            color: v4Colors.text,
            fontWeight: 600,
          }}
        >
          <span
            style={{
              color: v4Colors.textFaint,
              fontSize: 10,
              flexShrink: 0,
            }}
          >
            {localeRegionCode(row.locale)}
          </span>
          <span
            style={{
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </span>
          {row.autoTranslate ? <AutoTranslateBadge lastUpdateHint={null} nextUpdateHint={null} /> : null}
        </span>
        <span
          style={{
            fontFamily: v4Colors.mono,
            fontWeight: 700,
            fontSize: 11.5,
            color: v4Colors.text,
            flexShrink: 0,
          }}
        >
          {percent != null ? `${percent}%` : row.cacheMissing ? "—" : "0%"}
        </span>
      </div>
      <div
        style={{
          height: 5,
          borderRadius: 999,
          background: v4Colors.progressTrack,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width,
            background: barColor,
            borderRadius: 999,
            transition: "width 0.6s ease",
          }}
        />
      </div>
    </div>
  );
}

function CoverageRow({ row }: { row: LocaleCoverageRow }) {
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    if (!row.autoTranslate) return;
    setNowMs(Date.now());
    const id = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [row.autoTranslate, row.lastAutoUpdateAt, row.nextAutoUpdateAt]);

  const percent = row.percent;
  const barColor = coverageBarColor(percent);
  const width = percent != null ? `${percent}%` : "0%";
  const label = localeShortName(row.locale, row.label);
  const lastHint =
    row.autoTranslate && nowMs != null
      ? formatLastAutoUpdateDisplay(row.lastAutoUpdateAt, nowMs)
      : null;
  const nextHint =
    row.autoTranslate && nowMs != null
      ? formatNextAutoUpdateDisplay(row.nextAutoUpdateAt, nowMs)
      : null;

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
          gap: 10,
          fontSize: 13,
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 600, color: v4Colors.text, minWidth: 0 }}>
          <span style={{ flexShrink: 0 }}>
            <span style={{ color: v4Colors.textFaint, marginRight: 6, fontSize: 11 }}>{localeRegionCode(row.locale)}</span>
            {label}
          </span>
          {row.autoTranslate ? (
            <AutoTranslateBadge lastUpdateHint={lastHint} nextUpdateHint={nextHint} />
          ) : null}
        </span>
        <span style={{ fontFamily: v4Colors.mono, fontWeight: 700, fontSize: 12.5, color: v4Colors.text, flexShrink: 0 }}>
          {percent != null ? `${percent}%` : row.cacheMissing ? "—" : "0%"}
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 4, background: v4Colors.progressTrack, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width,
            background: barColor,
            borderRadius: 4,
            transition: "width 0.6s ease",
          }}
        />
      </div>
      {row.cacheMissing && row.total === 0 ? (
        <div style={{ fontSize: 11, color: v4Colors.textMuted, marginTop: 4 }}>
          统计缓存未就绪，点击「刷新统计」从 Shopify 计算
        </div>
      ) : null}
    </div>
  );
}
