import {
  Card,
  BlockStack,
  InlineStack,
  Text,
  Badge,
  Box,
  Divider,
  ProgressBar,
} from "@shopify/polaris";
import { useTranslation } from "react-i18next";
import type {
  OnboardingFastCoverageSnapshot,
  OnboardingSummary,
} from "../types";
import { CREATE_TASK_MODULE_LABELS } from "~/routes/app.translate-v4/constants";
import { formatEstimateCredits } from "~/routes/app.translate-v4/useCreateTaskEstimate";

type SuggestionPriority = "critical" | "recommended" | "optional";

function LabeledCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <BlockStack gap="300">
        <BlockStack gap="100">
          <Text as="h2" variant="headingMd">
            {title}
          </Text>
          {subtitle ? (
            <Text as="p" tone="subdued" variant="bodySm">
              {subtitle}
            </Text>
          ) : null}
        </BlockStack>
        <Divider />
        {children}
      </BlockStack>
    </Card>
  );
}

function getPriorityTone(priority: SuggestionPriority) {
  switch (priority) {
    case "critical":
      return "attention" as const;
    case "recommended":
      return "info" as const;
    default:
      return "success" as const;
  }
}

function buildSuggestionRows(summary: OnboardingSummary): Array<{
  locale: string;
  label: string;
  coveragePercent: number | null;
  priority: SuggestionPriority;
}> {
  const available = new Map(
    summary.locales.availableTargets.map((item) => [item.value, item]),
  );
  const ratioByLocale = summary.coverage?.untranslatedRatioByLocale ?? {};

  return summary.locales.suggestedTargets
    .map((locale) => {
      const target = available.get(locale);
      const untranslatedRatio = ratioByLocale[locale];
      const coveragePercent =
        typeof untranslatedRatio === "number"
          ? Math.max(0, Math.min(100, Math.round((1 - untranslatedRatio) * 100)))
          : null;

      let priority: SuggestionPriority = "recommended";
      if (coveragePercent == null) {
        priority = "recommended";
      } else if (coveragePercent < 60) {
        priority = "critical";
      } else if (coveragePercent < 85) {
        priority = "recommended";
      } else {
        priority = "optional";
      }

      return {
        locale,
        label: target?.label ?? locale,
        coveragePercent,
        priority,
      };
    })
    .sort((a, b) => {
      const order: Record<SuggestionPriority, number> = {
        critical: 0,
        recommended: 1,
        optional: 2,
      };
      if (order[a.priority] !== order[b.priority]) {
        return order[a.priority] - order[b.priority];
      }
      return (a.coveragePercent ?? -1) - (b.coveragePercent ?? -1);
    });
}

function RecommendationOverview({ summary }: { summary: OnboardingSummary }) {
  const { t } = useTranslation();
  const rows = buildSuggestionRows(summary);
  const criticalCount = rows.filter((row) => row.priority === "critical").length;
  const coverageKnown = rows.filter((row) => row.coveragePercent != null);
  const avgCoverage =
    coverageKnown.length > 0
      ? Math.round(
          coverageKnown.reduce(
            (sum, row) => sum + (row.coveragePercent ?? 0),
            0,
          ) / coverageKnown.length,
        )
      : null;

  const metrics = [
    {
      label: t("onboarding.recommendation.metric.targets"),
      value: String(summary.locales.suggestedTargets.length),
      tone: "base" as const,
    },
    {
      label: t("onboarding.recommendation.metric.configured"),
      value: String(summary.locales.availableTargets.length),
      tone: "base" as const,
    },
    {
      label: t("onboarding.recommendation.metric.critical"),
      value: String(criticalCount),
      tone: criticalCount > 0 ? ("critical" as const) : ("base" as const),
    },
    {
      label: t("onboarding.recommendation.metric.coverage"),
      value:
        avgCoverage != null
          ? `${avgCoverage}%`
          : t("onboarding.suggestion.coveragePending"),
      tone: "base" as const,
    },
  ];

  return (
    <Card>
      <BlockStack gap="400">
        <BlockStack gap="100">
          <Text as="p" variant="bodySm" tone="subdued">
            {t("onboarding.recommendation.eyebrow")}
          </Text>
          <Text as="h1" variant="headingLg">
            {t("onboarding.recommendation.title")}
          </Text>
          <Text as="p" tone="subdued">
            {t("onboarding.recommendation.subtitle")}
          </Text>
        </BlockStack>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "12px",
          }}
        >
          {metrics.map((metric) => (
            <div
              key={metric.label}
              style={{
                border: "1px solid rgba(138, 142, 145, 0.22)",
                borderRadius: "12px",
                padding: "14px 16px",
                background: "rgba(246, 246, 247, 0.7)",
              }}
            >
              <BlockStack gap="100">
                <Text as="span" tone="subdued" variant="bodySm">
                  {metric.label}
                </Text>
                <Text as="span" variant="headingMd" tone={metric.tone}>
                  {metric.value}
                </Text>
              </BlockStack>
            </div>
          ))}
        </div>
      </BlockStack>
    </Card>
  );
}

/** A. 建议表预览 */
function SuggestedCoverageBoard({ summary }: { summary: OnboardingSummary }) {
  const { t } = useTranslation();
  const rows = buildSuggestionRows(summary);

  return (
    <LabeledCard
      title={t("onboarding.suggestion.title")}
      subtitle={t("onboarding.suggestion.subtitle")}
    >
      {rows.length === 0 ? (
        <Text as="p" tone="subdued">
          {t("onboarding.languages.empty")}
        </Text>
      ) : (
        <BlockStack gap="300">
          <div
            style={{
              border: "1px solid rgba(138, 142, 145, 0.18)",
              borderRadius: "12px",
              overflow: "hidden",
              background: "#ffffff",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(160px, 1.2fr) minmax(120px, 0.8fr) minmax(140px, 0.9fr) minmax(220px, 1.4fr) minmax(120px, 0.8fr)",
                gap: "12px",
                padding: "12px 16px",
                background: "rgba(246, 246, 247, 0.95)",
                borderBottom: "1px solid rgba(138, 142, 145, 0.18)",
              }}
            >
              <Text as="span" variant="bodySm" tone="subdued">
                {t("onboarding.suggestion.column.language")}
              </Text>
              <Text as="span" variant="bodySm" tone="subdued">
                {t("onboarding.suggestion.column.status")}
              </Text>
              <Text as="span" variant="bodySm" tone="subdued">
                {t("onboarding.suggestion.column.coverage")}
              </Text>
              <Text as="span" variant="bodySm" tone="subdued">
                {t("onboarding.suggestion.column.action")}
              </Text>
              <Text as="span" variant="bodySm" tone="subdued">
                {t("onboarding.suggestion.column.priority")}
              </Text>
            </div>

            {rows.map((row) => {
              const priorityKey = `onboarding.suggestion.priority.${row.priority}`;
              const actionKey = `onboarding.suggestion.action.${row.priority}`;
              const coverageTone =
                row.coveragePercent != null && row.coveragePercent >= 85
                  ? "success"
                  : row.coveragePercent != null && row.coveragePercent < 60
                    ? "critical"
                    : "base";
              return (
                <div
                  key={row.locale}
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "minmax(160px, 1.2fr) minmax(120px, 0.8fr) minmax(140px, 0.9fr) minmax(220px, 1.4fr) minmax(120px, 0.8fr)",
                    gap: "12px",
                    padding: "16px",
                    background: "#ffffff",
                    borderBottom: "1px solid rgba(138, 142, 145, 0.14)",
                  }}
                >
                  <BlockStack gap="100">
                    <Text as="span" variant="bodyMd" fontWeight="semibold">
                      {row.label}
                    </Text>
                    <Text as="span" tone="subdued" variant="bodySm">
                      {t("onboarding.suggestion.languageHint")}
                    </Text>
                  </BlockStack>

                  <BlockStack gap="100">
                    <Badge tone="info">{t("onboarding.suggestion.configured")}</Badge>
                    <Text as="span" tone="subdued" variant="bodySm">
                      {t("onboarding.suggestion.statusHint")}
                    </Text>
                  </BlockStack>

                  <BlockStack gap="100">
                    {row.coveragePercent != null ? (
                      <>
                        <Text
                          as="span"
                          tone={coverageTone}
                          variant="bodyMd"
                          fontWeight="semibold"
                        >
                          {`${row.coveragePercent}%`}
                        </Text>
                        <ProgressBar
                          progress={row.coveragePercent}
                          size="small"
                          tone="primary"
                        />
                      </>
                    ) : (
                      <Text as="span" tone="subdued" variant="bodySm">
                        {t("onboarding.suggestion.coveragePending")}
                      </Text>
                    )}
                  </BlockStack>

                  <BlockStack gap="100">
                    <Text as="span" variant="bodySm">
                      {t(actionKey)}
                    </Text>
                    <Text as="span" tone="subdued" variant="bodySm">
                      {t("onboarding.suggestion.actionHint")}
                    </Text>
                  </BlockStack>

                  <InlineStack align="start">
                    <Badge tone={getPriorityTone(row.priority)}>
                      {t(priorityKey)}
                    </Badge>
                  </InlineStack>
                </div>
              );
            })}
          </div>

          <div
            style={{
              borderRadius: "12px",
              padding: "14px 16px",
              background: "rgba(246, 246, 247, 0.82)",
              border: "1px solid rgba(138, 142, 145, 0.18)",
            }}
          >
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">
                {t("onboarding.suggestion.reasonTitle")}
              </Text>
              <InlineStack gap="200" wrap>
                {summary.recommendation.reasons.map((reasonKey) => (
                  <Badge key={reasonKey} tone="info">
                    {t(reasonKey)}
                  </Badge>
                ))}
              </InlineStack>
            </BlockStack>
          </div>
        </BlockStack>
      )}
    </LabeledCard>
  );
}

/** B. 店铺翻译健康度 —— 优先展示快扫结果，否则 loader 缓存 / 计算中 */
function TranslationHealth({
  summary,
  fastCoverage,
}: {
  summary: OnboardingSummary;
  fastCoverage: OnboardingFastCoverageSnapshot | null;
}) {
  const { t } = useTranslation();
  const cached = summary.coverage;

  if (fastCoverage && (fastCoverage.complete || fastCoverage.total > 0)) {
    const percent = fastCoverage.percent ?? 0;
    return (
      <LabeledCard
        title={t("onboarding.health.title")}
        subtitle={t("onboarding.health.subtitle")}
      >
        <BlockStack gap="300">
          <InlineStack gap="200" blockAlign="center" wrap>
            <Text as="span" variant="headingLg">
              {percent}%
            </Text>
            <Text as="span" tone="subdued">
              {t("onboarding.health.fastLocale", {
                locale: fastCoverage.localeLabel,
              })}
            </Text>
            <Badge tone="info">{t("onboarding.health.partialBadge")}</Badge>
          </InlineStack>
          <ProgressBar progress={percent} size="small" tone="primary" />
          <Text as="p" tone="subdued" variant="bodySm">
            {t("onboarding.health.fastHint", {
              done: fastCoverage.doneCount,
              total: fastCoverage.totalCount,
              translated: fastCoverage.translated,
              items: fastCoverage.total,
            })}
          </Text>
          <InlineStack gap="200" wrap>
            {fastCoverage.labels.map((row) => {
              const pct =
                row.total > 0
                  ? Math.min(100, Math.round((row.translated / row.total) * 100))
                  : null;
              return (
                <Badge key={row.label} tone={pct === 100 ? "success" : "attention"}>
                  {`${t(`onboarding.fastModule.${row.label}`, {
                    defaultValue: row.label,
                  })}${pct == null ? "" : ` ${pct}%`}`}
                </Badge>
              );
            })}
          </InlineStack>
          <Text as="p" tone="subdued" variant="bodySm">
            {t("onboarding.health.fullScanPending")}
          </Text>
        </BlockStack>
      </LabeledCard>
    );
  }

  if (cached?.overallPercent != null) {
    const percent = cached.overallPercent;
    return (
      <LabeledCard
        title={t("onboarding.health.title")}
        subtitle={t("onboarding.health.subtitle")}
      >
        <BlockStack gap="300">
          <InlineStack gap="200" blockAlign="center">
            <Text as="span" variant="headingLg">
              {percent}%
            </Text>
            <Text as="span" tone="subdued">
              {t("onboarding.health.overall")}
            </Text>
          </InlineStack>
          <ProgressBar progress={percent} size="small" tone="primary" />
          <Text as="p">{t("onboarding.health.partial")}</Text>
          {cached.topGaps.length > 0 ? (
            <Box>
              <Text as="p" tone="subdued" variant="bodySm">
                {t("onboarding.health.topGaps")}
              </Text>
              <InlineStack gap="200" wrap>
                {cached.topGaps.map((gap) => (
                  <Badge key={gap} tone="attention">
                    {gap}
                  </Badge>
                ))}
              </InlineStack>
            </Box>
          ) : null}
        </BlockStack>
      </LabeledCard>
    );
  }

  return (
    <LabeledCard
      title={t("onboarding.health.title")}
      subtitle={t("onboarding.health.subtitle")}
    >
      <BlockStack gap="200">
        <Text as="p" tone="subdued">
          {t("onboarding.health.computing")}
        </Text>
        <Text as="p" tone="subdued" variant="bodySm">
          {t("onboarding.health.fullScanPending")}
        </Text>
      </BlockStack>
    </LabeledCard>
  );
}

/** C. 预估积分与时间 */
function EstimatedCost({ summary }: { summary: OnboardingSummary }) {
  const { t } = useTranslation();
  const estimate = summary.estimate;
  const rows = buildSuggestionRows(summary);
  const priorityCount = rows.filter((row) => row.priority !== "optional").length;
  const moduleLabels = summary.recommendation.suggestedModuleKeys
    .map(
      (key) =>
        CREATE_TASK_MODULE_LABELS[
          key as keyof typeof CREATE_TASK_MODULE_LABELS
        ] ?? key,
    )
    .join(" · ");

  return (
    <LabeledCard
      title={t("onboarding.cost.title")}
      subtitle={t("onboarding.cost.subtitle")}
    >
      <BlockStack gap="300">
        <div
          style={{
            borderRadius: "14px",
            padding: "16px",
            background:
              "linear-gradient(135deg, rgba(240, 244, 255, 0.95), rgba(248, 248, 248, 0.95))",
            border: "1px solid rgba(138, 142, 145, 0.22)",
          }}
        >
          <BlockStack gap="100">
            <Text as="p" variant="bodySm" tone="subdued">
              {t("onboarding.cost.scopeLabel")}
            </Text>
            <Text as="p" variant="bodyMd">
              {t("onboarding.cost.scopeValue", { count: priorityCount })}
            </Text>
          </BlockStack>
        </div>

        {estimate?.credits != null ? (
          <InlineStack gap="500" wrap>
            <BlockStack gap="100">
              <Text as="span" tone="subdued" variant="bodySm">
                {t("onboarding.cost.credits")}
              </Text>
              <Text as="span" variant="headingMd">
                {estimate.isUpperBound ? "≈ " : ""}
                {formatEstimateCredits(estimate.credits)}
              </Text>
              <Text as="span" tone="subdued" variant="bodySm">
                {t("onboarding.cost.coverageTarget")}
              </Text>
            </BlockStack>
            {estimate.minutes != null ? (
              <BlockStack gap="100">
                <Text as="span" tone="subdued" variant="bodySm">
                  {t("onboarding.cost.time")}
                </Text>
                <Text as="span" variant="headingMd">
                  {t("onboarding.cost.minutes", { count: estimate.minutes })}
                </Text>
              </BlockStack>
            ) : null}
          </InlineStack>
        ) : (
          <Text as="p" tone="subdued">
            {t("onboarding.cost.unavailable")}
          </Text>
        )}

        <Box>
          <Text as="p" tone="subdued" variant="bodySm">
            {t("onboarding.cost.modules")}
          </Text>
          <Text as="p">{moduleLabels}</Text>
        </Box>

        {estimate?.needsMoreCredits ? (
          <Text as="p" tone="caution">
            {t("onboarding.cost.needMore")}
          </Text>
        ) : null}
      </BlockStack>
    </LabeledCard>
  );
}

export function RecommendationStep({
  summary,
  fastCoverage,
}: {
  summary: OnboardingSummary;
  fastCoverage: OnboardingFastCoverageSnapshot | null;
}) {
  return (
    <BlockStack gap="400">
      <RecommendationOverview summary={summary} />
      <SuggestedCoverageBoard summary={summary} />
      <TranslationHealth summary={summary} fastCoverage={fastCoverage} />
      <EstimatedCost summary={summary} />
    </BlockStack>
  );
}
