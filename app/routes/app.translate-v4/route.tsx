import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { message } from "antd";
import { TitleBar } from "@shopify/app-bridge-react";
import { Page } from "@shopify/polaris";
import { defer, redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { authenticate } from "~/shopify.server";
import { isShopMigrated } from "~/server/translateV4/migration.server";
import { listV4JobSummaries } from "~/server/translateV4/progress.server";
import type { TranslationJobProgressSummary } from "~/server/translateV4/progress.server";
import { getShopQuota, type ShopQuota } from "~/server/translateV4/quota.server";
import { getCoverageSummaryFromCache,
  type CoverageSummary,
} from "~/server/translateV4/coverage.server";
import {
  createTranslateV4Tasks,
  formatCreateTasksMessage,
  type ShopLocaleOption,
} from "~/lib/createTranslateV4Tasks";
import { SupportChatWidget } from "./SupportChatWidget";
import { DEFAULT_MODULE_KEYS, DEFAULT_AI_MODEL } from "./constants";
import { expandV2ModuleKeys } from "~/server/translateV4/moduleCatalog";
import { v4ContentStyle, V4_OVERVIEW_CARD_MIN_HEIGHT } from "./v4Styles";
import { PageHeaderBar, SummaryDonutCard } from "./components/SummaryAndHeader";
import { CreateTaskCard } from "./components/CreateTaskCard";
import { TaskQueueSection } from "./components/TaskQueueSection";
import { CoverageCard } from "./components/CoverageCard";
import { localeRegionCode } from "./localeDisplay";
import { notifyTranslationStatsUpdated } from "~/lib/translationStatsSync";
import { selectShopTargetLocales } from "~/lib/shopTargetLocales";
import { syncShopTargetLocalesFromShopify } from "~/server/translateV4/targetLocale.server";
import { loadShopLocalesForTranslation } from "~/server/translateV4/shopLocales.server";
import { GetUserSubscriptionPlan } from "~/api/JavaServer";

async function loadSubscriptionPlanType(shop: string): Promise<string | null> {
  const server = process.env.SERVER_URL?.trim();
  if (!server) return null;

  try {
    const result = await GetUserSubscriptionPlan({ shop, server });
    if (!result?.success) return null;

    const planType = result?.response?.planType;
    return typeof planType === "string" && planType.trim() ? planType.trim() : null;
  } catch (err) {
    console.error("[translateV4] loadSubscriptionPlanType failed:", err);
    return null;
  }
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  if (!(await isShopMigrated(session.shop))) {
    throw redirect("/app");
  }

  let locales: ShopLocaleOption[] = [];
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

  // 关键内容（任务列表 + 覆盖率，均为内部 DB/Redis）阻塞等待；
  // quota / planType 是较慢的 Java HTTP 调用且仅用于头部徽标，改为流式返回。
  const [jobs, coverage] = await Promise.all([
    listV4JobSummaries(session.shop),
    getCoverageSummaryFromCache({
      shop: session.shop,
      primaryLocale,
      targetLocales,
    }),
  ]);

  return defer({
    shop: session.shop,
    locales,
    primaryLocale,
    jobs,
    coverage,
    quota: getShopQuota(session.shop),
    planType: loadSubscriptionPlanType(session.shop),
  });
};

export default function AppTranslateV4() {
  const navigate = useNavigate();
  const {
    shop,
    locales,
    primaryLocale,
    jobs: initialJobs,
    quota: quotaPromise,
    coverage: initialCoverage,
    planType: planTypePromise,
  } = useLoaderData<typeof loader>();

  const [jobs, setJobs] = useState<TranslationJobProgressSummary[]>(initialJobs);
  const [quota, setQuota] = useState<ShopQuota | null>(null);
  const [planType, setPlanType] = useState<string | null>(null);
  const [coverage, setCoverage] = useState<CoverageSummary>(initialCoverage);

  // quota / planType 由 loader 流式返回，到达后填充（不阻塞首屏）。
  useEffect(() => {
    let active = true;
    Promise.resolve(quotaPromise)
      .then((q) => {
        if (active) setQuota(q);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [quotaPromise]);

  useEffect(() => {
    let active = true;
    Promise.resolve(planTypePromise)
      .then((p) => {
        if (active) setPlanType(p);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [planTypePromise]);
  const [coverageLoading, setCoverageLoading] = useState(false);
  const [coverageExpanded, setCoverageExpanded] = useState(false);
  const source = primaryLocale || "en";

  const localeOptions = useMemo(
    () =>
      locales.length
        ? locales
        : [{ value: "zh-CN", label: "中文 (zh-CN)", primary: true, published: true }],
    [locales],
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

  const refreshCoverage = useCallback(async (forceRefresh = true) => {
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
      if (forceRefresh) message.error("刷新统计失败");
    } finally {
      setCoverageLoading(false);
    }
  }, [shop, targetOptions]);

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
              ? "已删除"
              : actionType === "resume"
                ? "正在继续…"
                : actionType === "pause"
                  ? data.pending
                    ? "正在暂停…"
                    : "已暂停"
                  : data.pending
                    ? "正在取消…"
                    : "已取消";
          message.success(label);
          await Promise.all([refreshList(), refreshQuota()]);
          return true;
        }
        message.error(data?.error || "操作失败");
        return false;
      } catch (err) {
        console.error("[translateV4] task action failed:", err);
        message.error("操作失败，请稍后重试");
        return false;
      }
    },
    [shop, refreshList, refreshQuota],
  );

  const handleCreate = useCallback(async () => {
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
        message.warning(result.validationError);
        return;
      }

      const summary = formatCreateTasksMessage(result);
      if (result.created.length > 0) {
        message.success(summary);
        await Promise.all([refreshList(), refreshQuota()]);
      } else {
        message.error(summary);
      }

      if (result.failed.length > 0 && result.created.length > 0) {
        message.warning(
          result.failed.map((f) => `${localeRegionCode(f.target)}: ${f.error}`).join("；"),
          6,
        );
      }
    } catch (err) {
      console.error("[translateV4] create failed:", err);
      message.error("创建失败，请稍后重试");
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
  ]);

  const jobsRef = useRef(jobs);
  jobsRef.current = jobs;

  useEffect(() => {
    const timer = setInterval(() => {
      const hasActive = jobsRef.current.some((j) => !j.isTerminal);
      if (!hasActive) return;
      void refreshList();
      void refreshQuota();
    }, 3000);
    return () => clearInterval(timer);
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

  return (
    <Page>
      <TitleBar title="智能翻译" />
      <div style={v4ContentStyle}>
        <div className="v4-enter">
          <PageHeaderBar
            credits={remainingCredits}
            planType={planType}
          />
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
              border: "1px solid rgba(84, 103, 255, 0.12)",
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
                ? `正在翻译一种语言，另有 ${translateQueue.length} 个语言任务排队等待（初始化可并行，翻译串行执行）。`
                : `${translateQueue.length} 个语言任务等待开始翻译。`}
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
              <SummaryDonutCard
                summary={coverage}
                compact
              />
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
              onAction={handleAction}
            />
          </div>
        </div>
      </div>

      <SupportChatWidget />
    </Page>
  );
}
