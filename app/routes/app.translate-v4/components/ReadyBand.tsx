import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "@remix-run/react";
import { useTranslation } from "react-i18next";
import AppButton from "~/ui/components/AppButton";
import AppStatusBadge from "~/ui/components/AppStatusBadge";
import { v4Colors, v4CardStyle } from "../v4Styles";
import { AutoTranslateBadge } from "./AutoTranslateMarkers";
import type { LocaleCoverageRow } from "~/server/translateV4/coverage.server";
import {
  markReadyBandDismissed,
  readReadyBandDismissed,
} from "~/lib/onboardingProgress";

type Props = {
  shop: string;
  locales: LocaleCoverageRow[];
  /** 落地时的 ?celebrate=locale，用于优先锚定这门语言。 */
  celebrate: string;
  /** 「补齐其它模块」：预填该语言非商品模块并滚到创建任务。 */
  onFillModules: (locale: string) => void;
};

function sameLocale(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * 就绪带：语言毕业（自动更新已开）后在智能翻译首页顶部展示。
 * 双覆盖率：商品（Products）+ 全店（完整缓存时的 storePercent；缺缓存不展示假 100%）。
 * 点 × 永久收起（localStorage）。
 */
export function ReadyBand({ shop, locales, celebrate, onFillModules }: Props) {
  const { t, i18n } = useTranslation();
  const isZh = (i18n.resolvedLanguage || i18n.language || "")
    .toLowerCase()
    .startsWith("zh");

  /** key 未进资源包（HMR 后未整页刷新）时用双语 fallback，避免露出 raw key。 */
  const tr = (
    key: string,
    zhText: string,
    enText: string,
    opts?: Record<string, unknown>,
  ) => {
    const fallback = isZh ? zhText : enText;
    const out = t(key, { ...opts, defaultValue: fallback });
    let text = out === key ? fallback : out;
    if (opts && "percent" in opts) {
      text = text.replace(/\{\{percent\}\}/g, String(opts.percent ?? ""));
    }
    return text;
  };

  const featured = useMemo<LocaleCoverageRow | null>(() => {
    const readyRows = locales.filter((r) => r.autoTranslate);
    if (readyRows.length === 0) return null;
    if (celebrate.trim()) {
      const hit = readyRows.find((r) => sameLocale(r.locale, celebrate));
      if (hit) return hit;
    }
    return readyRows[0];
  }, [locales, celebrate]);

  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    setMounted(true);
    if (featured) {
      setDismissed(readReadyBandDismissed(shop, featured.locale));
    }
  }, [shop, featured]);

  if (!mounted || !featured || dismissed) return null;

  const language = featured.label || featured.locale;
  const productPercent = featured.productPercent;
  const storePercent = featured.storePercent;
  const storeIncomplete = featured.cacheMissing || storePercent == null;
  const needsMoreModules =
    storeIncomplete || (storePercent != null && storePercent < 100);

  const handleDismiss = () => {
    markReadyBandDismissed(shop, featured.locale);
    setDismissed(true);
  };

  return (
    <div
      className="v4-enter"
      style={{
        ...v4CardStyle,
        position: "relative",
        padding: "16px 18px",
        background: "var(--p-color-bg-surface-success)",
        borderColor: "var(--p-color-border-success)",
        boxShadow: "inset 4px 0 0 var(--p-color-text-success)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <button
        type="button"
        aria-label={tr("readyBand.dismiss", "关闭", "Dismiss")}
        onClick={handleDismiss}
        style={{
          position: "absolute",
          top: 10,
          right: 12,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          fontSize: 16,
          lineHeight: 1,
          color: v4Colors.textMuted,
          padding: 4,
        }}
      >
        ×
      </button>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          alignItems: "flex-start",
          justifyContent: "space-between",
          paddingRight: 28,
        }}
      >
        <div
          style={{
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            gap: 4,
            flex: "1 1 220px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 8,
              fontSize: 16,
              fontWeight: 700,
              color: v4Colors.text,
            }}
          >
            <span>🎉 {t("ready.title", { language })}</span>
            <AutoTranslateBadge />
          </div>
          <div
            style={{
              fontSize: 13,
              lineHeight: "20px",
              color: v4Colors.textMuted,
            }}
          >
            {tr(
              "ready.bandSubtitle",
              "自动更新已开 · 新手引导已完成",
              "Auto-update is on · Onboarding complete",
            )}
          </div>
        </div>

        {needsMoreModules ? (
          <AppButton
            type="primary"
            size="small"
            onClick={() => onFillModules(featured.locale)}
          >
            {t("ready.ctaMoreModules")}
          </AppButton>
        ) : null}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 10,
        }}
      >
        <CoverageMetric
          label={tr(
            "ready.productCoverageLabel",
            "商品覆盖率",
            "Product coverage",
          )}
          value={
            productPercent != null
              ? `${productPercent}%`
              : tr("ready.coverageUnavailable", "暂无数据", "No data yet")
          }
          hint={tr(
            "ready.productCoverageHint",
            "商品起步包口径（Products）",
            "Product starter pack (Products)",
          )}
          tone={
            productPercent != null && productPercent >= 100
              ? "success"
              : productPercent == null
                ? "neutral"
                : "info"
          }
        />
        <CoverageMetric
          label={tr(
            "ready.storeCoverageLabel",
            "全店覆盖率",
            "Store-wide coverage",
          )}
          value={
            storeIncomplete
              ? tr(
                  "ready.storeCoverageIncomplete",
                  "统计未完整",
                  "Incomplete stats",
                )
              : `${storePercent}%`
          }
          hint={
            storeIncomplete
              ? tr(
                  "ready.storeCoverageIncompleteHint",
                  "页面、系列、主题等尚未计入；点「补齐其它模块」继续",
                  "Pages, collections, theme not counted yet — translate more modules",
                )
              : storePercent != null && storePercent >= 100
                ? tr(
                    "ready.storeCoverageCompleteHint",
                    "本语言全模块统计已满",
                    "Store-wide coverage is complete",
                  )
                : tr(
                    "ready.storeCoverageHint",
                    "本语言全模块 {{percent}}%，可继续补齐",
                    "{{percent}}% across all modules — you can fill the rest",
                    { percent: storePercent ?? 0 },
                  )
          }
          tone={
            storeIncomplete
              ? "caution"
              : storePercent != null && storePercent >= 100
                ? "success"
                : "info"
          }
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 10,
          paddingTop: 4,
          borderTop: "1px solid var(--app-color-border-secondary)",
        }}
      >
        <NextStepCard
          badge={t("ready.nextModulesBadge")}
          title={t("ready.nextModulesTitle")}
          body={t("ready.nextModulesBody", { language })}
          actionLabel={t("ready.ctaMoreModules")}
          onAction={() => onFillModules(featured.locale)}
        />
        <NextStepCard
          badge={t("ready.nextLocaleBadge")}
          title={t("ready.nextLocaleTitle")}
          body={t("ready.nextLocaleBody")}
          linkTo="/app/language"
          actionLabel={t("ready.nextLocaleCta")}
        />
        <NextStepCard
          badge={t("ready.nextAdvancedBadge")}
          title={t("ready.nextAdvancedTitle")}
          body={t("ready.nextAdvancedBody")}
          actionSlot={
            <>
              <NextLink to="/app/glossary" label={t("ready.nextGlossaryCta")} />
              <NextSep />
              <NextLink to="/app/switcher" label={t("ready.nextSwitcherCta")} />
              <NextSep />
              <NextLink to="/app/currency" label={t("ready.nextCurrencyCta")} />
            </>
          }
        />
      </div>
    </div>
  );
}

function CoverageMetric({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone: "success" | "info" | "caution" | "neutral";
}) {
  return (
    <div
      style={{
        borderRadius: 10,
        border: "1px solid var(--app-color-border-secondary)",
        background: "var(--p-color-bg-surface)",
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        minHeight: 88,
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: v4Colors.textMuted,
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <AppStatusBadge tone={tone}>{value}</AppStatusBadge>
      </div>
      <div
        style={{
          fontSize: 12,
          lineHeight: "18px",
          color: v4Colors.textMuted,
        }}
      >
        {hint}
      </div>
    </div>
  );
}

function NextStepCard({
  badge,
  title,
  body,
  actionLabel,
  linkTo,
  onAction,
  actionSlot,
}: {
  badge: string;
  title: string;
  body: string;
  actionLabel?: string;
  linkTo?: string;
  onAction?: () => void;
  actionSlot?: ReactNode;
}) {
  return (
    <div
      style={{
        borderRadius: 10,
        border: "1px solid var(--app-color-border-secondary)",
        background: "rgba(255, 255, 255, 0.7)",
        padding: "12px 14px",
        minHeight: 122,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div
        style={{
          fontSize: 11,
          lineHeight: "16px",
          fontWeight: 700,
          color: v4Colors.textMuted,
        }}
      >
        {badge}
      </div>
      <div
        style={{
          fontSize: 14,
          lineHeight: "20px",
          fontWeight: 700,
          color: v4Colors.text,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 12,
          lineHeight: "18px",
          color: v4Colors.textMuted,
          flex: 1,
        }}
      >
        {body}
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "4px 0",
          fontSize: 12,
        }}
      >
        {actionSlot ??
          (linkTo ? (
            <NextLink to={linkTo} label={actionLabel ?? ""} />
          ) : (
            <button
              type="button"
              onClick={onAction}
              style={{
                border: "none",
                background: "transparent",
                padding: 0,
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 700,
                color: "var(--p-color-text-link)",
              }}
            >
              {actionLabel}
            </button>
          ))}
      </div>
    </div>
  );
}

function NextLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      style={{
        fontSize: 12,
        fontWeight: 700,
        color: "var(--p-color-text-link)",
        textDecoration: "none",
      }}
    >
      {label}
    </Link>
  );
}

function NextSep() {
  return (
    <span
      aria-hidden
      style={{
        margin: "0 8px",
        color: "var(--app-color-border-secondary)",
      }}
    >
      ·
    </span>
  );
}
