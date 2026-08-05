import {
  type CSSProperties,
  Profiler,
  Suspense,
  lazy,
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
import { useLoaderData, useLocation, useNavigate } from "@remix-run/react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { authenticate } from "~/shopify.server";
import type { RootState } from "~/store";
import { ensureShopV4Settings } from "~/server/translateV4/migration.server";
import { listV4JobSummaries } from "~/server/translateV4/progress.server";
import type { TranslationJobProgressSummary } from "~/server/translateV4/progress.server";
import type { ShopQuota } from "~/lib/translationQuota";
import {
  getCoverageSummaryFromCache,
  type CoverageSummary,
} from "~/server/translateV4/coverage.server";
import {
  createTranslateV4Tasks,
  type ShopLocaleOption,
} from "~/lib/createTranslateV4Tasks";
import { normalizeShopQuota } from "~/lib/translationQuota";
import { shouldBlockCreateTaskByCredits } from "~/lib/createTranslateQuotaGuard";
import { DEFAULT_MODULE_KEYS, DEFAULT_AI_MODEL } from "./constants";
import { expandV2ModuleKeys } from "~/server/translateV4/moduleCatalog";
import { v4ContentStyle, V4_OVERVIEW_CARD_MIN_HEIGHT } from "./v4Styles";
import { PageHeaderBar, SummaryDonutCard } from "./components/SummaryAndHeader";
import { CreateTaskCard } from "./components/CreateTaskCard";
import { CreateTaskConfirmModal } from "./components/CreateTaskConfirmModal";
import { TaskQueueSection } from "./components/TaskQueueSection";
import { CoverageCard } from "./components/CoverageCard";
import { localeRegionCode } from "./localeDisplay";
import { formatV4CreateTasksMessage, translateV4Message } from "./v4I18n";
import {
  buildUntranslatedRatioByLocale,
  useCreateTaskEstimate,
} from "./useCreateTaskEstimate";
import { notifyTranslationStatsUpdated } from "~/lib/translationStatsSync";
import { selectShopTargetLocales } from "~/lib/shopTargetLocales";
import { syncShopTargetLocalesFromShopify } from "~/server/translateV4/targetLocale.server";
import { loadShopLocalesForTranslation } from "~/server/translateV4/shopLocales.server";
import { isCurrentV4Job } from "./jobFilters";
import {
  finishClientLogTrace,
  startClientLogTrace,
} from "~/utils/clientLog";
import {
  isPerfDebugEnabled,
  logReactProfilerRender,
  markPerfEnd,
  markPerfStart,
} from "~/utils/perf";
import { openCreditsPurchaseModal } from "~/utils/creditsPurchaseModal";

const PaymentModal = lazy(() => import("~/components/paymentModal"));

async function readJsonResponse<T = any>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text.trim()) {
    throw new Error(`Empty response body (${res.status})`);
  }
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    const contentType = res.headers.get("content-type") || "unknown";
    throw new Error(
      `Invalid JSON response (${res.status}, ${contentType}): ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const reqStart = Date.now();
  const perfDebug = new URL(request.url).searchParams.get("perf") === "1";
  const { session } = await authenticate.admin(request);
  const authMs = Date.now() - reqStart;

  let locales: ShopLocaleOption[] = [];
  let primaryLocale = "en";
  let shopLocaleRows: Array<{ locale: string; primary: boolean }> = [];
  const localeStart = Date.now();
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
  const localeMs = Date.now() - localeStart;

  // 同步店铺语言到 TSF 是纯写操作，返回值不参与渲染 —— 移出关键路径，
  // 后台执行，避免 N 个串行 upsert 阻塞首屏。
  void syncShopTargetLocalesFromShopify(
    session.shop,
    shopLocaleRows,
    primaryLocale,
  ).catch((syncErr) => {
    console.error("[translateV4] syncShopTargetLocales failed:", syncErr);
  });

  const targetLocales = selectShopTargetLocales(locales, primaryLocale);

  // 关键内容（任务列表 + 覆盖率）在 loader 阻塞等待；quota / planType 由客户端拉取，
  // 避免阻塞首屏，且不使用 defer（自定义 entry.server 的 renderToString 不支持 defer 流式）。
  // ensureShopV4Settings（Turso 写，返回值不参与渲染，且 jobs/coverage 不依赖该行）
  // 并入 Promise.all 与 jobs/coverage 并行，省去一次串行 Turso 往返。
  const keyDataStart = Date.now();
  const [, jobs, coverage] = await Promise.all([
    ensureShopV4Settings(session.shop, primaryLocale),
    listV4JobSummaries(session.shop, { escalateStuck: false }),
    getCoverageSummaryFromCache({
      shop: session.shop,
      targetLocales,
      includeRuntimeSignals: false,
    }),
  ]);
  const keyDataMs = Date.now() - keyDataStart;

  if (perfDebug) {
    console.log(
      `[perf][loader] translate-v4 ${JSON.stringify({
        shop: session.shop,
        authMs,
        localeMs,
        keyDataMs,
        totalMs: Date.now() - reqStart,
        jobsCount: jobs.length,
        targetCount: targetLocales.length,
      })}`,
    );
  }

  return json({
    shop: session.shop,
    locales,
    primaryLocale,
    jobs,
    coverage,
    perfDebug,
  });
};

export default function AppTranslateV4() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const initialLocationState = location.state as
    | { spotlightTaskIds?: string[] }
    | null
    | undefined;
  const {
    shop,
    locales,
    primaryLocale,
    jobs: initialJobs,
    coverage: initialCoverage,
    perfDebug,
  } = useLoaderData<typeof loader>();
  const [perfDebugEnabled, setPerfDebugEnabled] = useState(perfDebug);

  useEffect(() => {
    if (isPerfDebugEnabled()) {
      setPerfDebugEnabled(true);
    }
  }, []);

  const [jobs, setJobs] =
    useState<TranslationJobProgressSummary[]>(initialJobs);
  const currentJobCount = useMemo(
    () => jobs.filter(isCurrentV4Job).length,
    [jobs],
  );
  const [quota, setQuota] = useState<ShopQuota | null>(null);
  const [strictQuotaGate, setStrictQuotaGate] = useState(false);
  const normalizedQuota = useMemo(() => normalizeShopQuota(quota), [quota]);
  const [coverage, setCoverage] = useState<CoverageSummary>(initialCoverage);
  const plan = useSelector((state: RootState) => state.userConfig.plan);
  const isNew = useSelector((state: RootState) => state.userConfig.isNew);
  const totalChars = useSelector((state: RootState) => state.userConfig.totalChars);
  const planType = plan?.type?.trim() || null;
  const createDisabledMessage =
    normalizedQuota == null ? t("v4.create.quotaUnavailable") : null;
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
  const [createConfirmOpen, setCreateConfirmOpen] = useState(false);
  const [activeWorkbenchTab, setActiveWorkbenchTab] = useState<
    "create" | "tasks"
  >(() =>
    (initialLocationState?.spotlightTaskIds?.length ?? 0) > 0
      ? "tasks"
      : "create",
  );
  const [spotlightTaskIds, setSpotlightTaskIds] = useState<string[]>(() => {
    return initialLocationState?.spotlightTaskIds ?? [];
  });
  const refreshCoverage = useCallback(
    async (forceRefresh = true) => {
      const perfStart = markPerfStart(
        forceRefresh
          ? "translate-v4.coverage.refresh.force"
          : "translate-v4.coverage.refresh.cache",
      );
      setCoverageLoading(true);
      const trace = forceRefresh
        ? startClientLogTrace({
            event: "translate_v4_refresh_coverage",
            action: "refresh_coverage",
            shop,
            context: {
              source,
              targets: targetOptions.map((item) => item.value),
            },
          })
        : null;
      try {
        if (!forceRefresh) {
          const res = await fetch(
            `/api/translate-v4/coverage?shopName=${encodeURIComponent(shop)}&cache=1`,
          );
          const data = await readJsonResponse(res);
          if (data?.ok) setCoverage(data.summary as CoverageSummary);
          markPerfEnd("translate-v4.coverage.refresh.cache", perfStart, {
            status: res.status,
            ok: Boolean(data?.ok),
          });
          if (trace) {
            finishClientLogTrace(trace, {
              status: "success",
              context: {
                localeCount: targetOptions.length,
              },
            });
          }
          return;
        }

        // 按语言逐个刷新，避免一次请求扫全店导致超时 / 与翻译任务争抢 Shopify 限流
        for (const loc of targetOptions) {
          const res = await fetch(
            `/api/translate-v4/coverage?shopName=${encodeURIComponent(shop)}&refresh=1&locales=${encodeURIComponent(loc.value)}`,
          );
          const data = await readJsonResponse(res);
          if (data?.ok) setCoverage(data.summary as CoverageSummary);
        }
        markPerfEnd("translate-v4.coverage.refresh.force", perfStart, {
          localeCount: targetOptions.length,
        });
        if (trace) {
          finishClientLogTrace(trace, {
            status: "success",
            context: {
              localeCount: targetOptions.length,
            },
          });
        }
      } catch (err) {
        console.error("[translateV4] refresh coverage failed:", err);
        markPerfEnd(
          forceRefresh
            ? "translate-v4.coverage.refresh.force"
            : "translate-v4.coverage.refresh.cache",
          perfStart,
          {
            failed: true,
          },
        );
        if (trace) {
          finishClientLogTrace(trace, {
            level: "error",
            status: "failure",
            error: err,
          });
        }
        if (forceRefresh) message.error(t("v4.refreshStatsFailed"));
      } finally {
        setCoverageLoading(false);
      }
    },
    [shop, source, targetOptions, t],
  );

  const refreshCoverageFromCache = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/translate-v4/coverage?shopName=${encodeURIComponent(shop)}&cache=1`,
      );
      const data = await readJsonResponse(res);
      if (data?.ok) setCoverage(data.summary as CoverageSummary);
    } catch (err) {
      // Passive cache refresh should not pollute exception telemetry.
      console.warn("[translateV4] refresh coverage from cache failed:", err);
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
    const perfStart = markPerfStart("translate-v4.tasks.refresh");
    try {
      const res = await fetch(
        `/api/translate-v4/tasks?shopName=${encodeURIComponent(shop)}`,
      );
      const data = await readJsonResponse(res);
      markPerfEnd("translate-v4.tasks.refresh", perfStart, {
        status: res.status,
        ok: Boolean(data?.ok),
      });
      if (data?.ok) {
        applyJobsUpdate(data.jobs as TranslationJobProgressSummary[]);
      }
    } catch (err) {
      console.error("[translateV4] refresh list failed:", err);
      markPerfEnd("translate-v4.tasks.refresh", perfStart, {
        failed: true,
      });
    }
  }, [shop, applyJobsUpdate]);

  const refreshQuota = useCallback(async () => {
    const perfStart = markPerfStart("translate-v4.quota.refresh");
    try {
      const res = await fetch(
        `/api/translate-v4/quota?shopName=${encodeURIComponent(shop)}`,
      );
      const data = await readJsonResponse(res);
      markPerfEnd("translate-v4.quota.refresh", perfStart, {
        status: res.status,
        ok: Boolean(data?.ok),
      });
      if (data?.ok) {
        setQuota(normalizeShopQuota(data.quota as ShopQuota | null));
        setStrictQuotaGate(Boolean(data.strictQuotaGate));
      }
    } catch (err) {
      console.error("[translateV4] refresh quota failed:", err);
      markPerfEnd("translate-v4.quota.refresh", perfStart, {
        failed: true,
      });
    }
  }, [shop]);

  useEffect(() => {
    const perfStart = markPerfStart("translate-v4.first-load.quota");
    void refreshQuota().finally(() => {
      markPerfEnd("translate-v4.first-load.quota", perfStart);
    });
  }, [refreshQuota]);

  const handleAction = useCallback(
    async (
      taskId: string,
      actionType: "pause" | "resume" | "cancel" | "delete",
    ) => {
      const trace = startClientLogTrace({
        event: "translate_v4_task_action",
        action: actionType,
        shop,
        context: {
          taskId,
        },
      });
      try {
        const res = await fetch("/api/translate-v4/task-action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId, shopName: shop, action: actionType }),
        });
        const data = await readJsonResponse(res);
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
          finishClientLogTrace(trace, {
            status: "success",
            context: {
              taskId,
              pending: Boolean(data.pending),
              httpStatus: res.status,
            },
          });
          return true;
        }
        if (
          actionType === "resume" &&
          data?.error === "v4.create.noCreditsPricing"
        ) {
          finishClientLogTrace(trace, {
            level: "info",
            status: "failure",
            message: t("v4.error.singleQuotaInsufficient"),
            context: {
              taskId,
              httpStatus: res.status,
              quotaBlocked: true,
            },
          });
          openCreditsPurchaseModal();
          return false;
        }
        finishClientLogTrace(trace, {
          level: "warn",
          status: "failure",
          message: data?.error
            ? translateV4Message(data.error, t)
            : t("v4.actionFailed"),
          context: {
            taskId,
            httpStatus: res.status,
          },
        });
        message.error(data?.error ? translateV4Message(data.error, t) : t("v4.actionFailed"));
        return false;
      } catch (err) {
        console.error("[translateV4] task action failed:", err);
        finishClientLogTrace(trace, {
          level: "error",
          status: "failure",
          error: err,
          context: {
            taskId,
          },
        });
        message.error(t("v4.actionFailedRetry"));
        return false;
      }
    },
    [shop, refreshList, refreshQuota, t],
  );
  const remainingCredits = normalizedQuota?.remaining ?? null;

  const normalizedPlanType = planType?.trim().toLowerCase() || "";
  const hasPaidPlan =
    normalizedPlanType !== "" && normalizedPlanType !== "free";
  const createShouldGateByCredits = shouldBlockCreateTaskByCredits({
    remainingCredits,
    strictQuotaGate,
    hasPaidPlan,
    isInFreePlanTime: Boolean(plan?.isInFreePlanTime),
  });
  const createQuotaGatePending = createShouldGateByCredits && isNew === null;
  const createQuotaGateMode: "trial" | "pricing" | null =
    createShouldGateByCredits && isNew !== null
      ? isNew
        ? "trial"
        : "pricing"
      : null;
  const handleCreateRequest = useCallback(() => {
    if (createQuotaGatePending) {
      message.info(
        t("Checking your trial eligibility. Please try again in a moment."),
      );
      return;
    }
    setCreateConfirmOpen(true);
  }, [createQuotaGatePending, t]);

  const handleCreateConfirm = useCallback(async () => {
    if (createQuotaGatePending) {
      message.info(
        t("Checking your trial eligibility. Please try again in a moment."),
      );
      return;
    }
    if (createQuotaGateMode !== null) return;

    setCreateConfirmOpen(false);
    const normalizedPlanType = planType?.trim().toLowerCase() || "";
    const hasPaidPlan =
      normalizedPlanType !== "" && normalizedPlanType !== "free";
    const remainingCredits = normalizedQuota?.remaining ?? null;
    if (remainingCredits == null) {
      message.info(t("v4.create.quotaUnavailable"));
      return;
    }
    const shouldGateByCredits = shouldBlockCreateTaskByCredits({
      remainingCredits,
      strictQuotaGate,
      hasPaidPlan,
      isInFreePlanTime: Boolean(plan?.isInFreePlanTime),
    });

    if (shouldGateByCredits) {
      return;
    }

    setCreating(true);
    const trace = startClientLogTrace({
      event: "translate_v4_create_tasks",
      action: "create_tasks",
      shop,
      context: {
        source,
        targets,
        moduleKeys,
        aiModel,
        isCover,
        isHandle,
      },
    });
    try {
      const result = await createTranslateV4Tasks({
        source,
        targets,
        modules: expandV2ModuleKeys(moduleKeys),
        aiModel,
        isCover,
        isHandle,
        targetOptions,
        shop,
      });

      if (result.validationError) {
        finishClientLogTrace(trace, {
          level: "warn",
          status: "failure",
          message: result.validationError,
        });
        message.warning(translateV4Message(result.validationError, t));
        return;
      }

      const summary = formatV4CreateTasksMessage(result, t, localeRegionCode);
      if (result.created.length > 0) {
        message.success(`${summary} ${t("v4.create.createdBelow")}`);
        await Promise.all([refreshList(), refreshQuota()]);
        setActiveWorkbenchTab("tasks");
        setSpotlightTaskIds(result.created.map((item) => item.jobId));
      } else {
        message.error(summary);
      }

      finishClientLogTrace(trace, {
        level:
          result.failed.length > 0
            ? result.created.length > 0
              ? "warn"
              : "error"
            : "info",
        status:
          result.failed.length > 0 && result.created.length === 0
            ? "failure"
            : "success",
        message: summary,
        context: {
          created: result.created.map((item) => item.target),
          failed: result.failed.map((item) => ({
            target: item.target,
            error: item.error,
          })),
        },
      });

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
      finishClientLogTrace(trace, {
        level: "error",
        status: "failure",
        error: err,
      });
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
    shop,
    refreshList,
    refreshQuota,
    plan,
    planType,
    normalizedQuota,
    strictQuotaGate,
    t,
    createQuotaGateMode,
    createQuotaGatePending,
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

  const createTaskSectionRef = useRef<HTMLDivElement | null>(null);
  const taskQueueSectionRef = useRef<HTMLDivElement | null>(null);

  const untranslatedRatioByLocale = useMemo(
    () => buildUntranslatedRatioByLocale(coverage.locales),
    [coverage.locales],
  );
  const taskEstimate = useCreateTaskEstimate({
    modules: moduleKeys,
    targets,
    isCover,
    untranslatedRatioByLocale,
    remainingCredits,
  });
  const createConfirmScenario:
    | "ready"
    | "insufficient_paid"
    | "insufficient_trial"
    | "insufficient_pricing" =
    taskEstimate.needsMoreCredits
      ? hasPaidPlan
        ? "insufficient_paid"
        : createQuotaGateMode === "trial"
          ? "insufficient_trial"
          : "insufficient_pricing"
      : "ready";

  useEffect(() => {
    if (spotlightTaskIds.length === 0) return;
    if (typeof window === "undefined") return;
    setActiveWorkbenchTab("tasks");

    const scrollTimer = window.setTimeout(() => {
      taskQueueSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 140);
    const clearTimer = window.setTimeout(() => {
      setSpotlightTaskIds([]);
    }, 7_000);

    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(clearTimer);
    };
  }, [spotlightTaskIds]);

  const openLanguagePage = useCallback(() => {
    navigate("/app/language");
  }, [navigate]);

  return (
    <Page>
      <TitleBar title={t("v4.title")} />
      <Profiler
        id="translate-v4.page"
        onRender={(id, phase, actualDuration, baseDuration, startTime, commitTime) => {
          if (!perfDebugEnabled) return;
          logReactProfilerRender(
            id,
            phase,
            actualDuration,
            baseDuration,
            startTime,
            commitTime,
          );
        }}
      >
        <div className="v4-page" style={v4ContentStyle}>
          <div className="v4-enter">
            <PageHeaderBar credits={remainingCredits} planType={planType} />
          </div>

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

            <div
              className="v4-enter v4-enter-d2"
              style={workbenchTabsShellStyle}
            >
              <div
                role="tablist"
                aria-label={t("v4.title")}
                style={workbenchTabListStyle}
              >
                <button
                  id="v4-workbench-tab-create"
                  type="button"
                  role="tab"
                  aria-selected={activeWorkbenchTab === "create"}
                  aria-controls="v4-workbench-panel-create"
                  onClick={() => setActiveWorkbenchTab("create")}
                  style={workbenchTabButtonStyle(
                    activeWorkbenchTab === "create",
                  )}
                >
                  {t("v4.createTask.title")}
                </button>
                <button
                  id="v4-workbench-tab-tasks"
                  type="button"
                  role="tab"
                  aria-selected={activeWorkbenchTab === "tasks"}
                  aria-controls="v4-workbench-panel-tasks"
                  onClick={() => setActiveWorkbenchTab("tasks")}
                  style={workbenchTabButtonStyle(
                    activeWorkbenchTab === "tasks",
                  )}
                >
                  {t("v4.tasks.title", { count: currentJobCount })}
                </button>
              </div>

              <div
                id="v4-workbench-panel-create"
                role="tabpanel"
                aria-labelledby="v4-workbench-tab-create"
                hidden={activeWorkbenchTab !== "create"}
                style={workbenchPanelStyle(activeWorkbenchTab === "create")}
              >
                <div ref={createTaskSectionRef}>
                  <CreateTaskCard
                    targetOptions={targetOptions}
                    targets={targets}
                    onTargetsChange={setTargets}
                    modules={moduleKeys}
                    onModulesChange={setModuleKeys}
                    creating={creating}
                    createDisabled={normalizedQuota == null}
                    disabledMessage={createDisabledMessage}
                    onCreate={handleCreateRequest}
                    aiModel={aiModel}
                    onAiModelChange={setAiModel}
                    isCover={isCover}
                    onIsCoverChange={setIsCover}
                    isHandle={isHandle}
                    onIsHandleChange={setIsHandle}
                    estimate={taskEstimate}
                  />
                </div>
              </div>

              <div
                id="v4-workbench-panel-tasks"
                role="tabpanel"
                aria-labelledby="v4-workbench-tab-tasks"
                hidden={activeWorkbenchTab !== "tasks"}
                style={workbenchPanelStyle(activeWorkbenchTab === "tasks")}
              >
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
                    spotlightTaskIds={spotlightTaskIds}
                    translateSlotBusy={translateSlotBusy}
                    onBuyCredits={() => setShowPaymentModal(true)}
                    onAction={handleAction}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Profiler>

      <CreateTaskConfirmModal
        open={createConfirmOpen}
        creating={creating}
        targetOptions={targetOptions}
        targets={targets}
        modules={moduleKeys}
        aiModel={aiModel}
        isCover={isCover}
        isHandle={isHandle}
        estimate={taskEstimate}
        scenario={createConfirmScenario}
        previousTotalChars={
          typeof totalChars === "number" ? totalChars : undefined
        }
        onClose={() => setCreateConfirmOpen(false)}
        onConfirmCreate={handleCreateConfirm}
        onBuyCredits={() => {
          setCreateConfirmOpen(false);
          setShowPaymentModal(true);
        }}
      />
      {showPaymentModal ? (
        <Suspense fallback={null}>
          <PaymentModal
            visible={showPaymentModal}
            setVisible={setShowPaymentModal}
            variant="v4"
          />
        </Suspense>
      ) : null}
    </Page>
  );
}

const workbenchTabsShellStyle: CSSProperties = {
  display: "grid",
  gap: 14,
};

const workbenchTabListStyle: CSSProperties = {
  display: "inline-flex",
  flexWrap: "wrap",
  gap: 8,
  padding: 4,
  borderRadius: 999,
  background: "var(--app-color-surface-secondary)",
  alignSelf: "flex-start",
};

function workbenchTabButtonStyle(active: boolean): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    maxWidth: "100%",
    minHeight: 36,
    padding: "8px 14px",
    borderRadius: 999,
    border: "none",
    background: active ? "var(--app-color-surface)" : "transparent",
    color: active ? "var(--app-color-text)" : "var(--app-color-text-secondary)",
    boxShadow: active ? "var(--app-shadow-card)" : "none",
    fontSize: 13,
    fontWeight: active ? 600 : 500,
    lineHeight: 1.35,
    textAlign: "center",
    whiteSpace: "normal",
    overflowWrap: "anywhere",
    transition: "all 0.2s ease",
    cursor: "pointer",
    fontFamily: "inherit",
  };
}

function workbenchPanelStyle(active: boolean): CSSProperties {
  return {
    display: active ? "block" : "none",
    minWidth: 0,
  };
}
