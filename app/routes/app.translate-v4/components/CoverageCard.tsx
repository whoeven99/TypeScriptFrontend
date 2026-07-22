import { useEffect, useMemo, useState } from "react";
import { Button } from "antd";
import { useTranslation } from "react-i18next";
import type { LocaleCoverageRow } from "~/server/translateV4/coverage.server";
import { v4Colors, v4CardStyle, V4_OVERVIEW_CARD_MIN_HEIGHT } from "../v4Styles";
import { localeRegionCode, localeShortName } from "../localeDisplay";
import { coverageBarColor } from "./SummaryAndHeader";
import { AutoTranslateBadge } from "./AutoTranslateMarkers";
import {
  formatV4LastAutoUpdateDisplay,
  formatV4NextAutoUpdateDisplay,
} from "../v4I18n";

const AUTO_BADGE_HOVER_CSS = `
.v4-auto-badge-wrap { position: relative; display: inline-flex; vertical-align: middle; cursor: default; }
.v4-auto-badge-hints {
  position: absolute; left: 0; top: calc(100% + 4px);
  display: flex; flex-direction: column; gap: 2px;
  padding: 6px 8px; border-radius: 6px;
  background: var(--p-color-bg-surface); border: 1px solid var(--p-color-border-secondary);
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
  font-size: 10px; font-weight: 500; color: var(--p-color-text-secondary);
  max-width: min(240px, calc(100vw - 48px));
  white-space: normal; overflow-wrap: anywhere; z-index: 20;
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
  /** 行内「补齐」：预填创建任务（与 ReadyBand 同源） */
  onFillModules?: (locale: string) => void;
};

function needsFillGuide(row: LocaleCoverageRow): boolean {
  if (!row.autoTranslate) return false;
  if (row.cacheMissing || row.storePercent == null) return true;
  return row.storePercent < 100;
}

export function CoverageCard({
  locales,
  loading,
  onRefresh,
  compact = false,
  onManageLanguages,
  onExpandedChange,
  fillPairHeight = false,
  onFillModules,
}: Props) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const displayLocales = useMemo(
    () =>
      sortCoverageRows(
        locales.filter((row) => !isCoverageUnscanned(row)),
      ),
    [locales],
  );
  const unscannedCount = locales.length - displayLocales.length;
  const lowestPublished = useMemo(
    () => findLowestPublishedCoverage(displayLocales),
    [displayLocales],
  );

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
    () =>
      displayLocales.filter((row) => (row.percent ?? 0) < 100)
        .length,
    [displayLocales],
  );

  if (compact) {
    const hasMore = displayLocales.length > COVERAGE_PREVIEW_COUNT;
    const visibleLocales = expanded
      ? displayLocales
      : displayLocales.slice(0, COVERAGE_PREVIEW_COUNT);

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
            alignItems: "flex-start",
            gap: 12,
            flexWrap: "wrap",
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
              {t("v4.coverage.title")}
            </h2>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "stretch", flexShrink: 0, flexWrap: "wrap", maxWidth: "100%" }}>
            <Button
              size="small"
              onClick={onManageLanguages}
              style={{ maxWidth: "100%", height: "auto", whiteSpace: "normal", lineHeight: 1.35 }}
            >
              {t("v4.coverage.manageLanguages")}
            </Button>
            <Button
              size="small"
              onClick={onRefresh}
              loading={loading}
              style={{ maxWidth: "100%", height: "auto", whiteSpace: "normal", lineHeight: 1.35 }}
            >
              {loading ? t("v4.coverage.refreshing") : t("v4.coverage.refreshStats")}
            </Button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "14px 0 12px" }}>
          <HeadMetric label={t("v4.coverage.targetLanguages")} value={`${locales.length}`} />
          <HeadMetric label={t("v4.coverage.autoTranslate")} value={`${autoTranslateCount}`} />
          <HeadMetric label={t("v4.coverage.needsImprovement")} value={`${lowCoverageCount}`} />
        </div>
        <LowestPublishedHint row={lowestPublished} />

        <style>{AUTO_BADGE_HOVER_CSS}</style>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {locales.length === 0 ? (
            <div style={{ fontSize: 13, color: v4Colors.textMuted }}>
              {t("v4.coverage.noTargetLanguages")}
            </div>
          ) : (
            visibleLocales.map((row) => (
              <CompactCoverageRow
                key={row.locale}
                row={row}
                onFill={
                  onFillModules && needsFillGuide(row)
                    ? () => onFillModules(row.locale)
                    : undefined
                }
              />
            ))
          )}
          {unscannedCount > 0 ? <UnscannedCoverageSummary count={unscannedCount} /> : null}
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
              whiteSpace: "normal",
              textAlign: "left",
              lineHeight: 1.35,
            }}
          >
            {expanded
              ? t("v4.tasks.collapse")
              : t("v4.coverage.viewAll", { count: displayLocales.length })}
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em", color: v4Colors.text }}>
            {t("v4.coverage.title")}
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
            whiteSpace: "normal",
            textAlign: "right",
            lineHeight: 1.35,
          }}
        >
          {loading ? t("v4.coverage.refreshing") : t("v4.coverage.refreshStats")}
        </button>
      </div>

      <style>{AUTO_BADGE_HOVER_CSS}</style>
      <LowestPublishedHint row={lowestPublished} compact={false} />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {locales.length === 0 ? (
          <div style={{ fontSize: 13, color: v4Colors.textMuted }}>{t("v4.coverage.noTargetLanguages")}</div>
        ) : (
          displayLocales.map((row) => (
            <CoverageRow
              key={row.locale}
              row={row}
              onFill={
                onFillModules && needsFillGuide(row)
                  ? () => onFillModules(row.locale)
                  : undefined
              }
            />
          ))
        )}
        {unscannedCount > 0 ? <UnscannedCoverageSummary count={unscannedCount} /> : null}
      </div>
    </div>
  );
}

function HeadMetric({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        minWidth: 92,
        flex: "1 1 110px",
        padding: "8px 10px",
        borderRadius: 10,
        background: v4Colors.cardSubdued,
        border: `1px solid ${v4Colors.cardBorder}`,
      }}
    >
      <div style={{ fontSize: 11, color: v4Colors.textMuted, fontWeight: 600, lineHeight: 1.35, overflowWrap: "anywhere" }}>
        {label}
      </div>
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

function isCoverageUnscanned(row: LocaleCoverageRow): boolean {
  return row.cacheMissing && row.total === 0;
}

function coverageSortPercent(row: LocaleCoverageRow): number {
  if (isCoverageUnscanned(row)) return 101;
  return row.percent ?? 101;
}

function sortCoverageRows(rows: LocaleCoverageRow[]): LocaleCoverageRow[] {
  return [...rows].sort((a, b) => {
    if (a.published !== b.published) return a.published ? -1 : 1;

    const percentDiff = coverageSortPercent(a) - coverageSortPercent(b);
    if (percentDiff !== 0) return percentDiff;

    if (a.autoTranslate !== b.autoTranslate) return a.autoTranslate ? -1 : 1;

    const aLabel = localeShortName(a.locale, a.label);
    const bLabel = localeShortName(b.locale, b.label);
    return aLabel.localeCompare(bLabel);
  });
}

function findLowestPublishedCoverage(
  rows: LocaleCoverageRow[],
): LocaleCoverageRow | null {
  return (
    rows.find(
      (row) =>
        row.published &&
        !isCoverageUnscanned(row) &&
        row.percent != null,
    ) ?? null
  );
}

function LowestPublishedHint({
  row,
  compact = true,
}: {
  row: LocaleCoverageRow | null;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  if (!row) return null;

  const label = localeShortName(row.locale, row.label);
  const percent = row.percent ?? 0;
  const complete = percent >= 100;

  return (
    <div
      style={{
        margin: compact ? "-2px 0 12px" : "0 0 14px",
        padding: "8px 10px",
        borderRadius: 10,
        border: `1px solid ${
          complete ? "rgba(20, 163, 127, 0.22)" : "rgba(245, 158, 11, 0.28)"
        }`,
        background: complete
          ? "rgba(236, 253, 245, 0.68)"
          : "rgba(255, 247, 230, 0.72)",
        fontSize: 12,
        lineHeight: "18px",
        color: complete ? "var(--p-color-text-success)" : "var(--p-color-text-caution)",
        fontWeight: 600,
      }}
    >
      {complete
        ? t("v4.coverage.publishedAllComplete")
        : t("v4.coverage.lowestPublishedHint", {
            language: label,
            percent,
          })}
    </div>
  );
}

function UnscannedCoverageSummary({ count }: { count: number }) {
  const { t } = useTranslation();

  return (
    <div
      style={{
        fontSize: 11.5,
        color: v4Colors.textMuted,
        lineHeight: 1.4,
      }}
    >
      {t("v4.coverage.unscannedSummary", { count })}
    </div>
  );
}

function CompactCoverageRow({
  row,
  onFill,
}: {
  row: LocaleCoverageRow;
  onFill?: () => void;
}) {
  const { t } = useTranslation();
  const percent = row.percent;
  const unscanned = isCoverageUnscanned(row);
  const displayPercent = percent ?? 0;
  const barColor = coverageBarColor(percent);
  const width = `${displayPercent}%`;
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
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
          }}
        >
          {onFill ? (
            <button
              type="button"
              onClick={onFill}
              style={{
                border: "none",
                background: "transparent",
                padding: 0,
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 600,
                color: v4Colors.primary,
                fontFamily: "inherit",
              }}
            >
              {t("v4.coverage.fillModules")}
            </button>
          ) : null}
          <span
            style={{
              fontFamily: unscanned ? "inherit" : v4Colors.mono,
              fontWeight: unscanned ? 600 : 700,
              fontSize: 11.5,
              color: unscanned ? v4Colors.textMuted : v4Colors.text,
            }}
          >
            {unscanned ? t("v4.coverage.notScanned") : `${displayPercent}%`}
          </span>
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

function CoverageRow({
  row,
  onFill,
}: {
  row: LocaleCoverageRow;
  onFill?: () => void;
}) {
  const { t } = useTranslation();
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    if (!row.autoTranslate) return;
    setNowMs(Date.now());
    const id = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [row.autoTranslate, row.lastAutoUpdateAt, row.nextAutoUpdateAt]);

  const percent = row.percent;
  const unscanned = isCoverageUnscanned(row);
  const displayPercent = percent ?? 0;
  const barColor = coverageBarColor(percent);
  const width = `${displayPercent}%`;
  const label = localeShortName(row.locale, row.label);
  const lastHint =
    row.autoTranslate && nowMs != null
      ? formatV4LastAutoUpdateDisplay(row.lastAutoUpdateAt, t, nowMs)
      : null;
  const nextHint =
    row.autoTranslate && nowMs != null
      ? formatV4NextAutoUpdateDisplay(row.nextAutoUpdateAt, t, nowMs)
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
        <span style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 600, color: v4Colors.text, minWidth: 0, flexWrap: "wrap" }}>
          <span style={{ flexShrink: 0 }}>
            <span style={{ color: v4Colors.textFaint, marginRight: 6, fontSize: 11 }}>{localeRegionCode(row.locale)}</span>
            {label}
          </span>
          {row.autoTranslate ? (
            <AutoTranslateBadge lastUpdateHint={lastHint} nextUpdateHint={nextHint} />
          ) : null}
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
          }}
        >
          {onFill ? (
            <button
              type="button"
              onClick={onFill}
              style={{
                border: "none",
                background: "transparent",
                padding: 0,
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
                color: v4Colors.primary,
                fontFamily: "inherit",
              }}
            >
              {t("v4.coverage.fillModules")}
            </button>
          ) : null}
          <span
            style={{
              fontFamily: unscanned ? "inherit" : v4Colors.mono,
              fontWeight: unscanned ? 600 : 700,
              fontSize: 12.5,
              color: unscanned ? v4Colors.textMuted : v4Colors.text,
            }}
          >
            {unscanned ? t("v4.coverage.notScanned") : `${displayPercent}%`}
          </span>
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
      {unscanned ? (
        <div style={{ fontSize: 11, color: v4Colors.textMuted, marginTop: 4 }}>
          {t("v4.coverage.cacheNotReady")}
        </div>
      ) : null}
    </div>
  );
}
