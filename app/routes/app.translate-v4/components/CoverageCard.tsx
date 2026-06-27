import { useEffect, useState } from "react";
import type { LocaleCoverageRow } from "~/server/translateV4/coverage.server";
import { v4Colors, v4CardStyle } from "../v4Styles";
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
  background: #fff; border: 1px solid #e2e8f0;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
  font-size: 10px; font-weight: 500; color: #64748b;
  white-space: nowrap; z-index: 20;
  opacity: 0; visibility: hidden; pointer-events: none;
  transition: opacity 0.12s ease, visibility 0.12s;
}
.v4-auto-badge-wrap:hover .v4-auto-badge-hints,
.v4-auto-badge-wrap:focus-within .v4-auto-badge-hints {
  opacity: 1; visibility: visible;
}
`;

type Props = {
  locales: LocaleCoverageRow[];
  loading: boolean;
  onRefresh: () => void;
};

export function CoverageCard({ locales, loading, onRefresh }: Props) {
  return (
    <div style={{ ...v4CardStyle, padding: "20px", position: "sticky", top: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em", color: v4Colors.text }}>
          语言覆盖率
        </h2>
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
          <div style={{ fontSize: 13, color: v4Colors.textMuted }}>暂无已发布的目标语言。</div>
        ) : (
          locales.map((row) => <CoverageRow key={row.locale} row={row} />)
        )}
      </div>
    </div>
  );
}

function CoverageRow({ row }: { row: LocaleCoverageRow }) {
  const [, setMinuteTick] = useState(0);

  useEffect(() => {
    if (!row.autoTranslate) return;
    const id = setInterval(() => setMinuteTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, [row.autoTranslate, row.lastAutoUpdateAt, row.nextAutoUpdateAt]);

  const percent = row.percent;
  const barColor = coverageBarColor(percent);
  const width = percent != null ? `${percent}%` : "0%";
  const label = localeShortName(row.locale, row.label);
  const lastHint = row.autoTranslate ? formatLastAutoUpdateDisplay(row.lastAutoUpdateAt) : null;
  const nextHint = row.autoTranslate ? formatNextAutoUpdateDisplay(row.nextAutoUpdateAt) : null;

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
      <div style={{ height: 6, borderRadius: 4, background: "#e2e8f0", overflow: "hidden" }}>
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
