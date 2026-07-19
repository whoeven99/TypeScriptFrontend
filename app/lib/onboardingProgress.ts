/**
 * 新手漏斗进度（试译 → 起步包 → 订阅/自动更新）。
 * 终点：订阅 + 开启自动更新。无独立表：由 Cosmos Trial/Expand、
 * 订阅 activated、ShopTargetLocale.autoTranslate 推导。
 * 店面验收点击仍可记 localStorage，仅作产品提示，不挡漏斗完成。
 */

export const ONBOARDING_STEP_IDS = [
  "trial",
  "starter",
  "subscribe",
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEP_IDS)[number];

export type OnboardingStepUiState = "todo" | "current" | "done";

export type OnboardingStepView = {
  id: OnboardingStepId;
  state: OnboardingStepUiState;
};

export type OnboardingProgressSignals = {
  /** 从未激活过订阅（bootstrap isNew）。 */
  isNew: boolean;
  /** 进度条锚定的目标语言（起步/auto 按 locale；试译全局一次即可）。 */
  locale: string | null;
  /** 任意 Trial 任务已 COMPLETED（用户确认写回后）。 */
  trialSaved: boolean;
  /** 当前 locale 的 Expand 起步包 COMPLETED 且 translateTotal>0。 */
  starterOk: boolean;
  /** 曾激活过订阅（!isNew）。 */
  subscribed: boolean;
  /**
   * 自动更新已开。漏斗完成口径：任一目标语言已开即可
   * （由 loader 汇总后传入）。
   */
  autoOn: boolean;
  /** 客户端：点过店面验收 / 切换器（sessionStorage）；不挡漏斗完成。 */
  previewClicked: boolean;
  /**
   * 已进入开拓路径（开拓市场页，或已有 Expand 任务）。
   * 为 true 时允许试译保持 todo，current 落在起步包（跳过试译）。
   */
  preferStarter?: boolean;
};

export type OnboardingProgress = {
  /** 是否渲染进度条（漏斗未完成且已进入/属于新手路径）。 */
  visible: boolean;
  /** 订 + 自动更新完成。 */
  funnelComplete: boolean;
  currentStep: OnboardingStepId;
  steps: OnboardingStepView[];
  locale: string | null;
  isNew: boolean;
  trialSaved: boolean;
  starterOk: boolean;
  subscribed: boolean;
  autoOn: boolean;
  previewClicked: boolean;
  preferStarter: boolean;
};

export function deriveOnboardingProgress(
  signals: OnboardingProgressSignals,
): OnboardingProgress {
  const {
    isNew,
    locale,
    trialSaved,
    starterOk,
    subscribed,
    autoOn,
    previewClicked,
    preferStarter = false,
  } = signals;

  const funnelComplete = subscribed && autoOn;
  // 跳过试译：已在开拓路径或已有起步成果时，不把 current 卡在试译。
  const treatTrialOptional = preferStarter || starterOk || subscribed;

  let currentStep: OnboardingStepId;
  if (!starterOk) {
    currentStep = trialSaved || treatTrialOptional ? "starter" : "trial";
  } else if (!funnelComplete) {
    currentStep = "subscribe";
  } else {
    // 已完成时仍给一个合法 current，UI 因 visible=false 不展示。
    currentStep = "subscribe";
  }

  const done = new Set<OnboardingStepId>();
  if (trialSaved || treatTrialOptional) done.add("trial");
  if (starterOk) done.add("starter");
  if (funnelComplete) done.add("subscribe");

  const steps: OnboardingStepView[] = ONBOARDING_STEP_IDS.map((id) => {
    if (done.has(id)) return { id, state: "done" as const };
    if (id === currentStep) return { id, state: "current" as const };
    return { id, state: "todo" as const };
  });

  const inFunnel = isNew || trialSaved || starterOk || subscribed;
  const visible = inFunnel && !funnelComplete;

  return {
    visible,
    funnelComplete,
    currentStep,
    steps,
    locale,
    isNew,
    trialSaved,
    starterOk,
    subscribed,
    autoOn,
    previewClicked,
    preferStarter: treatTrialOptional,
  };
}

/** sessionStorage key：店面验收行为（不落库）。 */
export function onboardingPreviewStorageKey(
  shop: string,
  locale: string,
): string {
  return `ciwi_onboarding_previewed:${shop}:${locale}`;
}

export function readOnboardingPreviewClicked(
  shop: string,
  locale: string | null,
): boolean {
  if (typeof window === "undefined" || !shop || !locale) return false;
  try {
    return (
      window.localStorage.getItem(
        onboardingPreviewStorageKey(shop, locale),
      ) === "1"
    );
  } catch {
    return false;
  }
}

export function markOnboardingPreviewClicked(
  shop: string,
  locale: string | null,
): void {
  if (typeof window === "undefined" || !shop || !locale) return;
  try {
    window.localStorage.setItem(
      onboardingPreviewStorageKey(shop, locale),
      "1",
    );
  } catch {
    // ignore quota / private mode
  }
}

/** localStorage key：某语言的「就绪带」已被用户手动关闭（不落库）。 */
export function readyBandDismissStorageKey(
  shop: string,
  locale: string,
): string {
  return `ciwi_ready_band_dismissed:${shop}:${locale}`;
}

export function readReadyBandDismissed(
  shop: string,
  locale: string | null,
): boolean {
  if (typeof window === "undefined" || !shop || !locale) return false;
  try {
    return (
      window.localStorage.getItem(
        readyBandDismissStorageKey(shop, locale),
      ) === "1"
    );
  } catch {
    return false;
  }
}

export function markReadyBandDismissed(
  shop: string,
  locale: string | null,
): void {
  if (typeof window === "undefined" || !shop || !locale) return;
  try {
    window.localStorage.setItem(readyBandDismissStorageKey(shop, locale), "1");
  } catch {
    // ignore quota / private mode
  }
}

/** 步骤点击目标；todo 返回 null（由 UI toast）。 */
export function onboardingStepHref(
  stepId: OnboardingStepId,
  state: OnboardingStepUiState,
  locale: string | null,
): string | null {
  if (state === "todo") return null;
  if (stepId === "trial") return "/app/trial-translate";
  const q =
    locale && locale.trim()
      ? `?locale=${encodeURIComponent(locale.trim())}`
      : "";
  return `/app/expand-market${q}`;
}

/**
 * 引导完成后的落地：智能翻译首页 + celebrate（触发首页顶部「就绪带」一次）。
 * 就绪体验已从独立 /app/ready 页合并到首页，函数名保留以减少调用方改动。
 */
export function onboardingReadyHref(locale: string | null): string {
  const q =
    locale && locale.trim()
      ? `?celebrate=${encodeURIComponent(locale.trim())}`
      : "";
  return `/app/translate-v4${q}`;
}
