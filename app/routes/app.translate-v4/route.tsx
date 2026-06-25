import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, message } from "antd";
import { TitleBar } from "@shopify/app-bridge-react";
import { json, redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { authenticate } from "~/shopify.server";
import { isTranslateV4Enabled, isTranslateV4ShopAllowed } from "~/server/translateV4/feature.server";
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
import { v4PageStyle } from "./v4Styles";
import { PageHeaderBar, SummaryDonutCard } from "./components/SummaryAndHeader";
import { CreateTaskCard } from "./components/CreateTaskCard";
import { TaskQueueSection } from "./components/TaskQueueSection";
import { CoverageCard } from "./components/CoverageCard";
import { notifyTranslationStatsUpdated } from "~/lib/translationStatsSync";

const SHOP_LOCALES_QUERY = `#graphql
  query TranslateV4ShopLocales {
    shopLocales {
      locale
      name
      primary
      published
    }
  }
`;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (!isTranslateV4Enabled()) {
    throw redirect("/app");
  }

  const { admin, session } = await authenticate.admin(request);

  if (!isTranslateV4ShopAllowed(session.shop)) {
    throw redirect("/app");
  }

  let locales: ShopLocaleOption[] = [];
  let primaryLocale = "zh-CN";
  try {
    const res = await admin.graphql(SHOP_LOCALES_QUERY);
    const payload = (await res.json()) as {
      data?: {
        shopLocales?: Array<{
          locale: string;
          name: string;
          primary: boolean;
          published: boolean;
        }> | null;
      };
    };
    const rows = payload.data?.shopLocales ?? [];
    locales = rows.map((r) => ({
      value: r.locale,
      label: `${r.name} (${r.locale})`,
      primary: r.primary,
      published: r.published,
    }));
    primaryLocale = rows.find((r) => r.primary)?.locale ?? primaryLocale;
  } catch (err) {
    console.error("[translateV4] load shopLocales failed:", err);
  }

  const targetLocales = locales.filter((l) => !l.primary && l.published);

  const [jobs, quota, coverage] = await Promise.all([
    listV4JobSummaries(session.shop),
    getShopQuota(session.shop),
    getCoverageSummaryFromCache({
      shop: session.shop,
      primaryLocale,
      targetLocales,
    }),
  ]);

  return json({
    shop: session.shop,
    locales,
    primaryLocale,
    jobs,
    quota,
    coverage,
  });
};

export default function AppTranslateV4() {
  const {
    shop,
    locales,
    primaryLocale,
    jobs: initialJobs,
    quota: initialQuota,
    coverage: initialCoverage,
  } = useLoaderData<typeof loader>();

  const [jobs, setJobs] = useState<TranslationJobProgressSummary[]>(initialJobs);
  const [quota, setQuota] = useState<ShopQuota | null>(initialQuota);
  const [coverage, setCoverage] = useState<CoverageSummary>(initialCoverage);
  const [coverageLoading, setCoverageLoading] = useState(false);
  const source = primaryLocale || "zh-CN";
  const [targets, setTargets] = useState<string[]>([]);
  const [moduleKeys, setModuleKeys] = useState<string[]>(DEFAULT_MODULE_KEYS);
  const [aiModel, setAiModel] = useState<string>(DEFAULT_AI_MODEL);
  const [isCover, setIsCover] = useState(false);
  const [isHandle, setIsHandle] = useState(false);
  const [creating, setCreating] = useState(false);

  const localeOptions = useMemo(
    () =>
      locales.length
        ? locales
        : [{ value: "zh-CN", label: "中文 (zh-CN)", primary: true, published: true }],
    [locales],
  );

  const sourceLocaleOption = useMemo(
    () => localeOptions.find((l) => l.value === source),
    [localeOptions, source],
  );

  const targetOptions = useMemo(
    () => localeOptions.filter((l) => l.value !== source && l.published),
    [localeOptions, source],
  );

  const refreshCoverage = useCallback(async (forceRefresh = true) => {
    setCoverageLoading(true);
    try {
      const refreshParam = forceRefresh ? "&refresh=1" : "";
      const res = await fetch(
        `/api/translate-v4/coverage?shopName=${encodeURIComponent(shop)}${refreshParam}`,
      );
      const data = await res.json();
      if (data?.ok) {
        setCoverage(data.summary as CoverageSummary);
      } else if (forceRefresh) {
        message.error(data?.error || "刷新统计失败");
      }
    } catch (err) {
      console.error("[translateV4] refresh coverage failed:", err);
      if (forceRefresh) message.error("刷新统计失败");
    } finally {
      setCoverageLoading(false);
    }
  }, [shop]);

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
          result.failed.map((f) => `${f.target}: ${f.error}`).join("；"),
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
    void refreshCoverage(true);
  }, [initialCoverage.locales, refreshCoverage]);

  const translateSlotBusy = useMemo(
    () => jobs.some((j) => j.status === "TRANSLATING" || j.isStopping),
    [jobs],
  );

  const translateQueue = useMemo(
    () => jobs.filter((j) => !j.isTerminal && j.status === "TRANSLATE_QUEUED"),
    [jobs],
  );

  const remainingCredits = quota?.remaining ?? null;

  return (
    <div style={v4PageStyle}>
      <TitleBar title="智能翻译" />

      <PageHeaderBar shop={shop} credits={remainingCredits} />

      {translateQueue.length > 0 ? (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16, borderRadius: 12 }}
          message={
            translateSlotBusy
              ? `正在翻译一种语言，另有 ${translateQueue.length} 个语言任务排队等待（初始化可并行，翻译串行执行）。`
              : `${translateQueue.length} 个语言任务等待开始翻译。`
          }
        />
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto minmax(0, 1fr)",
          gap: 16,
          marginBottom: 16,
          alignItems: "stretch",
        }}
      >
        <SummaryDonutCard summary={coverage} />
        <CreateTaskCard
          source={source}
          sourceLabel={sourceLocaleOption?.label ?? source}
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
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 0.8fr)",
          gap: 16,
        }}
      >
        <TaskQueueSection
          jobs={jobs}
          translateSlotBusy={translateSlotBusy}
          onAction={handleAction}
        />
        <CoverageCard
          locales={coverage.locales}
          loading={coverageLoading}
          onRefresh={refreshCoverage}
        />
      </div>

      <SupportChatWidget />
    </div>
  );
}
