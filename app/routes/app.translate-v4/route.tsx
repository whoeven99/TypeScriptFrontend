import {
  Suspense,
  lazy,
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { message } from "~/ui/message";
import { TitleBar } from "@shopify/app-bridge-react";
import { Page } from "@shopify/polaris";
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { authenticate } from "~/shopify.server";
import { ensureShopV4Settings } from "~/server/translateV4/migration.server";
import { listV4JobSummaries } from "~/server/translateV4/progress.server";
import type { TranslationJobProgressSummary } from "~/server/translateV4/progress.server";
import type { ShopQuota } from "~/server/translateV4/quota.server";
import {
  getCoverageSummaryFromCache,
  type CoverageSummary,
} from "~/server/translateV4/coverage.server";
import {
  createTranslateV4Tasks,
  type ShopLocaleOption,
} from "~/lib/createTranslateV4Tasks";
import { DEFAULT_MODULE_KEYS, DEFAULT_AI_MODEL } from "./constants";
import { expandV2ModuleKeys } from "~/server/translateV4/moduleCatalog";
import { v4ContentStyle, V4_OVERVIEW_CARD_MIN_HEIGHT } from "./v4Styles";
import { PageHeaderBar, SummaryDonutCard } from "./components/SummaryAndHeader";
import { CreateTaskCard } from "./components/CreateTaskCard";
import { CreateTaskQuotaGateModal } from "./components/CreateTaskQuotaGateModal";
import { TaskQueueSection } from "./components/TaskQueueSection";
import { CoverageCard } from "./components/CoverageCard";
import { formatCredits, localeRegionCode } from "./localeDisplay";
import { formatV4CreateTasksMessage, translateV4Message } from "./v4I18n";
import { notifyTranslationStatsUpdated } from "~/lib/translationStatsSync";
import { selectShopTargetLocales } from "~/lib/shopTargetLocales";
import { syncShopTargetLocalesFromShopify } from "~/server/translateV4/targetLocale.server";
import { loadShopLocalesForTranslation } from "~/server/translateV4/shopLocales.server";
import { listGlossaryDo } from "~/server/translateV4/glossary.server";
import { getSwitcherConfigForAdmin } from "~/server/storefront/switcherAdmin.server";

const PaymentModal = lazy(() => import("~/components/paymentModal"));
const LazySupportChatWidget = lazy(() =>
  import("./SupportChatWidget").then((module) => ({
    default: module.SupportChatWidget,
  })),
);

type HomeDiagnostics = {
  unpublishedLocales: Array<{ locale: string; label: string }>;
  glossaryCount: number | null;
  switcher: {
    selectorsEnabled: boolean | null;
    themeEnabled: boolean | null;
  };
};

type HomeLocaleOption = ShopLocaleOption & {
  primary?: boolean;
  published?: boolean;
};

type AdminGraphqlLike = {
  graphql: (
    query: string,
    options?: { variables?: Record<string, unknown> },
  ) => Promise<Response>;
};

type HomeIssue = {
  key: string;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: "default" | "success" | "warning" | "critical";
};

function useIdleReady(timeout = 2500) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) return;
    if (typeof window === "undefined") return;

    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(() => setReady(true), { timeout });
      return () => window.cancelIdleCallback(id);
    }

    const id = window.setTimeout(() => setReady(true), timeout);
    return () => window.clearTimeout(id);
  }, [ready, timeout]);

  return ready;
}

function scheduleShopV4Bootstrap({
  shop,
  shopLocaleRows,
  primaryLocale,
}: {
  shop: string;
  shopLocaleRows: Array<{ locale: string; primary: boolean }>;
  primaryLocale: string;
}) {
  const bootstrap = shopLocaleRows.length
    ? syncShopTargetLocalesFromShopify(shop, shopLocaleRows, primaryLocale)
    : ensureShopV4Settings(shop, primaryLocale);

  void bootstrap.catch((err) => {
    console.error("[translateV4] background bootstrap failed:", err);
  });
}

async function loadSwitcherThemeEnabled(
  admin: AdminGraphqlLike,
): Promise<boolean | null> {
  const switcherBlockType = process.env.SHOPIFY_CIWI_SWITCHER_THEME_ID;
  if (!switcherBlockType) return null;

  try {
    const response = await admin.graphql(
      `#graphql
        query HomeSwitcherThemeDiagnostics {
          themes(roles: MAIN, first: 1) {
            nodes {
              files(filenames: "config/settings_data.json") {
                nodes {
                  body {
                    ... on OnlineStoreThemeFileBodyText {
                      content
                    }
                  }
                }
              }
            }
          }
        }`,
    );
    const data = await response.json();
    const content =
      data?.data?.themes?.nodes?.[0]?.files?.nodes?.[0]?.body?.content;
    if (typeof content !== "string" || !content.trim()) return null;

    const jsonString = content.replace(/\/\*[\s\S]*?\*\//g, "").trim();
    const blocks = JSON.parse(jsonString)?.current?.blocks;
    if (!blocks) return false;

    const switcherBlock = Object.values(blocks).find(
      (block: any) => block?.type === switcherBlockType,
    ) as { disabled?: boolean } | undefined;
    if (!switcherBlock) return false;
    return !switcherBlock.disabled;
  } catch (err) {
    console.error("[translateV4] switcher theme diagnostics failed:", err);
    return null;
  }
}

async function loadHomeDiagnostics({
  admin,
  shop,
  locales,
}: {
  admin: AdminGraphqlLike;
  shop: string;
  locales: HomeLocaleOption[];
}): Promise<HomeDiagnostics> {
  const unpublishedLocales = locales
    .filter((locale) => !locale.primary && !locale.published)
    .map((locale) => ({
      locale: locale.value,
      label: locale.label,
    }));

  const [glossaryRows, switcherConfig, switcherThemeEnabled] =
    await Promise.all([
      listGlossaryDo(shop).catch((err) => {
        console.error("[translateV4] glossary diagnostics failed:", err);
        return null;
      }),
      getSwitcherConfigForAdmin(shop).catch((err) => {
        console.error("[translateV4] switcher diagnostics failed:", err);
        return null;
      }),
      loadSwitcherThemeEnabled(admin),
    ]);

  return {
    unpublishedLocales,
    glossaryCount: Array.isArray(glossaryRows)
      ? glossaryRows.filter((row) => row.status === 1).length
      : null,
    switcher: {
      selectorsEnabled: switcherConfig
        ? switcherConfig.languageSelector || switcherConfig.currencySelector
        : null,
      themeEnabled: switcherThemeEnabled,
    },
  };
}

const homeCardStyle: CSSProperties = {
  background: "var(--app-color-surface)",
  border: "1px solid var(--app-color-border-secondary)",
  borderRadius: 14,
  boxShadow: "var(--app-shadow-card)",
};

function HomeMetricCard({
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
    <div style={{ ...homeCardStyle, padding: "14px 16px", minWidth: 0 }}>
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

function HomeActionButton({
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
  let shopLocaleRows: Array<{ locale: string; primary: boolean }> = [];
  try {
    const loaded = await loadShopLocalesForTranslation({
      shop: session.shop,
      accessToken: session.accessToken as string,
    });
    shopLocaleRows = loaded.rows;
    locales = loaded.localeOptions;
    primaryLocale = loaded.primaryLocale;
  } catch (err) {
    console.error("[translateV4] load shopLocales failed:", err);
  }

  // The settings/target-locale sync is a best-effort write path. Keep it out of
  // the SSR critical path so the v4 home can render from Shopify locales + caches.
  scheduleShopV4Bootstrap({
    shop: session.shop,
    shopLocaleRows,
    primaryLocale,
  });

  const targetLocales = selectShopTargetLocales(locales, primaryLocale);

  // 关键内容（任务列表 + 覆盖率）在 loader 阻塞等待；quota / planType 由客户端拉取，
  // 避免阻塞首屏，且不使用 defer（自定义 entry.server 的 renderToString 不支持 defer 流式）。
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
    }).catch((err) => {
      console.error("[translateV4] home diagnostics failed:", err);
      return {
        unpublishedLocales: [],
        glossaryCount: null,
        switcher: { selectorsEnabled: null, themeEnabled: null },
      } satisfies HomeDiagnostics;
    }),
  ]);

  return json({
    shop: session.shop,
    locales,
    primaryLocale,
    jobs,
    coverage,
    diagnostics,
  });
};

export default function AppTranslateV4() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    shop,
    locales,
    primaryLocale,
    jobs: initialJobs,
    coverage: initialCoverage,
    diagnostics,
  } = useLoaderData<typeof loader>();

  const [jobs, setJobs] =
    useState<TranslationJobProgressSummary[]>(initialJobs);
  const [quota, setQuota] = useState<ShopQuota | null>(null);
  const [coverage, setCoverage] = useState<CoverageSummary>(initialCoverage);
  const { plan, isNew } = useSelector(
    (state: {
      userConfig?: {
        plan?: { type?: string; isInFreePlanTime?: boolean };
        isNew?: boolean | null;
      };
    }) => ({
      plan: state.userConfig?.plan,
      isNew: state.userConfig?.isNew ?? null,
    }),
  );
  const planType = plan?.type?.trim() || null;
  const [coverageLoading, setCoverageLoading] = useState(false);
  const [coverageExpanded, setCoverageExpanded] = useState(false);
  const source = primaryLocale || "en";

  const localeOptions = useMemo(
    () =>
      locales.length
        ? locales
        : [
            {
              value: "zh-CN",
              label: `${t("v4.locale.zhCnFallback")} (zh-CN)`,
              primary: true,
              published: true,
            },
          ],
    [locales, t],
  );

  const targetOptions = useMemo(
    () => selectShopTargetLocales(localeOptions, source),
    [localeOptions, source],
  );

  const [targets, setTargets] = useState<string[]>(() =>
    targetOptions.map((option) => option.value),
  );
  const [moduleKeys, setModuleKeys] = useState<string[]>(DEFAULT_MODULE_KEYS);
  const [aiModel, setAiModel] = useState<string>(DEFAULT_AI_MODEL);
  const [isCover, setIsCover] = useState(false);
  const [isHandle, setIsHandle] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [quotaGateMode, setQuotaGateMode] = useState<
    "trial" | "pricing" | null
  >(null);
  const supportChatReady = useIdleReady();

  const refreshCoverage = useCallback(
    async (forceRefresh = true) => {
      setCoverageLoading(true);
      try {
        if (!forceRefresh) {
          const res = await fetch(
            `/api/translate-v4/coverage?shopName=${encodeURIComponent(shop)}`,
          );
          const data = await res.json();
          if (data?.ok) setCoverage(data.summary as CoverageSummary);
          return;
        }

        // 按语言逐个刷新，避免一次请求扫全店导致超时 / 与翻译任务争抢 Shopify 限流
        for (const loc of targetOptions) {
          const res = await fetch(
            `/api/translate-v4/coverage?shopName=${encodeURIComponent(shop)}&refresh=1&locales=${encodeURIComponent(loc.value)}`,
          );
          const data = await res.json();
          if (data?.ok) setCoverage(data.summary as CoverageSummary);
        }
      } catch (err) {
        console.error("[translateV4] refresh coverage failed:", err);
        if (forceRefresh) message.error(t("v4.refreshStatsFailed"));
      } finally {
        setCoverageLoading(false);
      }
    },
    [shop, targetOptions, t],
  );

  const refreshCoverageFromCache = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/translate-v4/coverage?shopName=${encodeURIComponent(shop)}`,
      );
      const data = await res.json();
      if (data?.ok) setCoverage(data.summary as CoverageSummary);
    } catch (err) {
      console.error("[translateV4] refresh coverage from cache failed:", err);
    }
  }, [shop]);

  const jobStatusRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    const map = new Map<string, string>();
    for (const j of initialJobs) map.set(j.taskId, j.status);
    jobStatusRef.current = map;
  }, [initialJobs]);

  const applyJobsUpdate = useCallback(
    (newJobs: TranslationJobProgressSummary[]) => {
      for (const j of newJobs) {
        const prev = jobStatusRef.current.get(j.taskId);
        if (j.status === "COMPLETED" && prev !== "COMPLETED") {
          void refreshCoverageFromCache();
          notifyTranslationStatsUpdated({ target: j.target, source: j.source });
        }
        jobStatusRef.current.set(j.taskId, j.status);
      }
      setJobs(newJobs);
    },
    [refreshCoverageFromCache],
  );

  const refreshList = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/translate-v4/tasks?shopName=${encodeURIComponent(shop)}`,
      );
      const data = await res.json();
      if (data?.ok) {
        applyJobsUpdate(data.jobs as TranslationJobProgressSummary[]);
      }
    } catch (err) {
      console.error("[translateV4] refresh list failed:", err);
    }
  }, [shop, applyJobsUpdate]);

  const refreshQuota = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/translate-v4/quota?shopName=${encodeURIComponent(shop)}`,
      );
      const data = await res.json();
      if (data?.ok) setQuota(data.quota as ShopQuota | null);
    } catch (err) {
      console.error("[translateV4] refresh quota failed:", err);
    }
  }, [shop]);

  useEffect(() => {
    void refreshQuota();
  }, [refreshQuota]);

  const handleAction = useCallback(
    async (
      taskId: string,
      actionType: "pause" | "resume" | "cancel" | "delete",
    ) => {
      try {
        const res = await fetch("/api/translate-v4/task-action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId, shopName: shop, action: actionType }),
        });
        const data = await res.json();
        if (data?.ok) {
          const label =
            actionType === "delete"
              ? t("v4.deleted")
              : actionType === "resume"
                ? t("v4.resuming")
                : actionType === "pause"
                  ? data.pending
                    ? t("v4.pausing")
                    : t("v4.paused")
                  : data.pending
                    ? t("v4.cancelling")
                    : t("v4.cancelled");
          message.success(label);
          await Promise.all([refreshList(), refreshQuota()]);
          return true;
        }
        message.error(data?.error || t("v4.actionFailed"));
        return false;
      } catch (err) {
        console.error("[translateV4] task action failed:", err);
        message.error(t("v4.actionFailedRetry"));
        return false;
      }
    },
    [shop, refreshList, refreshQuota, t],
  );

  const handleCreate = useCallback(async () => {
    const normalizedPlanType = planType?.trim().toLowerCase() || "";
    const hasPaidPlan =
      normalizedPlanType !== "" && normalizedPlanType !== "free";
    const remainingCredits = quota?.remaining ?? null;
    const shouldGateByCredits =
      remainingCredits != null &&
      remainingCredits <= 0 &&
      !hasPaidPlan &&
      !plan?.isInFreePlanTime;

    if (shouldGateByCredits) {
      if (isNew === null) {
        message.info(
          t("Checking your trial eligibility. Please try again in a moment."),
        );
        return;
      }
      setQuotaGateMode(isNew ? "trial" : "pricing");
      return;
    }

    setCreating(true);
    try {
      const result = await createTranslateV4Tasks({
        source,
        targets,
        modules: expandV2ModuleKeys(moduleKeys),
        aiModel,
        isCover,
        isHandle,
        targetOptions,
      });

      if (result.validationError) {
        message.warning(translateV4Message(result.validationError, t));
        return;
      }

      const summary = formatV4CreateTasksMessage(result, t, localeRegionCode);
      if (result.created.length > 0) {
        message.success(summary);
        await Promise.all([refreshList(), refreshQuota()]);
      } else {
        message.error(summary);
      }

      if (result.failed.length > 0 && result.created.length > 0) {
        message.warning(
          result.failed
            .map(
              (f) =>
                `${localeRegionCode(f.target)}: ${translateV4Message(f.error, t)}`,
            )
            .join("；"),
          6,
        );
      }
    } catch (err) {
      console.error("[translateV4] create failed:", err);
      message.error(t("v4.createFailedRetry"));
    } finally {
      setCreating(false);
    }
  }, [
    source,
    targets,
    moduleKeys,
    aiModel,
    isCover,
    isHandle,
    targetOptions,
    refreshList,
    refreshQuota,
    plan,
    planType,
    quota,
    isNew,
    t,
  ]);

  const jobsRef = useRef(jobs);
  jobsRef.current = jobs;

  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stablePollCount = 0;
    let lastActiveJobsSignature = "";

    const getNextDelay = () => {
      if (typeof document !== "undefined" && document.hidden) return 30_000;
      return Math.min(30_000, 3_000 * 2 ** Math.min(stablePollCount, 3));
    };

    const poll = () => {
      if (disposed) return;
      const hasActive = jobsRef.current.some((j) => !j.isTerminal);
      if (!hasActive) {
        stablePollCount = 0;
        timer = setTimeout(poll, 10_000);
        return;
      }

      const signature = jobsRef.current
        .filter((j) => !j.isTerminal)
        .map(
          (j) =>
            `${j.taskId}:${j.status}:${j.progressPercent ?? ""}:${j.updatedAt}`,
        )
        .join("|");

      stablePollCount =
        signature === lastActiveJobsSignature ? stablePollCount + 1 : 0;
      lastActiveJobsSignature = signature;

      if (typeof document === "undefined" || !document.hidden) {
        void refreshList();
        void refreshQuota();
      }

      timer = setTimeout(poll, getNextDelay());
    };

    timer = setTimeout(poll, 3_000);

    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
    };
  }, [refreshList, refreshQuota]);

  const coverageAutoRefreshDone = useRef(false);
  useEffect(() => {
    if (coverageAutoRefreshDone.current) return;
    if (!initialCoverage.locales.some((l) => l.cacheMissing)) return;
    coverageAutoRefreshDone.current = true;
    // 翻译进行中勿全量扫 Shopify；仅读 Redis 缓存，用户可手动「刷新统计」
    void refreshCoverageFromCache();
  }, [initialCoverage.locales, refreshCoverageFromCache]);

  const translateSlotBusy = useMemo(
    () => jobs.some((j) => j.status === "TRANSLATING" || j.isStopping),
    [jobs],
  );

  const translateQueue = useMemo(
    () => jobs.filter((j) => !j.isTerminal && j.status === "TRANSLATE_QUEUED"),
    [jobs],
  );

  const remainingCredits = quota?.remaining ?? null;
  const createTaskSectionRef = useRef<HTMLDivElement | null>(null);
  const taskQueueSectionRef = useRef<HTMLDivElement | null>(null);

  const openLanguagePage = useCallback(() => {
    navigate("/app/language");
  }, [navigate]);

  const openContentPage = useCallback(() => {
    navigate("/app/manage_translation");
  }, [navigate]);

  const openStorefrontPage = useCallback(() => {
    navigate("/app/switcher");
  }, [navigate]);

  const openGlossaryPage = useCallback(() => {
    navigate("/app/glossary");
  }, [navigate]);

  const openPricingPage = useCallback(() => {
    navigate("/app/pricing");
  }, [navigate]);

  const scrollToCreateTask = useCallback(() => {
    createTaskSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);

  const scrollToTaskQueue = useCallback(() => {
    taskQueueSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);

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

  const diagnosticIssues = useMemo<HomeIssue[]>(() => {
    const issues: HomeIssue[] = [];

    if (failedJobs.length > 0) {
      issues.push({
        key: "failed-tasks",
        text: t("v4.home.issueFailedTasks", { count: failedJobs.length }),
        actionLabel: t("v4.home.actionReviewTasks"),
        onAction: scrollToTaskQueue,
        tone: "critical",
      });
    }

    if (pausedJobs.length > 0) {
      issues.push({
        key: "paused-tasks",
        text: t("v4.home.issuePausedTasks", { count: pausedJobs.length }),
        actionLabel: t("v4.home.actionReviewTasks"),
        onAction: scrollToTaskQueue,
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
    openLanguagePage,
    openPricingPage,
    openStorefrontPage,
    pausedJobs.length,
    remainingCredits,
    scrollToTaskQueue,
    t,
  ]);
  const issueCount = diagnosticIssues.length;
  const issueItems = useMemo<HomeIssue[]>(
    () =>
      issueCount > 0
        ? diagnosticIssues.slice(0, 5)
        : [
            {
              key: "no-issues",
              text: t("v4.home.noIssues"),
              tone: "success",
            },
          ],
    [diagnosticIssues, issueCount, t],
  );

  return (
    <Page>
      <TitleBar title={t("v4.title")} />
      <div className="v4-page" style={v4ContentStyle}>
        <div className="v4-enter">
          <PageHeaderBar credits={remainingCredits} planType={planType} />
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
          <HomeMetricCard
            label={t("v4.home.coverage")}
            value={coverage.overallPercent == null ? "--" : `${coverage.overallPercent}%`}
            tone={(coverage.overallPercent ?? 0) >= 80 ? "success" : "warning"}
          />
          <HomeMetricCard
            label={t("v4.home.activeTasks")}
            value={`${activeJobs.length}`}
            tone={activeJobs.length > 0 ? "warning" : "default"}
          />
          <HomeMetricCard
            label={t("v4.home.needsAttention")}
            value={`${issueCount}`}
            tone={issueCount > 0 ? "critical" : "success"}
          />
          <HomeMetricCard
            label={t("v4.home.remainingCredits")}
            value={remainingCredits == null ? "--" : formatCredits(remainingCredits)}
            tone={remainingCredits != null && remainingCredits <= 0 ? "critical" : "default"}
          />
        </div>

        <div
          className="v4-enter"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
            marginBottom: 18,
            alignItems: "stretch",
          }}
        >
          <div
            style={{
              ...homeCardStyle,
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
              <HomeActionButton onClick={scrollToTaskQueue}>
                {t("v4.home.viewTasks")}
              </HomeActionButton>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
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
              ...homeCardStyle,
              padding: 18,
              display: "grid",
              alignContent: "start",
              gap: 10,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 750 }}>
              {t("v4.home.nextActions")}
            </div>
            <HomeActionButton primary onClick={scrollToCreateTask}>
              {activeJobs.length > 0 ? t("v4.home.continueTranslation") : t("v4.home.startTranslation")}
            </HomeActionButton>
            <HomeActionButton onClick={openContentPage}>
              {t("v4.home.fixContent")}
            </HomeActionButton>
            <HomeActionButton onClick={openLanguagePage}>
              {t("v4.home.manageLanguages")}
            </HomeActionButton>
            <HomeActionButton onClick={openStorefrontPage}>
              {t("v4.home.configureStorefront")}
            </HomeActionButton>
          </div>
        </div>

        {translateQueue.length > 0 ? (
          <div
            className="v4-enter"
            style={{
              marginBottom: 16,
              padding: "12px 16px",
              borderRadius: 12,
              background: "var(--p-color-bg-surface-info)",
              color: "var(--p-color-text-info)",
              border: "1px solid var(--v4-accent-primary-muted)",
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              fontSize: 13,
              lineHeight: "20px",
              boxShadow: "var(--app-shadow-card)",
            }}
          >
            <span
              aria-hidden
              className="v4-livedot"
              style={{
                width: 8,
                height: 8,
                marginTop: 6,
                borderRadius: "50%",
                background: "currentColor",
                flexShrink: 0,
              }}
            />
            <span>
              {translateSlotBusy
                ? t("v4.queueBusy", { count: translateQueue.length })
                : t("v4.queueWaiting", { count: translateQueue.length })}
            </span>
          </div>
        ) : null}

        <div
          style={{
            display: "grid",
            gap: 18,
            alignItems: "start",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.45fr) minmax(320px, 0.92fr)",
              gap: 18,
              alignItems: coverageExpanded ? "start" : "stretch",
            }}
          >
            <div
              style={{
                display: "flex",
                minHeight: V4_OVERVIEW_CARD_MIN_HEIGHT,
                ...(coverageExpanded
                  ? {
                      alignSelf: "flex-start",
                      height: V4_OVERVIEW_CARD_MIN_HEIGHT,
                    }
                  : null),
              }}
            >
              <SummaryDonutCard summary={coverage} compact />
            </div>
            <div
              style={{
                display: "flex",
                minHeight: V4_OVERVIEW_CARD_MIN_HEIGHT,
              }}
            >
              <CoverageCard
                locales={coverage.locales}
                loading={coverageLoading}
                onRefresh={refreshCoverage}
                compact
                onManageLanguages={openLanguagePage}
                onExpandedChange={setCoverageExpanded}
                fillPairHeight={!coverageExpanded}
              />
            </div>
          </div>

          <div ref={createTaskSectionRef} className="v4-enter v4-enter-d2">
            <CreateTaskCard
              targetOptions={targetOptions}
              targets={targets}
              onTargetsChange={setTargets}
              modules={moduleKeys}
              onModulesChange={setModuleKeys}
              creating={creating}
              onCreate={handleCreate}
              aiModel={aiModel}
              onAiModelChange={setAiModel}
              isCover={isCover}
              onIsCoverChange={setIsCover}
              isHandle={isHandle}
              onIsHandleChange={setIsHandle}
            />
          </div>

          <div
            ref={taskQueueSectionRef}
            className="v4-enter v4-enter-d3"
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr)",
              gap: 16,
            }}
          >
            <TaskQueueSection
              jobs={jobs}
              translateSlotBusy={translateSlotBusy}
              onBuyCredits={() => setShowPaymentModal(true)}
              onAction={handleAction}
            />
          </div>
        </div>
      </div>

      {supportChatReady ? (
        <Suspense fallback={null}>
          <LazySupportChatWidget />
        </Suspense>
      ) : null}
      <CreateTaskQuotaGateModal
        open={quotaGateMode !== null}
        mode={quotaGateMode ?? "pricing"}
        onClose={() => setQuotaGateMode(null)}
      />
      {showPaymentModal ? (
        <Suspense fallback={null}>
          <PaymentModal
            visible={showPaymentModal}
            setVisible={setShowPaymentModal}
          />
        </Suspense>
      ) : null}
    </Page>
  );
}
