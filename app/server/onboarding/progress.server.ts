import prisma from "~/db.server";
import { BILLING_LOG_EVENT } from "~/server/billing/types.server";
import {
  deriveOnboardingProgress,
  type OnboardingProgress,
  type OnboardingProgressSignals,
} from "~/lib/onboardingProgress";
import { listV4JobSummaries } from "~/server/translateV4/progress.server";
import type { TranslationJobProgressSummary } from "~/server/translateV4/progress.server";
import {
  TS_FRONTEND_EXPAND_TASK_SOURCE,
  TS_FRONTEND_TRIAL_TASK_SOURCE,
} from "~/server/translateV4/types";
import { listTargetLocales } from "~/server/translateV4/targetLocale.server";

export type LoadOnboardingProgressArgs = {
  shop: string;
  /** 锚定 locale；空则用最近 Trial/Expand 的 target。 */
  locale?: string | null;
  /** 调用方已有的 Expand jobs，避免重复拉 Cosmos。 */
  expandJobs?: TranslationJobProgressSummary[];
  /** 调用方已有的 Trial jobs。 */
  trialJobs?: TranslationJobProgressSummary[];
  /** 调用方已有的 locale→autoTranslate。 */
  autoTranslateByLocale?: Record<string, boolean>;
  /**
   * 开拓市场页传 true：允许跳过试译，current 落在起步包。
   * 若已有 Expand 任务也会自动视为 preferStarter。
   */
  preferStarter?: boolean;
};

function isTrialSaved(jobs: TranslationJobProgressSummary[]): boolean {
  return jobs.some((j) => j.status === "COMPLETED");
}

function isStarterOk(
  jobs: TranslationJobProgressSummary[],
  locale: string | null,
): boolean {
  return jobs.some((j) => {
    if (j.status !== "COMPLETED") return false;
    if ((j.metrics?.translateTotal ?? 0) <= 0) return false;
    if (locale && j.target !== locale) return false;
    return true;
  });
}

function pickAnchorLocale(
  preferred: string | null | undefined,
  trialJobs: TranslationJobProgressSummary[],
  expandJobs: TranslationJobProgressSummary[],
): string | null {
  const p = preferred?.trim();
  if (p) return p;
  const trialHit = trialJobs.find(
    (j) => j.status === "COMPLETED" || j.status === "TRANSLATE_DONE",
  );
  if (trialHit?.target) return trialHit.target;
  const expandHit = expandJobs.find(
    (j) =>
      j.status === "COMPLETED" && (j.metrics?.translateTotal ?? 0) > 0,
  );
  if (expandHit?.target) return expandHit.target;
  const anyExpand = expandJobs[0];
  if (anyExpand?.target) return anyExpand.target;
  const anyTrial = trialJobs[0];
  return anyTrial?.target ?? null;
}

async function loadSubscribed(shop: string): Promise<boolean> {
  try {
    const activatedCount = await prisma.billingLog.count({
      where: { shop, eventType: BILLING_LOG_EVENT.SUBSCRIPTION_ACTIVATED },
    });
    return activatedCount > 0;
  } catch (err) {
    console.error("[onboarding/progress] subscribed check failed:", err);
    return false;
  }
}

/**
 * 加载新手漏斗进度。失败时返回 visible=false，不挡主流程。
 */
export async function loadOnboardingProgress(
  args: LoadOnboardingProgressArgs,
): Promise<OnboardingProgress | null> {
  try {
    const shop = args.shop;
    const [trialJobs, expandJobs, subscribed, autoMap] = await Promise.all([
      args.trialJobs
        ? Promise.resolve(args.trialJobs)
        : listV4JobSummaries(shop, {
            limit: 10,
            taskSource: TS_FRONTEND_TRIAL_TASK_SOURCE,
            escalateStuck: false,
          }).catch((err) => {
            console.error("[onboarding/progress] trial jobs failed:", err);
            return [] as TranslationJobProgressSummary[];
          }),
      args.expandJobs
        ? Promise.resolve(args.expandJobs)
        : listV4JobSummaries(shop, {
            limit: 30,
            taskSource: TS_FRONTEND_EXPAND_TASK_SOURCE,
            escalateStuck: false,
          }).catch((err) => {
            console.error("[onboarding/progress] expand jobs failed:", err);
            return [] as TranslationJobProgressSummary[];
          }),
      loadSubscribed(shop),
      args.autoTranslateByLocale
        ? Promise.resolve(args.autoTranslateByLocale)
        : listTargetLocales(shop)
            .then((rows) => {
              const map: Record<string, boolean> = {};
              for (const row of rows) {
                map[row.locale] = Boolean(row.autoTranslate);
              }
              return map;
            })
            .catch((err) => {
              console.error("[onboarding/progress] targetLocales failed:", err);
              return {} as Record<string, boolean>;
            }),
    ]);

    const locale = pickAnchorLocale(args.locale, trialJobs, expandJobs);
    // 漏斗完成：任一目标语言已开自动更新即可。
    const anyAutoOn = Object.values(autoMap).some(Boolean);
    const signals: OnboardingProgressSignals = {
      isNew: !subscribed,
      locale,
      trialSaved: isTrialSaved(trialJobs),
      starterOk: isStarterOk(expandJobs, locale),
      subscribed,
      autoOn: anyAutoOn,
      // 店面验收仅客户端 localStorage；服务端恒 false。
      previewClicked: false,
      preferStarter: Boolean(args.preferStarter) || expandJobs.length > 0,
    };

    return deriveOnboardingProgress(signals);
  } catch (err) {
    console.error("[onboarding/progress] load failed:", err);
    return null;
  }
}

/**
 * 轻量：引导是否已结束（订 + 任一语言自动更新）。
 * 供 app shell / 落地 / 试译·开拓拦截复用。
 */
export async function loadOnboardingWizardComplete(
  shop: string,
): Promise<{ complete: boolean; locale: string | null }> {
  try {
    const [subscribed, targetLocales] = await Promise.all([
      loadSubscribed(shop),
      listTargetLocales(shop).catch((err) => {
        console.error("[onboarding/progress] wizardComplete locales:", err);
        return [] as Array<{ locale: string; autoTranslate: boolean }>;
      }),
    ]);
    const autoLocale =
      targetLocales.find((r) => r.autoTranslate)?.locale?.trim() || null;
    const complete = subscribed && Boolean(autoLocale);
    return { complete, locale: autoLocale };
  } catch (err) {
    console.error("[onboarding/progress] wizardComplete failed:", err);
    return { complete: false, locale: null };
  }
}
