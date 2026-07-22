import { TitleBar } from "@shopify/app-bridge-react";
import { Banner, Page } from "@shopify/polaris";
import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import {
  useFetcher,
  useLoaderData,
  useNavigate,
  useRevalidator,
  useSearchParams,
} from "@remix-run/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import useReport from "scripts/eventReport";
import { authenticate } from "~/shopify.server";
import {
  invalidateShopLocalesCache,
  loadShopLocalesForTranslation,
} from "~/server/translateV4/shopLocales.server";
import { loadShopifyAvailableLocales } from "~/server/trialTranslate/availableLocales.server";
import { ensureTrialLocaleEnabledAndPublished } from "~/server/trialTranslate/locale.server";
import type {
  LocaleShopState,
  OnboardingUpgradeOffer,
  StarterPackEstimate,
} from "~/lib/expandMarket";
import { buildStarterPackEstimate } from "~/server/expandMarket/starterPack.server";
import { buildOnboardingUpgradeOffer } from "~/server/expandMarket/onboardingOffer.server";
import { listV4JobSummaries } from "~/server/translateV4/progress.server";
import type { TranslationJobProgressSummary } from "~/server/translateV4/progress.server";
import { TS_FRONTEND_EXPAND_TASK_SOURCE } from "~/server/translateV4/types";
import { getAccountQuota } from "~/server/billing/quota/getAccountQuota.server";
import {
  listTargetLocales,
  setAutoTranslate,
} from "~/server/translateV4/targetLocale.server";
import {
  mutationAppPurchaseOneTimeCreate,
  mutationAppSubscriptionCreate,
} from "~/api/admin";
import AppPageHeader from "~/ui/components/AppPageHeader";
import AppSectionCard from "~/ui/components/AppSectionCard";
import {
  LanguageExpandPanel,
  type LocaleOption,
} from "./components/LanguageExpandPanel";
import { message } from "~/ui/message";
import { OnboardingProgressBar } from "~/components/OnboardingProgressBar";
import {
  loadOnboardingProgress,
  loadOnboardingWizardComplete,
} from "~/server/onboarding/progress.server";
import {
  onboardingReadyHref,
  type OnboardingProgress,
} from "~/lib/onboardingProgress";
import { withEmbeddedSearch } from "~/utils/embeddedAction";

type LoaderData = {
  shop: string;
  ciwiSwitcherId: string;
  primaryLocale: string;
  shopLocales: LocaleShopState[];
  availableLocales: Array<{ isoCode: string; name: string }>;
  jobs: TranslationJobProgressSummary[];
  starter: StarterPackEstimate;
  upgradeOffer: OnboardingUpgradeOffer;
  /** locale → 是否已开自动翻译（订后成功态持久化）。 */
  autoTranslateByLocale: Record<string, boolean>;
  onboardingProgress: OnboardingProgress | null;
};

type PrepareActionData = {
  ok: boolean;
  error?: string;
  shopLocales?: LocaleShopState[];
  primaryLocale?: string;
  starter?: StarterPackEstimate;
  upgradeOffer?: OnboardingUpgradeOffer;
};

type CreateTaskResponse = {
  ok: boolean;
  jobId?: string;
  error?: string;
};

type JobsResponse = {
  ok: boolean;
  jobs?: TranslationJobProgressSummary[];
};

function toShopLocales(
  rows: Array<{ locale: string; name: string; primary: boolean; published: boolean }>,
): LocaleShopState[] {
  return rows.map((r) => ({
    locale: r.locale,
    label: r.name || r.locale,
    published: r.published,
    primary: r.primary,
  }));
}

const isBillingTestMode = (): boolean =>
  process.env.BILLING_TEST === "true" ||
  process.env.NODE_ENV === "development" ||
  process.env.NODE_ENV === "test";

/**
 * 订阅/加量包 returnUrl：与定价页一致，优先 Admin 嵌入深链，
 * 才能准确回到开拓市场页；公网 SHOPIFY_APP_URL 易落在非嵌入上下文。
 */
function expandReturnUrl(shop: string, params: Record<string, string>): URL {
  const handle = (process.env.HANDLE || "").trim();
  const storeHandle = shop.split(".")[0] || "";
  const appBase = (process.env.SHOPIFY_APP_URL || "").replace(/\/$/, "");
  const returnUrl =
    handle && storeHandle
      ? new URL(
          `https://admin.shopify.com/store/${storeHandle}/apps/${handle}/app/expand-market`,
        )
      : appBase
        ? new URL(`${appBase}/app/expand-market`)
        : null;
  if (!returnUrl) {
    throw new Error("Missing HANDLE or SHOPIFY_APP_URL for billing returnUrl");
  }
  for (const [k, v] of Object.entries(params)) {
    if (v) returnUrl.searchParams.set(k, v);
  }
  return returnUrl;
}

function redirectToBillingConfirmation(confirmationUrl: string) {
  if (typeof window === "undefined") return false;
  try {
    window.open(confirmationUrl, "_top");
    return true;
  } catch {
    try {
      window.top!.location.href = confirmationUrl;
      return true;
    } catch {
      return false;
    }
  }
}

type BillingActionData = {
  ok: boolean;
  confirmationUrl?: string;
  error?: string;
};

async function buildUpgradeFromStarter(
  starter: StarterPackEstimate,
): Promise<OnboardingUpgradeOffer> {
  const productCredits =
    starter.estimatedCredits > 0
      ? starter.estimatedCredits
      : Math.max(1, starter.productCount * 2500);
  const fullStoreCredits =
    starter.fullStoreEstimatedCredits != null &&
    starter.fullStoreEstimatedCredits > 0
      ? starter.fullStoreEstimatedCredits
      : Math.ceil(productCredits * 2.5);
  return buildOnboardingUpgradeOffer({
    productCount: starter.productCount,
    productCredits,
    fullStoreCredits,
    usedShopScan: starter.usedShopScan,
    packs: starter.packs,
  });
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;
  const accessToken = session.accessToken ?? "";
  const url = new URL(request.url);
  const localeParam = url.searchParams.get("locale")?.trim() || null;

  // 引导已结束：试译/开拓不再作为主路径，送往语言就绪页。
  const wizard = await loadOnboardingWizardComplete(shop);
  if (wizard.complete) {
    throw redirect(
      withEmbeddedSearch(
        onboardingReadyHref(localeParam || wizard.locale),
        url.search,
      ),
    );
  }

  const [locales, availableLocales, jobs, quota, targetLocales] =
    await Promise.all([
      loadShopLocalesForTranslation({ shop, accessToken }),
      loadShopifyAvailableLocales(admin).catch((err) => {
        console.error("[expand-market] availableLocales failed:", err);
        return [] as Array<{ isoCode: string; name: string }>;
      }),
      listV4JobSummaries(shop, {
        limit: 30,
        taskSource: TS_FRONTEND_EXPAND_TASK_SOURCE,
        escalateStuck: false,
      }).catch((err) => {
        console.error("[expand-market] list jobs failed:", err);
        return [] as TranslationJobProgressSummary[];
      }),
      getAccountQuota(shop).catch((err) => {
        console.error("[expand-market] quota failed:", err);
        return null;
      }),
      listTargetLocales(shop).catch((err) => {
        console.error("[expand-market] targetLocales failed:", err);
        return [] as Array<{ locale: string; autoTranslate: boolean }>;
      }),
    ]);

  const starter = await buildStarterPackEstimate({
    shop,
    admin,
    remainingCredits: quota?.remainingCredits ?? 0,
  });
  const upgradeOffer = await buildUpgradeFromStarter(starter);
  const autoTranslateByLocale: Record<string, boolean> = {};
  for (const row of targetLocales) {
    autoTranslateByLocale[row.locale] = Boolean(row.autoTranslate);
  }

  const onboardingProgress = await loadOnboardingProgress({
    shop,
    locale: localeParam,
    expandJobs: jobs,
    autoTranslateByLocale,
    preferStarter: true,
  });

  return json({
    shop,
    ciwiSwitcherId: process.env.SHOPIFY_CIWI_SWITCHER_ID ?? "",
    primaryLocale: locales.primaryLocale,
    shopLocales: toShopLocales(locales.rows),
    availableLocales,
    jobs,
    starter,
    upgradeOffer,
    autoTranslateByLocale,
    onboardingProgress,
  } satisfies LoaderData);
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const adminAuth = await authenticate.admin(request);
  const { session, admin } = adminAuth;
  const form = await request.formData();
  const intent = String(form.get("intent") || "");

  const shop = session.shop;
  const accessToken = session.accessToken ?? "";

  if (intent === "buyPack") {
    const packName = String(form.get("packName") || "").trim();
    const amount = Number(form.get("amount") || 0);
    const currencyCode = String(form.get("currencyCode") || "USD").trim() || "USD";
    const locale = String(form.get("locale") || "").trim();
    if (!packName || !(amount > 0)) {
      return json(
        { ok: false, error: "expand.error.packInvalid" } satisfies BillingActionData,
        { status: 400 },
      );
    }

    let returnUrl: URL;
    try {
      returnUrl = expandReturnUrl(shop, { locale, purchased: "1" });
    } catch (err) {
      console.error("[expand-market] buyPack returnUrl failed:", err);
      return json(
        { ok: false, error: "expand.error.purchaseFailed" } satisfies BillingActionData,
        { status: 500 },
      );
    }

    const res = await mutationAppPurchaseOneTimeCreate({
      shop,
      accessToken: accessToken as string,
      name: packName,
      price: { amount, currencyCode },
      returnUrl,
      test: isBillingTestMode(),
    });
    const payload = res?.data?.appPurchaseOneTimeCreate;
    const userErrors = payload?.userErrors as
      | Array<{ message?: string }>
      | undefined;
    if (userErrors?.length) {
      console.error("[expand-market] buyPack userErrors:", userErrors);
      return json(
        { ok: false, error: "expand.error.purchaseFailed" } satisfies BillingActionData,
        { status: 400 },
      );
    }
    const confirmationUrl = payload?.confirmationUrl as string | undefined;
    // fetcher 场景用客户端 top 跳转；勿 throw redirect（易把确认页加载坏）
    if (confirmationUrl) {
      return json({
        ok: true,
        confirmationUrl,
      } satisfies BillingActionData);
    }
    return json(
      { ok: false, error: "expand.error.purchaseFailed" } satisfies BillingActionData,
      { status: 500 },
    );
  }

  if (intent === "subscribePlan") {
    const planTitle = String(form.get("planTitle") || "").trim();
    const monthlyPrice = Number(form.get("monthlyPrice") || 0);
    const locale = String(form.get("locale") || "").trim();
    if (!planTitle || !(monthlyPrice > 0)) {
      return json(
        {
          ok: false,
          error: "expand.error.subscribeInvalid",
        } satisfies BillingActionData,
        { status: 400 },
      );
    }

    let returnUrl: URL;
    try {
      returnUrl = expandReturnUrl(shop, {
        locale,
        subscribed: "1",
      });
    } catch (err) {
      console.error("[expand-market] subscribePlan returnUrl failed:", err);
      return json(
        {
          ok: false,
          error: "expand.error.subscribeFailed",
        } satisfies BillingActionData,
        { status: 500 },
      );
    }

    console.log(
      `[expand-market] subscribePlan shop=${shop} plan=${planTitle} price=${monthlyPrice} returnUrl=${returnUrl.href} test=${isBillingTestMode()}`,
    );

    const res = await mutationAppSubscriptionCreate({
      shop,
      accessToken: accessToken as string,
      name: planTitle,
      yearly: false,
      price: { amount: monthlyPrice, currencyCode: "USD" },
      trialDays: 0,
      returnUrl,
      test: isBillingTestMode(),
    });
    const payload = res?.data?.appSubscriptionCreate;
    const userErrors = payload?.userErrors as
      | Array<{ message?: string }>
      | undefined;
    if (userErrors?.length) {
      console.error("[expand-market] subscribePlan userErrors:", userErrors);
      return json(
        {
          ok: false,
          error: "expand.error.subscribeFailed",
        } satisfies BillingActionData,
        { status: 400 },
      );
    }
    const confirmationUrl = payload?.confirmationUrl as string | undefined;
    if (confirmationUrl) {
      return json({
        ok: true,
        confirmationUrl,
      } satisfies BillingActionData);
    }
    console.error("[expand-market] subscribePlan missing confirmationUrl:", res);
    return json(
      {
        ok: false,
        error: "expand.error.subscribeFailed",
      } satisfies BillingActionData,
      { status: 500 },
    );
  }

  if (intent === "enableAutoTranslate") {
    const locale = String(form.get("locale") || "").trim();
    if (!locale) {
      return json({ ok: false, error: "expand.validation.selectTarget" }, { status: 400 });
    }
    try {
      await setAutoTranslate(shop, locale, true);
      return json({ ok: true, locale, autoTranslate: true });
    } catch (err) {
      console.error("[expand-market] enableAutoTranslate failed:", err);
      return json(
        { ok: false, error: "expand.error.enableAutoFailed" },
        { status: 500 },
      );
    }
  }

  if (intent !== "prepareLocale") {
    return json({ ok: false, error: "expand.error.unknownIntent" }, { status: 400 });
  }

  const locale = String(form.get("locale") || "").trim();
  if (!locale) {
    return json({ ok: false, error: "expand.validation.selectTarget" }, { status: 400 });
  }

  const localesBefore = await loadShopLocalesForTranslation({ shop, accessToken });
  const ensured = await ensureTrialLocaleEnabledAndPublished({
    shop,
    accessToken,
    admin,
    locale,
    primaryLocale: localesBefore.primaryLocale,
  });
  if (!ensured.ok) {
    return json(
      { ok: false, error: ensured.error || "expand.error.prepareFailed" },
      { status: 400 },
    );
  }

  invalidateShopLocalesCache(shop);
  const [refreshedLocales, quota] = await Promise.all([
    loadShopLocalesForTranslation({ shop, accessToken }),
    getAccountQuota(shop),
  ]);
  const starter = await buildStarterPackEstimate({
    shop,
    admin,
    remainingCredits: quota?.remainingCredits ?? 0,
  });
  const upgradeOffer = await buildUpgradeFromStarter(starter);

  return json({
    ok: true,
    shopLocales: toShopLocales(refreshedLocales.rows),
    primaryLocale: refreshedLocales.primaryLocale,
    starter,
    upgradeOffer,
  } satisfies PrepareActionData);
};

export default function ExpandMarketPage() {
  const { t } = useTranslation();
  const loaderData = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const revalidator = useRevalidator();
  const navigate = useNavigate();
  const { report } = useReport();
  const prepareFetcher = useFetcher<PrepareActionData>();
  const buyFetcher = useFetcher<BillingActionData>();
  const subscribeFetcher = useFetcher<BillingActionData>();
  const autoFetcher = useFetcher<{
    ok: boolean;
    error?: string;
    autoTranslate?: boolean;
  }>();
  const jobsFetcher = useFetcher<JobsResponse>();
  const [translating, setTranslating] = useState(false);
  const [autoEnabled, setAutoEnabled] = useState(false);
  const pendingStartAfterLocale = useRef(false);

  const [shopLocales, setShopLocales] = useState(loaderData.shopLocales);
  const [primaryLocale, setPrimaryLocale] = useState(loaderData.primaryLocale);
  const [jobs, setJobs] = useState(loaderData.jobs);
  const [starter, setStarter] = useState(loaderData.starter);
  const [upgradeOffer, setUpgradeOffer] = useState(loaderData.upgradeOffer);
  const [autoTranslateByLocale, setAutoTranslateByLocale] = useState(
    loaderData.autoTranslateByLocale,
  );
  const [selectedLocale, setSelectedLocale] = useState("");

  const presetLocale = searchParams.get("locale")?.trim() || "";
  const fromTrial = searchParams.get("from") === "trial";
  const purchasedReturn = searchParams.get("purchased") === "1";
  const subscribedReturn = searchParams.get("subscribed") === "1";

  const purchasedToastShown = useRef(false);
  const subscribedToastShown = useRef(false);
  /** 同一条 autoFetcher 成功响只处理一次，避免依赖变化反复弹 toast。 */
  const handledAutoFetcherData = useRef<unknown>(null);
  const lastBillingConfirmUrl = useRef("");

  useEffect(() => {
    setShopLocales(loaderData.shopLocales);
    setPrimaryLocale(loaderData.primaryLocale);
    setJobs(loaderData.jobs);
    setStarter(loaderData.starter);
    setUpgradeOffer(loaderData.upgradeOffer);
    setAutoTranslateByLocale(loaderData.autoTranslateByLocale);
  }, [loaderData]);

  useEffect(() => {
    if (selectedLocale) return;
    if (presetLocale && presetLocale !== primaryLocale) {
      setSelectedLocale(presetLocale);
      return;
    }
    const published = shopLocales.find((r) => r.published && !r.primary);
    if (published) setSelectedLocale(published.locale);
  }, [selectedLocale, presetLocale, primaryLocale, shopLocales]);

  // 按语言恢复/切换「已开自动更新」成功态
  useEffect(() => {
    if (!selectedLocale) {
      setAutoEnabled(false);
      return;
    }
    setAutoEnabled(Boolean(autoTranslateByLocale[selectedLocale]));
  }, [selectedLocale, autoTranslateByLocale]);

  // 从试译带 from=trial 进来：语言已锚定，直接把用户滚到起步操作区（少一次找）。
  const scrolledFromTrial = useRef(false);
  useEffect(() => {
    if (!fromTrial || !presetLocale || scrolledFromTrial.current) return;
    if (!selectedLocale) return;
    scrolledFromTrial.current = true;
    const timer = window.setTimeout(() => {
      document
        .getElementById("expand-locale-select")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [fromTrial, presetLocale, selectedLocale]);

  useEffect(() => {
    if (prepareFetcher.state !== "idle" || !prepareFetcher.data) return;
    const data = prepareFetcher.data;
    if (!data.ok) {
      pendingStartAfterLocale.current = false;
      setTranslating(false);
      message.error(t(data.error || "expand.error.prepareFailed"));
      return;
    }
    if (data.shopLocales) setShopLocales(data.shopLocales);
    if (data.primaryLocale) setPrimaryLocale(data.primaryLocale);
    if (data.starter) setStarter(data.starter);
    if (data.upgradeOffer) setUpgradeOffer(data.upgradeOffer);
    void report(
      { locale: selectedLocale },
      { eventType: "click" },
      "expand_prepare_locale_ok",
    );
    if (pendingStartAfterLocale.current) {
      pendingStartAfterLocale.current = false;
      void createStarterTask();
    }
    // createStarterTask via closure; intentional omit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prepareFetcher.state, prepareFetcher.data, t, report, selectedLocale]);

  useEffect(() => {
    if (jobsFetcher.state !== "idle" || !jobsFetcher.data?.jobs) return;
    setJobs(jobsFetcher.data.jobs);
  }, [jobsFetcher.state, jobsFetcher.data]);

  const hasActiveJob = jobs.some((j) => j.isActive);
  useEffect(() => {
    if (!hasActiveJob) return;
    const timer = window.setInterval(() => {
      jobsFetcher.load("/api/expand-market/tasks");
    }, 4000);
    return () => window.clearInterval(timer);
  }, [hasActiveJob, jobsFetcher]);

  // 购包回来：toast + 多次 revalidate 等 webhook 入账
  useEffect(() => {
    if (!purchasedReturn) return;
    if (!purchasedToastShown.current) {
      purchasedToastShown.current = true;
      message.success(t("expand.purchaseReturned"));
      void report({}, { eventType: "exposure" }, "expand_purchase_returned");
    }
    revalidator.revalidate();
    const timers = [2500, 6000, 12000].map((ms) =>
      window.setTimeout(() => revalidator.revalidate(), ms),
    );
    return () => timers.forEach((id) => window.clearTimeout(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchasedReturn]);

  useEffect(() => {
    if (!subscribedReturn || subscribedToastShown.current) return;
    subscribedToastShown.current = true;
    message.success(t("expand.subscribeReturned"));
    void report({}, { eventType: "exposure" }, "expand_subscribe_returned");
    revalidator.revalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscribedReturn]);

  useEffect(() => {
    if (autoFetcher.state !== "idle" || !autoFetcher.data) return;
    // Remix fetcher 成功后 data 会一直挂着；必须按引用去重，否则一改 locale/i18n 就连弹 toast。
    if (handledAutoFetcherData.current === autoFetcher.data) return;
    handledAutoFetcherData.current = autoFetcher.data;

    if (!autoFetcher.data.ok) {
      message.error(t(autoFetcher.data.error || "expand.error.enableAutoFailed"));
      return;
    }
    if (autoFetcher.data.autoTranslate) {
      setAutoEnabled(true);
      if (selectedLocale) {
        setAutoTranslateByLocale((prev) => ({
          ...prev,
          [selectedLocale]: true,
        }));
      }
      message.success(t("expand.autoEnabledSuccess"));
      void report(
        { locale: selectedLocale },
        { eventType: "click" },
        "expand_auto_enabled_ok",
      );
      // 已订阅则引导结束，进入语言就绪页。
      const alreadySubscribed =
        subscribedReturn ||
        Boolean(loaderData.onboardingProgress?.subscribed);
      if (alreadySubscribed) {
        navigate(onboardingReadyHref(selectedLocale || null));
      }
    }
  }, [
    autoFetcher.state,
    autoFetcher.data,
    t,
    report,
    selectedLocale,
    subscribedReturn,
    loaderData.onboardingProgress?.subscribed,
    navigate,
  ]);

  const submitBuyPack = useCallback(
    (
      pack: {
        packName: string;
        priceAmount: number;
        currencyCode: string;
      },
      locale: string,
    ) => {
      const form = new FormData();
      form.set("intent", "buyPack");
      form.set("packName", pack.packName);
      form.set("amount", String(pack.priceAmount));
      form.set("currencyCode", pack.currencyCode);
      form.set("locale", locale);
      buyFetcher.submit(form, { method: "post" });
    },
    [buyFetcher],
  );

  useEffect(() => {
    if (subscribeFetcher.state !== "idle" || !subscribeFetcher.data) return;
    const data = subscribeFetcher.data;
    if (!data.ok) {
      message.error(t(data.error || "expand.error.subscribeFailed"));
      return;
    }
    if (
      data.confirmationUrl &&
      data.confirmationUrl !== lastBillingConfirmUrl.current
    ) {
      lastBillingConfirmUrl.current = data.confirmationUrl;
      redirectToBillingConfirmation(data.confirmationUrl);
    }
  }, [subscribeFetcher.state, subscribeFetcher.data, t]);

  useEffect(() => {
    if (buyFetcher.state !== "idle" || !buyFetcher.data) return;
    const data = buyFetcher.data;
    if (!data.ok) {
      message.error(t(data.error || "expand.error.purchaseFailed"));
      return;
    }
    if (
      data.confirmationUrl &&
      data.confirmationUrl !== lastBillingConfirmUrl.current
    ) {
      lastBillingConfirmUrl.current = data.confirmationUrl;
      redirectToBillingConfirmation(data.confirmationUrl);
    }
  }, [buyFetcher.state, buyFetcher.data, t]);

  const localeOptions: LocaleOption[] = useMemo(() => {
    const shopMap = new Map(shopLocales.map((r) => [r.locale, r]));
    const fromAvailable = loaderData.availableLocales
      .filter((a) => a.isoCode !== primaryLocale)
      .map((a) => {
        const shop = shopMap.get(a.isoCode);
        return {
          value: a.isoCode,
          label: a.name || a.isoCode,
          published: Boolean(shop?.published),
        };
      });
    const seen = new Set(fromAvailable.map((o) => o.value));
    for (const s of shopLocales) {
      if (s.primary || seen.has(s.locale)) continue;
      fromAvailable.push({
        value: s.locale,
        label: s.label,
        published: s.published,
      });
    }
    return fromAvailable.sort((a, b) => {
      if (a.published !== b.published) return a.published ? -1 : 1;
      return a.label.localeCompare(b.label);
    });
  }, [loaderData.availableLocales, shopLocales, primaryLocale]);

  const localePublished = useMemo(() => {
    if (!selectedLocale) return false;
    return shopLocales.some((r) => r.locale === selectedLocale && r.published);
  }, [selectedLocale, shopLocales]);

  const jobsForLocale = useMemo(
    () =>
      jobs
        .filter((j) => j.target === selectedLocale)
        .map((j) => ({
          taskId: j.taskId,
          status: j.status,
          statusLabel: j.statusLabel,
          isActive: j.isActive,
          isTerminal: j.isTerminal,
          isStopping: j.isStopping,
          progressPercent: j.progressPercent,
          stageSummary: j.stageSummary,
          errorMessage: j.errorMessage,
          errorStage: j.errorStage,
          metrics: j.metrics,
          translateTotal: j.metrics?.translateTotal ?? 0,
          writebackDone: j.metrics?.writebackDone ?? 0,
        })),
    [jobs, selectedLocale],
  );

  const starterSucceeded = useMemo(() => {
    const latest =
      jobsForLocale.find((j) => j.isActive) ?? jobsForLocale[0] ?? null;
    return (
      latest?.status === "COMPLETED" && (latest.translateTotal ?? 0) > 0
    );
  }, [jobsForLocale]);

  useEffect(() => {
    if (!starterSucceeded) return;
    void report(
      { locale: selectedLocale },
      { eventType: "exposure" },
      "expand_starter_complete",
    );
  }, [starterSucceeded, selectedLocale, report]);

  const onPrepareLocale = useCallback(() => {
    if (!selectedLocale) return;
    void report(
      { locale: selectedLocale },
      { eventType: "click" },
      "expand_prepare_locale_click",
    );
    const form = new FormData();
    form.set("intent", "prepareLocale");
    form.set("locale", selectedLocale);
    prepareFetcher.submit(form, { method: "post" });
  }, [prepareFetcher, selectedLocale, report]);

  const onBuyRecommendedPack = useCallback(() => {
    const pack = starter.recommendedPack;
    if (!pack) return;
    void report(
      { pack: pack.packName, credits: pack.credits },
      { eventType: "click" },
      "expand_buy_starter_pack_click",
    );
    submitBuyPack(pack, selectedLocale);
  }, [starter.recommendedPack, selectedLocale, submitBuyPack, report]);

  const createStarterTask = useCallback(async () => {
    if (!selectedLocale) return;
    try {
      const res = await fetch("/api/expand-market/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: primaryLocale,
          target: selectedLocale,
          mode: "starter",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as CreateTaskResponse;
      if (!res.ok || !data.ok) {
        message.error(t(data.error || "expand.error.createFailed"));
        return;
      }
      message.success(t("expand.createSuccess"));
      void report(
        { locale: selectedLocale, jobId: data.jobId },
        { eventType: "click" },
        "expand_translate_starter_ok",
      );
      jobsFetcher.load("/api/expand-market/tasks");
    } catch {
      message.error(t("expand.error.createFailed"));
    } finally {
      setTranslating(false);
    }
  }, [selectedLocale, primaryLocale, t, jobsFetcher, report]);

  const onTranslateStarter = useCallback(async () => {
    if (!selectedLocale || translating || prepareFetcher.state !== "idle") return;
    setTranslating(true);
    void report(
      { locale: selectedLocale },
      { eventType: "click" },
      "expand_translate_starter_click",
    );
    if (!localePublished) {
      pendingStartAfterLocale.current = true;
      onPrepareLocale();
      return;
    }
    await createStarterTask();
  }, [
    selectedLocale,
    translating,
    prepareFetcher.state,
    localePublished,
    onPrepareLocale,
    createStarterTask,
    report,
  ]);

  const onSubscribe = useCallback(() => {
    const sub = upgradeOffer.recommendedSubscription;
    if (!sub) return;
    void report(
      { plan: sub.title, locale: selectedLocale },
      { eventType: "click" },
      "expand_subscribe_click",
    );
    const form = new FormData();
    form.set("intent", "subscribePlan");
    form.set("planTitle", sub.title);
    form.set("monthlyPrice", String(sub.monthlyPrice));
    form.set("locale", selectedLocale);
    subscribeFetcher.submit(form, { method: "post" });
  }, [
    upgradeOffer.recommendedSubscription,
    selectedLocale,
    subscribeFetcher,
    report,
  ]);

  const onEnableAutoTranslate = useCallback(() => {
    if (!selectedLocale || autoEnabled) return;
    void report(
      { locale: selectedLocale },
      { eventType: "click" },
      "expand_enable_auto_translate_click",
    );
    const form = new FormData();
    form.set("intent", "enableAutoTranslate");
    form.set("locale", selectedLocale);
    autoFetcher.submit(form, { method: "post" });
  }, [selectedLocale, autoEnabled, autoFetcher, report]);

  const preparing = prepareFetcher.state !== "idle";
  const buyingPack = buyFetcher.state !== "idle";
  const subscribing = subscribeFetcher.state !== "idle";
  const enablingAuto = autoFetcher.state !== "idle";

  // returnUrl subscribed=1 立刻切「只推自动更新」，不等 webhook 入账。
  const hasSubscription =
    subscribedReturn || Boolean(loaderData.onboardingProgress?.subscribed);

  // 订 + 本语言已开 auto：引导结束，进入就绪页（含「先开 auto 再订回来」）。
  useEffect(() => {
    if (!hasSubscription || !autoEnabled || !selectedLocale) return;
    navigate(onboardingReadyHref(selectedLocale));
  }, [hasSubscription, autoEnabled, selectedLocale, navigate]);

  return (
    <Page>
      <TitleBar title={t("expand.pageTitle")} />
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <OnboardingProgressBar
          shop={loaderData.shop}
          initial={loaderData.onboardingProgress}
          locale={selectedLocale || loaderData.onboardingProgress?.locale}
          overrides={{
            starterOk: starterSucceeded,
            subscribed: hasSubscription,
            autoOn: autoEnabled,
            preferStarter: true,
          }}
        />

        <AppPageHeader
          title={t("expand.title")}
          description={t("expand.description")}
        />

        {fromTrial && presetLocale ? (
          <Banner tone="info">
            {t("expand.fromTrialBanner", {
              language:
                localeOptions.find((o) => o.value === presetLocale)?.label ||
                presetLocale,
            })}
          </Banner>
        ) : null}

        <AppSectionCard>
          <LanguageExpandPanel
            localeOptions={localeOptions}
            selectedLocale={selectedLocale}
            onLocaleChange={setSelectedLocale}
            translating={translating || preparing}
            buyingPack={buyingPack}
            onBuyRecommendedPack={onBuyRecommendedPack}
            onTranslateStarter={onTranslateStarter}
            starter={starter}
            jobsForLocale={jobsForLocale}
            purchasedReturn={purchasedReturn}
            upgradeOffer={upgradeOffer}
            subscribed={hasSubscription}
            subscribing={subscribing}
            enablingAuto={enablingAuto}
            autoEnabled={autoEnabled}
            onSubscribe={onSubscribe}
            onEnableAutoTranslate={onEnableAutoTranslate}
          />
        </AppSectionCard>
      </div>
    </Page>
  );
}
