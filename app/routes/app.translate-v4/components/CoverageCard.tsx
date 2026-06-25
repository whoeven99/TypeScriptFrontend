import { useEffect, useState } from "react";
import { Button } from "antd";
import type { LocaleCoverageRow } from "~/server/translateV4/coverage.server";
import { v4Colors, v4CardStyle } from "../v4Styles";
import { localeRegionCode, localeShortName } from "../localeDisplay";
import { coverageBarColor } from "./SummaryAndHeader";
import { AutoTranslateBadge } from "./AutoTranslateMarkers";
import { formatNextAutoUpdateDisplay } from "../nextAutoUpdateDisplay";

type Props = {
  locales: LocaleCoverageRow[];
  loading: boolean;
  onRefresh: () => void;
};

export function CoverageCard({ locales, loading, onRefresh }: Props) {
  return (
    <div style={{ ...v4CardStyle, padding: "18px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: v4Colors.text }}>
          语言覆盖率
        </h2>
        <Button size="small" type="text" loading={loading} onClick={onRefresh}>
          刷新统计
        </Button>
      </div>

      <div style={{ marginTop: 16 }}>
        {locales.length === 0 ? (
          <div style={{ fontSize: 13, color: v4Colors.textMuted }}>暂无已发布的目标语言。</div>
        ) : (
          locales.map((row) => (
            <CoverageRow key={row.locale} row={row} />
          ))
        )}
      </div>
    </div>
  );
}

function CoverageRow({ row }: { row: LocaleCoverageRow }) {
  const [, setMinuteTick] = useState(0);

  useEffect(() => {
    if (!row.autoTranslate || !row.nextAutoUpdateAt) return;
    const id = setInterval(() => setMinuteTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, [row.autoTranslate, row.nextAutoUpdateAt]);

  const percent = row.percent;
  const barColor = coverageBarColor(percent);
  const width = percent != null ? `${percent}%` : "0%";
  const label = localeShortName(row.locale, row.label);
  const nextHint = row.autoTranslate
    ? formatNextAutoUpdateDisplay(row.nextAutoUpdateAt)
    : null;

  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
          fontSize: 13,
        }}
      >
        <span style={{ fontWeight: 600, color: v4Colors.text }}>
          <span style={{ color: v4Colors.textMuted, marginRight: 6, fontSize: 11 }}>
            {localeRegionCode(row.locale)}
          </span>
          {label}
          {row.autoTranslate ? (
            <span style={{ marginLeft: 8 }}>
              <AutoTranslateBadge nextUpdateHint={nextHint} />
            </span>
          ) : null}
        </span>
        <span style={{ fontWeight: 700, color: v4Colors.text }}>
          {percent != null ? `${percent}%` : row.cacheMissing ? "—" : "0%"}
        </span>
      </div>
      <div
        style={{
          height: 6,
          borderRadius: 3,
          background: "#e2e8f0",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width,
            background: barColor,
            borderRadius: 3,
            transition: "width 0.3s",
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
