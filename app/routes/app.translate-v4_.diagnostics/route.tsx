import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { TitleBar } from "@shopify/app-bridge-react";
import { Page } from "@shopify/polaris";
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { useTranslation } from "react-i18next";
import { authenticate } from "~/shopify.server";
import { listV4JobSummaries } from "~/server/translateV4/progress.server";
import type { ShopQuota } from "~/server/translateV4/quota.server";
import { getCoverageSummaryFromCache } from "~/server/translateV4/coverage.server";
import { loadShopLocalesForTranslation } from "~/server/translateV4/shopLocales.server";
import { selectShopTargetLocales } from "~/lib/shopTargetLocales";
import { formatCredits } from "../app.translate-v4/localeDisplay";
import { v4ContentStyle } from "../app.translate-v4/v4Styles";
import {
  loadHomeDiagnostics,
  type HomeLocaleOption,
} from "~/server/translateV4/homeDiagnostics.server";

type HomeIssue = {
  key: string;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: "default" | "success" | "warning" | "critical";
};

const diagnosticCardStyle: CSSProperties = {
  background: "var(--app-color-surface)",
  border: "1px solid var(--app-color-border-secondary)",
  borderRadius: 14,
  boxShadow: "var(--app-shadow-card)",
};

function MetricCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "warning" | "critical";
}) {
  const color =
    tone === "success"
      ? "var(--app-accent-growth)"
      : tone === "warning"
        ? "var(--app-accent-utility)"
        : tone === "critical"
          ? "var(--app-accent-critical)"
          : "var(--app-color-text)";

  return (
    <div style={{ ...diagnosticCardStyle, padding: "14px 16px", minWidth: 0 }}>
      <div
        style={{
          color: "var(--app-color-text-secondary)",
          fontSize: 12,
          fontWeight: 700,
          lineHeight: "16px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          color,
          fontSize: 26,
          fontWeight: 750,
          lineHeight: "34px",
          marginTop: 6,
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function ActionButton({
  children,
  primary = false,
  onClick,
}: {
  children: ReactNode;
  primary?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: primary
          ? "1px solid var(--app-accent-primary)"
          : "1px solid var(--app-color-border-secondary)",
        background: primary
          ? "var(--app-accent-primary)"
          : "var(--app-color-surface)",
        color: primary
          ? "var(--app-color-brand-on-fill)"
          : "var(--app-color-text)",
        borderRadius: 8,
        minHeight: 38,
        padding: "8px 12px",
        fontSize: 13,
        fontWeight: 700,
        cursor: "pointer",
        textAlign: "center",
      }}
    >
      {children}
    </button>
  );
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  let locales: HomeLocaleOption[] = [];
  let primaryLocale = "en";
  try {
    const loaded = await loadShopLocalesForTranslation({
      shop: session.shop,
      accessToken: session.accessToken as string,
    });
    locales = loaded.localeOptions;
    primaryLocale = loaded.primaryLocale;
  } catch (err) {
    console.error("[translateV4] diagnostics load shopLocales failed:", err);
  }

  const targetLocales = selectShopTargetLocales(locales, primaryLocale);
  const [jobs, coverage, diagnostics] = await Promise.all([
    listV4JobSummaries(session.shop),
    getCoverageSummaryFromCache({
      shop: session.shop,
      primaryLocale,
      targetLocales,
    }),
    loadHomeDiagnostics({
      admin,
      shop: session.shop,
      locales,
    }),
  ]);

  return json({
    shop: session.shop,
    jobs,
    coverage,
    diagnostics,
  });
};

export default function TranslateV4DiagnosticsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { shop, jobs, coverage, diagnostics } = useLoaderData<typeof loader>();
  const [quota, setQuota] = useState<ShopQuota | null>(null);

  useEffect(() => {
    let disposed = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/translate-v4/quota?shopName=${encodeURIComponent(shop)}`,
        );
        const data = await res.json();
        if (!disposed && data?.ok) setQuota(data.quota as ShopQuota | null);
      } catch (err) {
        console.error("[translateV4] diagnostics quota failed:", err);
      }
    })();
    return () => {
      disposed = true;
    };
  }, [shop]);

  const remainingCredits = quota?.remaining ?? null;
  const activeJobs = useMemo(() => jobs.filter((j) => !j.isTerminal), [jobs]);
  const failedJobs = useMemo(
    () => jobs.filter((j) => j.status === "FAILED"),
    [jobs],
  );
  const pausedJobs = useMemo(
    () => jobs.filter((j) => j.status === "PAUSED"),
    [jobs],
  );
  const lowCoverageLocales = useMemo(
    () =>
      coverage.locales
        .filter((row) => row.total > 0 && (row.percent ?? 0) < 80)
        .sort((a, b) => (a.percent ?? 0) - (b.percent ?? 0))
        .slice(0, 3),
    [coverage.locales],
  );
  const pendingItems = Math.max(coverage.totalItems - coverage.translatedItems, 0);

  const openHomePage = useCallback(() => navigate("/app/translate-v4"), [navigate]);
  const openLanguagePage = useCallback(() => navigate("/app/language"), [navigate]);
  const openContentPage = useCallback(
    () => navigate("/app/manage_translation"),
    [navigate],
  );
  const openStorefrontPage = useCallback(() => navigate("/app/switcher"), [navigate]);
  const openGlossaryPage = useCallback(() => navigate("/app/glossary"), [navigate]);
  const openPricingPage = useCallback(() => navigate("/app/pricing"), [navigate]);

  const diagnosticIssues = useMemo<HomeIssue[]>(() => {
    const issues: HomeIssue[] = [];

    if (failedJobs.length > 0) {
      issues.push({
        key: "failed-tasks",
        text: t("v4.home.issueFailedTasks", { count: failedJobs.length }),
        actionLabel: t("v4.home.actionReviewTasks"),
        onAction: openHomePage,
        tone: "critical",
      });
    }

    if (pausedJobs.length > 0) {
      issues.push({
        key: "paused-tasks",
        text: t("v4.home.issuePausedTasks", { count: pausedJobs.length }),
        actionLabel: t("v4.home.actionReviewTasks"),
        onAction: openHomePage,
        tone: "warning",
      });
    }

    if (remainingCredits != null && remainingCredits <= 0) {
      issues.push({
        key: "no-credits",
        text: t("v4.home.issueNoCredits"),
        actionLabel: t("v4.home.actionBuyCredits"),
        onAction: openPricingPage,
        tone: "critical",
      });
    }

    if (coverage.languageCount === 0) {
      issues.push({
        key: "no-languages",
        text: t("v4.home.issueNoLanguages"),
        actionLabel: t("v4.home.actionManageLanguages"),
        onAction: openLanguagePage,
        tone: "critical",
      });
    }

    if (diagnostics.unpublishedLocales.length > 0) {
      issues.push({
        key: "unpublished-locales",
        text: t("v4.home.issueUnpublishedLanguages", {
          count: diagnostics.unpublishedLocales.length,
        }),
        actionLabel: t("v4.home.actionPublishLanguages"),
        onAction: openLanguagePage,
        tone: "warning",
      });
    }

    lowCoverageLocales.forEach((row) => {
      issues.push({
        key: `low-coverage-${row.locale}`,
        text: t("v4.home.issueLowCoverage", {
          language: row.label || row.locale,
          percent: row.percent ?? 0,
        }),
        actionLabel: t("v4.home.actionFixContent"),
        onAction: openContentPage,
        tone: "warning",
      });
    });

    if (diagnostics.glossaryCount === 0) {
      issues.push({
        key: "empty-glossary",
        text: t("v4.home.issueEmptyGlossary"),
        actionLabel: t("v4.home.actionAddGlossary"),
        onAction: openGlossaryPage,
        tone: "warning",
      });
    }

    if (diagnostics.switcher.selectorsEnabled === false) {
      issues.push({
        key: "switcher-disabled",
        text: t("v4.home.issueSwitcherDisabled"),
        actionLabel: t("v4.home.actionConfigureStorefront"),
        onAction: openStorefrontPage,
        tone: "warning",
      });
    }

    if (diagnostics.switcher.themeEnabled === false) {
      issues.push({
        key: "switcher-theme-disabled",
        text: t("v4.home.issueSwitcherThemeDisabled"),
        actionLabel: t("v4.home.actionConfigureStorefront"),
        onAction: openStorefrontPage,
        tone: "warning",
      });
    }

    return issues;
  }, [
    coverage.languageCount,
    diagnostics.glossaryCount,
    diagnostics.switcher.selectorsEnabled,
    diagnostics.switcher.themeEnabled,
    diagnostics.unpublishedLocales.length,
    failedJobs.length,
    lowCoverageLocales,
    openContentPage,
    openGlossaryPage,
    openHomePage,
    openLanguagePage,
    openPricingPage,
    openStorefrontPage,
    pausedJobs.length,
    remainingCredits,
    t,
  ]);

  const issueCount = diagnosticIssues.length;
  const issueItems =
    issueCount > 0
      ? diagnosticIssues
      : [
          {
            key: "no-issues",
            text: t("v4.home.noIssues"),
            tone: "success" as const,
          },
        ];

  return (
    <Page>
      <TitleBar title={t("v4.diagnostics.title")} />
      <div className="v4-page" style={v4ContentStyle}>
        <div
          className="v4-enter"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 16,
          }}
        >
          <div>
            <div style={{ fontSize: 24, fontWeight: 760, lineHeight: "32px" }}>
              {t("v4.diagnostics.title")}
            </div>
            <div
              style={{
                color: "var(--app-color-text-secondary)",
                fontSize: 14,
                lineHeight: "22px",
                marginTop: 4,
              }}
            >
              {t("v4.diagnostics.subtitle")}
            </div>
          </div>
          <ActionButton primary onClick={openHomePage}>
            {activeJobs.length > 0
              ? t("v4.home.continueTranslation")
              : t("v4.home.startTranslation")}
          </ActionButton>
        </div>

        <div
          className="v4-enter"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <MetricCard
            label={t("v4.home.coverage")}
            value={coverage.overallPercent == null ? "--" : `${coverage.overallPercent}%`}
            tone={(coverage.overallPercent ?? 0) >= 80 ? "success" : "warning"}
          />
          <MetricCard
            label={t("v4.home.activeTasks")}
            value={`${activeJobs.length}`}
            tone={activeJobs.length > 0 ? "warning" : "default"}
          />
          <MetricCard
            label={t("v4.home.needsAttention")}
            value={`${issueCount}`}
            tone={issueCount > 0 ? "critical" : "success"}
          />
          <MetricCard
            label={t("v4.home.remainingCredits")}
            value={remainingCredits == null ? "--" : formatCredits(remainingCredits)}
            tone={remainingCredits != null && remainingCredits <= 0 ? "critical" : "default"}
          />
        </div>

        <div
          className="v4-enter"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(220px, 320px)",
            gap: 16,
            alignItems: "stretch",
          }}
        >
          <div
            style={{
              ...diagnosticCardStyle,
              padding: 18,
              display: "grid",
              gap: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ fontSize: 18, fontWeight: 750, lineHeight: "24px" }}>
                  {t("v4.home.statusTitle")}
                </div>
                <div
                  style={{
                    color: "var(--app-color-text-secondary)",
                    fontSize: 13,
                    lineHeight: "20px",
                    marginTop: 4,
                  }}
                >
                  {t("v4.home.statusSubtitle", {
                    translated: coverage.translatedItems,
                    pending: pendingItems,
                  })}
                </div>
              </div>
              <ActionButton onClick={openHomePage}>
                {t("v4.home.viewTasks")}
              </ActionButton>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 10,
              }}
            >
              {issueItems.map((item) => (
                <div
                  key={item.key}
                  style={{
                    border: "1px solid var(--app-color-border-secondary)",
                    borderRadius: 10,
                    padding: "10px 12px",
                    background:
                      item.tone === "success"
                        ? "var(--app-accent-growth-soft)"
                        : item.tone === "critical"
                          ? "var(--app-accent-critical-soft)"
                          : "var(--app-color-surface-secondary)",
                    color: "var(--app-color-text)",
                    fontSize: 13,
                    lineHeight: "19px",
                    minHeight: 40,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span>{item.text}</span>
                  {item.actionLabel && item.onAction ? (
                    <button
                      type="button"
                      onClick={item.onAction}
                      style={{
                        border: "1px solid var(--app-color-border-secondary)",
                        borderRadius: 7,
                        background: "var(--app-color-surface)",
                        color: "var(--app-color-text)",
                        minHeight: 30,
                        padding: "4px 9px",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.actionLabel}
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              ...diagnosticCardStyle,
              padding: 18,
              display: "grid",
              alignContent: "start",
              gap: 10,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 750 }}>
              {t("v4.home.nextActions")}
            </div>
            <ActionButton primary onClick={openHomePage}>
              {activeJobs.length > 0
                ? t("v4.home.continueTranslation")
                : t("v4.home.startTranslation")}
            </ActionButton>
            <ActionButton onClick={openContentPage}>
              {t("v4.home.fixContent")}
            </ActionButton>
            <ActionButton onClick={openLanguagePage}>
              {t("v4.home.manageLanguages")}
            </ActionButton>
            <ActionButton onClick={openStorefrontPage}>
              {t("v4.home.configureStorefront")}
            </ActionButton>
          </div>
        </div>
      </div>
    </Page>
  );
}
