import {
  Card,
  BlockStack,
  InlineStack,
  Text,
  Badge,
  List,
  Box,
  Divider,
  ProgressBar,
} from "@shopify/polaris";
import { useTranslation } from "react-i18next";
import type { OnboardingSummary } from "../types";
import { CREATE_TASK_MODULE_LABELS } from "~/routes/app.translate-v4/constants";
import { formatEstimateCredits } from "~/routes/app.translate-v4/useCreateTaskEstimate";

function LabeledCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <BlockStack gap="300">
        <Text as="h2" variant="headingMd">
          {title}
        </Text>
        <Divider />
        {children}
      </BlockStack>
    </Card>
  );
}

/** A. 推荐语言 */
function RecommendedLanguages({ summary }: { summary: OnboardingSummary }) {
  const { t } = useTranslation();
  const labelByLocale = new Map(
    summary.locales.availableTargets.map((tgt) => [tgt.value, tgt.label]),
  );
  const suggested = summary.locales.suggestedTargets;

  return (
    <LabeledCard title={t("onboarding.languages.title")}>
      {suggested.length === 0 ? (
        <Text as="p" tone="subdued">
          {t("onboarding.languages.empty")}
        </Text>
      ) : (
        <BlockStack gap="300">
          <InlineStack gap="200" wrap>
            {suggested.map((locale) => (
              <Badge key={locale} tone="info">
                {labelByLocale.get(locale) ?? locale}
              </Badge>
            ))}
          </InlineStack>
          <List type="bullet">
            {summary.recommendation.reasons.map((reasonKey) => (
              <List.Item key={reasonKey}>{t(reasonKey)}</List.Item>
            ))}
          </List>
        </BlockStack>
      )}
    </LabeledCard>
  );
}

/** B. 店铺翻译健康度 */
function TranslationHealth({ summary }: { summary: OnboardingSummary }) {
  const { t } = useTranslation();
  const coverage = summary.coverage;

  if (!coverage || coverage.overallPercent == null) {
    return (
      <LabeledCard title={t("onboarding.health.title")}>
        <Text as="p" tone="subdued">
          {t("onboarding.health.computing")}
        </Text>
      </LabeledCard>
    );
  }

  const percent = coverage.overallPercent;
  return (
    <LabeledCard title={t("onboarding.health.title")}>
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
        {coverage.topGaps.length > 0 ? (
          <Box>
            <Text as="p" tone="subdued" variant="bodySm">
              {t("onboarding.health.topGaps")}
            </Text>
            <InlineStack gap="200" wrap>
              {coverage.topGaps.map((gap) => (
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

/** C. 预估积分与时间 */
function EstimatedCost({ summary }: { summary: OnboardingSummary }) {
  const { t } = useTranslation();
  const estimate = summary.estimate;
  const moduleLabels = summary.recommendation.suggestedModuleKeys
    .map((key) => CREATE_TASK_MODULE_LABELS[key as keyof typeof CREATE_TASK_MODULE_LABELS] ?? key)
    .join(" · ");

  return (
    <LabeledCard title={t("onboarding.cost.title")}>
      <BlockStack gap="300">
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

export function RecommendationStep({ summary }: { summary: OnboardingSummary }) {
  const { t } = useTranslation();
  return (
    <BlockStack gap="400">
      <BlockStack gap="100">
        <Text as="h1" variant="headingLg">
          {t("onboarding.recommendation.title")}
        </Text>
        <Text as="p" tone="subdued">
          {t("onboarding.recommendation.subtitle")}
        </Text>
      </BlockStack>
      <RecommendedLanguages summary={summary} />
      <TranslationHealth summary={summary} />
      <EstimatedCost summary={summary} />
    </BlockStack>
  );
}
