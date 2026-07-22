import { TitleBar } from "@shopify/app-bridge-react";
import { Page, Banner } from "@shopify/polaris";
import { Spin } from "antd";
import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import useReport from "scripts/eventReport";
import { authenticate } from "~/shopify.server";
import {
  invalidateShopLocalesCache,
  loadShopLocalesForTranslation,
} from "~/server/translateV4/shopLocales.server";
import type { TrialProductSummary } from "~/server/trialTranslate/product.server";
import { searchTrialProducts } from "~/server/trialTranslate/product.server";
import { ensureTrialLocaleEnabledAndPublished } from "~/server/trialTranslate/locale.server";
import {
  TrialCreateCard,
  type TrialLocaleOption,
  type TrialLocaleStatus,
  type TrialProductOption,
} from "./components/TrialCreateCard";
import {
  TrialPreviewPanels,
  type TrialVisibleFields,
} from "./components/TrialPreviewPanels";
import { TrialProgressCard } from "./components/TrialProgressCard";
import { TrialWelcomeIntro } from "./components/TrialWelcomeIntro";
import AppSectionCard from "~/ui/components/AppSectionCard";
import AppPageHeader from "~/ui/components/AppPageHeader";
import AppStatusBadge from "~/ui/components/AppStatusBadge";
import { OnboardingProgressBar } from "~/components/OnboardingProgressBar";
import { loadOnboardingWizardComplete } from "~/server/onboarding/progress.server";
import { onboardingReadyHref } from "~/lib/onboardingProgress";
import { withEmbeddedSearch } from "~/utils/embeddedAction";
import { loadShopifyAvailableLocales } from "~/server/trialTranslate/availableLocales.server";
import { listV4JobSummaries } from "~/server/translateV4/progress.server";
import type { TranslationJobProgressSummary } from "~/server/translateV4/progress.server";
import { TS_FRONTEND_TRIAL_TASK_SOURCE } from "~/server/translateV4/types";
import { loadOnboardingProgress } from "~/server/onboarding/progress.server";
import type { OnboardingProgress } from "~/lib/onboardingProgress";

type ShopLocaleOption = {
  value: string;
  label: string;
  primary: boolean;
  published: boolean;
};

type AvailableLocaleOption = {
  isoCode: string;
  name: string;
};

type LoaderData = {
  shop: string;
  ciwiSwitcherId: string;
  primaryLocale: string;
  localeOptions: ShopLocaleOption[];
  availableLocales: AvailableLocaleOption[];
  /** 进入页时恢复的最近试译任务（刷新不丢进度）。 */
  resumeTaskId: string | null;
  /** 无进行中任务时预取的首个商品，作为默认选中降低首步门槛。 */
  defaultProduct: TrialProductOption | null;
  onboardingProgress: OnboardingProgress | null;
};

type EnsureLocaleActionData = {
  ok: boolean;
  locale?: string;
  published?: boolean;
  localeOptions?: ShopLocaleOption[];
  primaryLocale?: string;
  error?: string;
};

type CreateTaskResponse = {
  ok: boolean;
  jobId?: string;
  error?: string;
};

type PreviewResponse = {
  ok: boolean;
  error?: string;
  job?: {
    id: string;
    status: string;
    source: string;
    target: string;
    productId: string;
    errorMessage: string | null;
  };
  summary?: TranslationJobProgressSummary | null;
  product?: TrialProductSummary | null;
  preview?: {
    visible: TrialVisibleFields;
  } | null;
  storefrontUrl?: string | null;
  localizedStorefrontUrl?: string | null;
  previewReady?: boolean;
};

type SaveResponse = {
  ok: boolean;
  error?: string;
  status?: string;
  alreadySaved?: boolean;
  alreadySaving?: boolean;
  localeOptions?: ShopLocaleOption[];
  primaryLocale?: string;
};

const STATUS_ORDER: Record<TrialLocaleStatus, number> = {
  published: 0,
  unpublished: 1,
  missing: 2,
  primary: 3,
};

/**
 * 纯新店（没有已发布语言）时的默认推荐目标语言优先级。
 * 命中即预选，让新人不必先在下拉里翻找。
 */
const RECOMMENDED_LOCALE_PRIORITY = [
  "en",
  "es",
  "fr",
  "de",
  "ja",
  "zh-CN",
  "pt-BR",
  "it",
];

/** 优先店铺已启用语言；否则按推荐优先级；再退化到首个非主语言。 */
function pickDefaultTarget(
  options: TrialLocaleOption[],
): string | null {
  const firstEnabled = options.find(
    (o) => o.status === "published" || o.status === "unpublished",
  );
  if (firstEnabled) return firstEnabled.value;

  const selectable = options.filter((o) => o.status !== "primary");
  for (const code of RECOMMENDED_LOCALE_PRIORITY) {
    const hit = selectable.find((o) => o.value === code);
    if (hit) return hit.value;
  }
  return selectable[0]?.value ?? null;
}

/** 跳过已取消；优先最近一条可继续的试译。 */
function pickResumeTrialTaskId(
  jobs: TranslationJobProgressSummary[],
): string | null {
  const hit = jobs.find((j) => j.status !== "CANCELLED");
  return hit?.taskId ?? null;
}

function buildTrialLocaleOptions(
  shopLocales: ShopLocaleOption[],
  primaryLocale: string,
  availableLocales: AvailableLocaleOption[],
): TrialLocaleOption[] {
  const shopByLocale = new Map(shopLocales.map((o) => [o.value, o]));

  const options: TrialLocaleOption[] = availableLocales.map((avail) => {
    const code = avail.isoCode;
    const shop = shopByLocale.get(code);
    let status: TrialLocaleStatus = "missing";
    if (shop?.primary || code === primaryLocale) status = "primary";
    else if (shop?.published) status = "published";
    else if (shop) status = "unpublished";

    return {
      value: code,
      label: shop?.label?.split("(")[0]?.trim() || avail.name,
      status,
    };
  });

  // 店铺已启用但不在 availableLocales 返回里的（极少见）仍展示，避免丢选项
  for (const shop of shopLocales) {
    if (options.some((o) => o.value === shop.value)) continue;
    options.push({
      value: shop.value,
      label: shop.label.split("(")[0]?.trim() || shop.value,
      status: shop.primary
        ? "primary"
        : shop.published
          ? "published"
          : "unpublished",
    });
  }

  return options.sort((a, b) => {
    const byStatus = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (byStatus !== 0) return byStatus;
    return a.label.localeCompare(b.label);
  });
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const url = new URL(request.url);

  // 引导已结束：试译不再作为主路径。
  const wizard = await loadOnboardingWizardComplete(session.shop);
  if (wizard.complete) {
    throw redirect(
      withEmbeddedSearch(onboardingReadyHref(wizard.locale), url.search),
    );
  }

  const [locales, availableLocales, trialJobs, firstProductPage] =
    await Promise.all([
      loadShopLocalesForTranslation({
        shop: session.shop,
        accessToken: session.accessToken ?? "",
      }),
      loadShopifyAvailableLocales(admin),
      listV4JobSummaries(session.shop, {
        limit: 10,
        taskSource: TS_FRONTEND_TRIAL_TASK_SOURCE,
        escalateStuck: false,
      }).catch((err) => {
        console.error("[trial-translate] list jobs failed:", err);
        return [] as TranslationJobProgressSummary[];
      }),
      searchTrialProducts(admin, {}).catch((err) => {
        console.error("[trial-translate] prefetch product failed:", err);
        return null;
      }),
    ]);
  const resumeTaskId = pickResumeTrialTaskId(trialJobs);
  // 默认商品优先选「已发布到网上商店」的（有 onlineStoreUrl），
  // 否则试译完成后无法在店面查看；没有已发布商品时退回第一个。
  const prefetchedProducts = firstProductPage?.products ?? [];
  const firstProduct =
    prefetchedProducts.find((p) => Boolean(p.onlineStoreUrl)) ??
    prefetchedProducts[0] ??
    null;
  const defaultProduct: TrialProductOption | null = firstProduct
    ? {
        id: firstProduct.id,
        title: firstProduct.title || firstProduct.id,
        imageUrl: firstProduct.imageUrl,
      }
    : null;
  const resumeTarget =
    trialJobs.find((j) => j.taskId === resumeTaskId)?.target ?? null;
  const onboardingProgress = await loadOnboardingProgress({
    shop: session.shop,
    locale: resumeTarget,
    trialJobs,
    preferStarter: false,
  });
  return json<LoaderData>({
    shop: session.shop,
    ciwiSwitcherId: process.env.SHOPIFY_CIWI_SWITCHER_ID ?? "",
    primaryLocale: locales.primaryLocale,
    localeOptions: locales.localeOptions,
    availableLocales,
    resumeTaskId,
    defaultProduct,
    onboardingProgress,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");

  if (intent === "ensureLocale") {
    const locale = String(formData.get("locale") || "").trim();
    const available = await loadShopifyAvailableLocales(admin);
    if (!available.some((l) => l.isoCode === locale)) {
      return json(
        { ok: false as const, error: "trial.validation.selectTarget" },
        { status: 400 },
      );
    }
    const loaded = await loadShopLocalesForTranslation({
      shop: session.shop,
      accessToken: session.accessToken ?? "",
    });
    const result = await ensureTrialLocaleEnabledAndPublished({
      shop: session.shop,
      accessToken: session.accessToken ?? "",
      admin,
      locale,
      primaryLocale: loaded.primaryLocale,
    });
    if (!result.ok) {
      return json(
        { ok: false as const, error: result.error },
        { status: 400 },
      );
    }
    invalidateShopLocalesCache(session.shop);
    const refreshed = await loadShopLocalesForTranslation({
      shop: session.shop,
      accessToken: session.accessToken ?? "",
    });
    return json({
      ok: true as const,
      locale: result.locale,
      published: true,
      localeOptions: refreshed.localeOptions,
      primaryLocale: refreshed.primaryLocale,
    } satisfies EnsureLocaleActionData);
  }

  return json({ ok: false, error: "unknown_intent" }, { status: 400 });
};

function statusToneFor(
  status: string | null,
): "neutral" | "info" | "success" | "caution" | "critical" {
  switch (status) {
    case "COMPLETED":
      return "success";
    case "TRANSLATE_DONE":
      return "info";
    case "FAILED":
    case "CANCELLED":
      return "critical";
    case "PAUSED":
      return "caution";
    case "INIT_QUEUED":
    case "INITIALIZING":
    case "TRANSLATE_QUEUED":
    case "TRANSLATING":
    case "WRITEBACK_QUEUED":
    case "WRITING_BACK":
      return "info";
    default:
      return "neutral";
  }
}

export default function TrialTranslatePage() {
  const { t } = useTranslation();
  const { report } = useReport();
  const loaderData = useLoaderData<typeof loader>();
  const {
    shop,
    ciwiSwitcherId,
    availableLocales,
    resumeTaskId,
    defaultProduct,
    onboardingProgress,
  } = loaderData;

  const localeFetcher = useFetcher<EnsureLocaleActionData>();
  const [selectedProduct, setSelectedProduct] =
    useState<TrialProductOption | null>(resumeTaskId ? null : defaultProduct);
  const [target, setTarget] = useState<string | null>(null);
  const [shopLocales, setShopLocales] = useState(loaderData.localeOptions);
  const [primaryLocale, setPrimaryLocale] = useState(loaderData.primaryLocale);
  const [taskId, setTaskId] = useState<string | null>(resumeTaskId);
  const [starting, setStarting] = useState(false);
  const [preparingLocale, setPreparingLocale] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null);

  const productId = selectedProduct?.id ?? null;

  const switcherThemeEditorUrl = useMemo(() => {
    if (!shop || !ciwiSwitcherId) return null;
    return `https://${shop}/admin/themes/current/editor?context=apps&activateAppId=${ciwiSwitcherId}/ciwi_I18n_Switcher`;
  }, [shop, ciwiSwitcherId]);

  const trialLocaleOptions = useMemo(
    () =>
      buildTrialLocaleOptions(shopLocales, primaryLocale, availableLocales),
    [shopLocales, primaryLocale, availableLocales],
  );

  const selectedLocale = trialLocaleOptions.find((o) => o.value === target);

  useEffect(() => {
    if (target) return;
    const next = pickDefaultTarget(trialLocaleOptions);
    if (next) setTarget(next);
  }, [target, trialLocaleOptions]);

  useEffect(() => {
    const data = localeFetcher.data;
    if (!data) return;
    if (data.ok && data.localeOptions) {
      setShopLocales(data.localeOptions);
      if (data.primaryLocale) setPrimaryLocale(data.primaryLocale);
      if (data.locale) setTarget(data.locale);
      setPreparingLocale(false);
      return;
    }
    if (data.ok === false) {
      setPreparingLocale(false);
      setError(t(data.error || "trial.error.addLanguageFailed"));
    }
  }, [localeFetcher.data, t, target]);

  const pollPreview = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(
          `/api/trial-translate/preview?taskId=${encodeURIComponent(id)}`,
        );
        const data = (await res.json()) as PreviewResponse;
        if (data.ok) {
          setPreviewData(data);
          if (data.job?.target) {
            setTarget(data.job.target);
          }
          if (data.product?.id) {
            setSelectedProduct({
              id: data.product.id,
              title: data.product.title,
              imageUrl: data.product.imageUrl,
            });
          } else if (data.job?.productId) {
            setSelectedProduct((prev) =>
              prev?.id === data.job!.productId
                ? prev
                : {
                    id: data.job!.productId,
                    title: prev?.title || data.job!.productId,
                    imageUrl: prev?.imageUrl ?? null,
                  },
            );
          }
        } else if (data.error) setError(t(data.error));
      } catch {
        // ignore transient poll errors
      }
    },
    [t],
  );

  useEffect(() => {
    if (!taskId) return;
    void pollPreview(taskId);
    const status = previewData?.job?.status;
    const terminal =
      status === "COMPLETED" ||
      status === "FAILED" ||
      status === "CANCELLED";
    if (terminal) return;
    const writingNow =
      status === "WRITEBACK_QUEUED" || status === "WRITING_BACK";
    const interval = setInterval(
      () => {
        void pollPreview(taskId);
      },
      writingNow || saving ? 1200 : 2500,
    );
    return () => clearInterval(interval);
  }, [taskId, previewData?.job?.status, pollPreview, saving]);

  const startTrialTask = async (locale: string | null) => {
    if (!productId || !locale) return;
    setStarting(true);
    setError(null);
    setPreviewData(null);
    void report(
      { productId, locale },
      { eventType: "click" },
      "trial_create_click",
    );
    try {
      const res = await fetch("/api/trial-translate/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          source: primaryLocale,
          target: locale,
        }),
      });
      const data = (await res.json()) as CreateTaskResponse;
      if (!data.ok || !data.jobId) {
        setError(t(data.error || "trial.error.createFailed"));
        return;
      }
      setTaskId(data.jobId);
      void report(
        { productId, locale, jobId: data.jobId },
        { eventType: "click" },
        "trial_create_ok",
      );
    } catch {
      setError(t("trial.error.createFailed"));
    } finally {
      setStarting(false);
    }
  };

  const handleStart = async () => {
    if (!productId || !target || !selectedLocale) return;
    if (selectedLocale.status === "primary") {
      setError(t("trial.validation.sameAsSource"));
      return;
    }

    await startTrialTask(target);
  };

  const handlePublishLocale = () => {
    if (!target || selectedLocale?.status === "primary") return;
    setPreparingLocale(true);
    setError(null);
    const fd = new FormData();
    fd.set("intent", "ensureLocale");
    fd.set("locale", target);
    localeFetcher.submit(fd, { method: "post" });
  };

  const handleSave = async () => {
    if (!taskId) return;
    setSaving(true);
    setError(null);
    void report(
      { taskId, locale: target },
      { eventType: "click" },
      "trial_save_click",
    );
    try {
      const res = await fetch("/api/trial-translate/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      const data = (await res.json()) as SaveResponse;
      if (!data.ok) {
        setError(t(data.error || "trial.error.saveFailed"));
        setSaving(false);
        return;
      }
      if (data.localeOptions) setShopLocales(data.localeOptions);
      if (data.primaryLocale) setPrimaryLocale(data.primaryLocale);
      void report(
        { taskId, locale: target },
        { eventType: "click" },
        "trial_save_ok",
      );
      await pollPreview(taskId);
    } catch {
      setError(t("trial.error.saveFailed"));
      setSaving(false);
    }
  };

  const jobStatus = previewData?.job?.status ?? null;
  /** 试译在确认保存前不会写回；进度阶段对外统一成「翻译中」。 */
  const displayJobStatus =
    jobStatus &&
    [
      "CREATED",
      "INIT_QUEUED",
      "INITIALIZING",
      "INIT_DONE",
      "TRANSLATE_QUEUED",
      "TRANSLATING",
    ].includes(jobStatus)
      ? "TRANSLATING"
      : jobStatus;
  const statusLabel = displayJobStatus
    ? t(`trial.status.${displayJobStatus}`, { defaultValue: displayJobStatus })
    : null;

  const canSave = jobStatus === "TRANSLATE_DONE";
  const saved = jobStatus === "COMPLETED";
  const writing =
    jobStatus === "WRITEBACK_QUEUED" || jobStatus === "WRITING_BACK";
  const isSaving = saving || writing;
  const jobSummary = previewData?.summary ?? null;
  const showProgress =
    Boolean(taskId) &&
    Boolean(jobSummary) &&
    jobStatus !== "FAILED" &&
    jobStatus !== "CANCELLED" &&
    !saved &&
    !previewData?.previewReady;

  const previewReadyReported = useRef(false);
  useEffect(() => {
    if (jobStatus !== "TRANSLATE_DONE" || previewReadyReported.current) return;
    previewReadyReported.current = true;
    void report(
      { taskId, locale: target },
      { eventType: "exposure" },
      "trial_preview_ready",
    );
  }, [jobStatus, taskId, target, report]);

  useEffect(() => {
    if (
      saving &&
      (jobStatus === "COMPLETED" ||
        jobStatus === "FAILED" ||
        jobStatus === "CANCELLED")
    ) {
      setSaving(false);
    }
  }, [saving, jobStatus]);

  const targetLabel =
    trialLocaleOptions.find(
      (o) => o.value === (previewData?.job?.target || target),
    )?.label ??
    previewData?.job?.target ??
    target;

  const progressLocale =
    previewData?.job?.target || target || onboardingProgress?.locale || null;

  return (
    <Page>
      <TitleBar title={t("trial.pageTitle")} />
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <OnboardingProgressBar
          shop={shop}
          initial={onboardingProgress}
          locale={progressLocale}
          overrides={{
            trialSaved: saved || Boolean(onboardingProgress?.trialSaved),
          }}
        />

        {error ? (
          <Banner tone="critical" onDismiss={() => setError(null)}>
            {error}
          </Banner>
        ) : null}

        {!taskId ? (
          <TrialWelcomeIntro />
        ) : (
          <AppPageHeader
            title={t("trial.title")}
            description={t("trial.description")}
          />
        )}

        <AppSectionCard
          title={
            !taskId ? t("trial.welcome.actionTitle") : undefined
          }
          description={
            !taskId ? t("trial.welcome.actionHint") : undefined
          }
          extra={
            taskId && statusLabel ? (
              <AppStatusBadge
                tone={statusToneFor(isSaving ? "WRITING_BACK" : displayJobStatus)}
              >
                {isSaving ? t("trial.status.WRITING_BACK") : statusLabel}
              </AppStatusBadge>
            ) : undefined
          }
        >
          <TrialCreateCard
            selectedProduct={selectedProduct}
            onProductChange={setSelectedProduct}
            localeOptions={trialLocaleOptions}
            target={target}
            onTargetChange={setTarget}
            statusLabel={null}
            statusTone={statusToneFor(isSaving ? "WRITING_BACK" : displayJobStatus)}
            starting={starting}
            preparingLocale={false}
            startDisabled={
              !productId ||
              !target ||
              starting ||
              isSaving ||
              selectedLocale?.status === "primary"
            }
            onStart={handleStart}
            compactHeader
          />
        </AppSectionCard>

        {showProgress && jobSummary ? (
          <AppSectionCard title={t("trial.progressTitle")}>
            <TrialProgressCard summary={jobSummary} />
          </AppSectionCard>
        ) : null}

        {taskId && !jobSummary && !previewData?.previewReady && jobStatus !== "FAILED" ? (
          <AppSectionCard title={t("trial.progressTitle")}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <Spin />
              <div style={{ minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    color: "var(--app-color-text)",
                    fontSize: 13,
                    lineHeight: "18px",
                  }}
                >
                  {t("trial.progressHint")}
                </p>
                <p
                  style={{
                    margin: "4px 0 0",
                    color: "var(--app-color-text-secondary)",
                    fontSize: 12,
                    lineHeight: "18px",
                  }}
                >
                  {t("trial.progressEta")}
                </p>
              </div>
            </div>
          </AppSectionCard>
        ) : null}

        {previewData?.preview?.visible ? (
          <AppSectionCard title={t("trial.previewTitle")}>
            <TrialPreviewPanels
              imageUrl={previewData.product?.imageUrl ?? null}
              visible={previewData.preview.visible}
              storefrontUrl={previewData.storefrontUrl ?? null}
              switcherThemeEditorUrl={switcherThemeEditorUrl}
              targetLabel={targetLabel}
              targetLocale={previewData?.job?.target || target}
              shop={shop}
              canSave={canSave}
              saving={isSaving}
              saved={saved}
              localePublished={selectedLocale?.status === "published"}
              publishingLocale={
                preparingLocale || localeFetcher.state !== "idle"
              }
              onPublishLocale={handlePublishLocale}
              onSave={handleSave}
            />
          </AppSectionCard>
        ) : null}

        {jobStatus === "FAILED" ? (
          <Banner tone="critical">
            {previewData?.job?.errorMessage || t("trial.error.failed")}
          </Banner>
        ) : null}
      </div>
    </Page>
  );
}
