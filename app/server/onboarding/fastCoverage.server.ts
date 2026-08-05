/**
 * Onboarding 快扫覆盖率：只算「最重要 1 个语言 × 最重要 5 个模块」。
 *
 * - 写 Redis `tsf:items_count` 的对应 module（与全量刷新同源），供后续页面复用。
 * - **不**把部分结果 upsert 进 Turso 语言级汇总（避免污染权威覆盖率；全量由 install shop scan 补齐）。
 * - 供 Preparing 真进度：客户端按 label 逐个 POST。
 */
import {
  getItemsCountByLabel,
  isLocalItemsCountSupported,
  type AdminGraphqlClient,
} from "~/server/translateV4/itemsCount.server";

/** 与引导推荐模块对齐的 5 个管理翻译卡片 label（itemsCount LOCAL_COUNT_SPEC）。 */
export const ONBOARDING_FAST_COVERAGE_LABELS = [
  "Products",
  "Collection",
  "Navigation",
  "Pages",
  "Shop",
] as const;

export type OnboardingFastCoverageLabel =
  (typeof ONBOARDING_FAST_COVERAGE_LABELS)[number];

export type FastCoverageLabelResult = {
  label: OnboardingFastCoverageLabel;
  translated: number;
  total: number;
};

export type FastCoverageSnapshot = {
  locale: string;
  localeLabel: string;
  /** 已完成的 label 明细（按扫描顺序） */
  labels: FastCoverageLabelResult[];
  translated: number;
  total: number;
  percent: number | null;
  /** 已完成 label 数 / 总数 */
  doneCount: number;
  totalCount: number;
  /** true=五个模块都扫完（或无可扫） */
  complete: boolean;
  /** 部分模块口径，不等于全店全模块覆盖率 */
  partial: true;
};

export function isOnboardingFastCoverageLabel(
  value: string,
): value is OnboardingFastCoverageLabel {
  return (ONBOARDING_FAST_COVERAGE_LABELS as readonly string[]).includes(value);
}

/** 最重要语言：优先已发布推荐列表第一个，否则全部可用目标第一个。 */
export function pickOnboardingFastCoverageLocale(args: {
  suggestedTargets: string[];
  availableTargets: Array<{ value: string; label: string; published: boolean }>;
}): { locale: string; localeLabel: string } | null {
  const { suggestedTargets, availableTargets } = args;
  if (suggestedTargets.length === 0 && availableTargets.length === 0) {
    return null;
  }
  const locale =
    suggestedTargets[0] ??
    availableTargets.find((t) => t.published)?.value ??
    availableTargets[0]?.value;
  if (!locale) return null;
  const match = availableTargets.find((t) => t.value === locale);
  return {
    locale,
    localeLabel: match?.label ?? locale,
  };
}

function ratioPercent(translated: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.min(100, Math.round((translated / total) * 100));
}

function aggregate(
  locale: string,
  localeLabel: string,
  labels: FastCoverageLabelResult[],
  totalCount = ONBOARDING_FAST_COVERAGE_LABELS.length,
): FastCoverageSnapshot {
  const translated = labels.reduce((s, r) => s + r.translated, 0);
  const total = labels.reduce((s, r) => s + r.total, 0);
  return {
    locale,
    localeLabel,
    labels,
    translated,
    total,
    percent: ratioPercent(translated, total),
    doneCount: labels.length,
    totalCount,
    complete: labels.length >= totalCount,
    partial: true,
  };
}

/** 现算单个卡片 label → 写 Redis，返回该 label 计数。 */
export async function refreshOnboardingFastCoverageLabel(args: {
  admin: AdminGraphqlClient;
  shop: string;
  locale: string;
  label: OnboardingFastCoverageLabel;
}): Promise<FastCoverageLabelResult> {
  const { admin, shop, locale, label } = args;
  if (!isLocalItemsCountSupported(label)) {
    return { label, translated: 0, total: 0 };
  }
  const rows = await getItemsCountByLabel({
    admin,
    shop,
    target: locale,
    resourceTypeLabel: label,
    skipCache: true,
  });
  let translated = 0;
  let total = 0;
  for (const row of rows) {
    translated += row.translatedNumber;
    total += row.totalNumber;
  }
  return { label, translated, total };
}

/** 从已完成的 label 结果拼 snapshot（客户端累加用）。 */
export function buildFastCoverageSnapshot(args: {
  locale: string;
  localeLabel: string;
  labels: FastCoverageLabelResult[];
}): FastCoverageSnapshot {
  return aggregate(args.locale, args.localeLabel, args.labels);
}
