/**
 * Onboarding 展示层类型（无服务端依赖，可被客户端组件安全 import）。
 * 服务端聚合逻辑见 `app/server/onboarding/onboarding.server.ts`。
 */
export type OnboardingStatus =
  | "not_started"
  | "preparing"
  | "recommended"
  | "skipped"
  | "completed";

export type OnboardingLocaleOption = {
  value: string;
  label: string;
  published: boolean;
};

export type SerializedOnboardingState = {
  shop: string;
  status: OnboardingStatus;
  firstEnteredAt: string | null;
  skippedAt: string | null;
  completedAt: string | null;
  startedTrialFromOnboarding: boolean;
  createdFirstTaskFromOnboarding: boolean;
  recommendedTargets: string[];
  recommendedModules: string[];
  estimateCredits: number | null;
  estimateMinutes: number | null;
  sourceScanId: string | null;
};

/** Preparing 快扫计划：最重要 1 语 × 5 模块（label = 管理翻译卡片名）。 */
export type OnboardingFastCoveragePlan = {
  locale: string;
  localeLabel: string;
  labels: string[];
};

/** 快扫结果（部分模块口径，不等于全店全模块）。 */
export type OnboardingFastCoverageSnapshot = {
  locale: string;
  localeLabel: string;
  labels: Array<{ label: string; translated: number; total: number }>;
  translated: number;
  total: number;
  percent: number | null;
  doneCount: number;
  totalCount: number;
  complete: boolean;
  partial: true;
};

export type OnboardingSummary = {
  shop: string;
  onboardingState: SerializedOnboardingState | null;
  bootstrap: {
    planType: string;
    isNew: boolean | null;
    isInFreePlanTime: boolean;
    remainingCredits: number;
  };
  locales: {
    source: string;
    availableTargets: OnboardingLocaleOption[];
    suggestedTargets: string[];
  };
  /** loader 缓存覆盖率（可能仍为空）；快扫结果由客户端写入 UI state。 */
  coverage: {
    overallPercent: number | null;
    untranslatedRatioByLocale: Record<string, number | null>;
    topGaps: string[];
  } | null;
  /** Preparing 真进度要用的快扫计划；无目标语言时为 null。 */
  fastCoveragePlan: OnboardingFastCoveragePlan | null;
  recommendation: {
    suggestedModuleKeys: string[];
    reasons: string[];
    localizationNotes: Array<{ locale: string; label: string; note: string }>;
    shopProfile: {
      industry: string | null;
      brandTone: string | null;
      description: string | null;
    } | null;
  };
  estimate: {
    credits: number | null;
    minutes: number | null;
    isUpperBound: boolean;
    needsMoreCredits: boolean;
  } | null;
};
