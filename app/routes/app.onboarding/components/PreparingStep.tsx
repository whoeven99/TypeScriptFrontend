import {
  Card,
  BlockStack,
  InlineStack,
  Text,
  ProgressBar,
  Icon,
  Box,
} from "@shopify/polaris";
import { CheckIcon } from "@shopify/polaris-icons";
import { useTranslation } from "react-i18next";
import type { OnboardingSummary } from "../types";

export type PreparingPhase =
  | "boot"
  | "locales"
  | "coverage"
  | "recommendation"
  | "done";

const PHASE_ORDER: PreparingPhase[] = [
  "boot",
  "locales",
  "coverage",
  "recommendation",
  "done",
];

/** 每行在 phase 达到该下标时勾选完成（coverage 行在进入 recommendation 后才勾）。 */
const PHASE_ROWS: Array<{ key: string; doneAt: PreparingPhase }> = [
  { key: "onboarding.preparing.step.structure", doneAt: "locales" },
  { key: "onboarding.preparing.step.data", doneAt: "locales" },
  { key: "onboarding.preparing.step.market", doneAt: "coverage" },
  { key: "onboarding.preparing.step.coverage", doneAt: "recommendation" },
  { key: "onboarding.preparing.step.recommendation", doneAt: "done" },
];

function phaseReached(current: PreparingPhase, target: PreparingPhase): boolean {
  return PHASE_ORDER.indexOf(current) >= PHASE_ORDER.indexOf(target);
}

export function PreparingStep({
  summary,
  phase,
  coverageDone,
  coverageTotal,
  activeLabel,
  coverageLocaleLabel,
}: {
  summary: OnboardingSummary;
  phase: PreparingPhase;
  coverageDone: number;
  coverageTotal: number;
  activeLabel: string | null;
  coverageLocaleLabel: string | null;
}) {
  const { t } = useTranslation();

  const doneCount = PHASE_ROWS.filter((row) =>
    phaseReached(phase, row.doneAt),
  ).length;
  let progress = Math.round((doneCount / PHASE_ROWS.length) * 100);
  if (phase === "coverage" && coverageTotal > 0) {
    progress = Math.min(
      90,
      60 + Math.round((coverageDone / coverageTotal) * 30),
    );
  }
  if (phase === "done") progress = 100;

  return (
    <Card>
      <BlockStack gap="500">
        <BlockStack gap="200">
          <Text as="h1" variant="headingLg">
            {t("onboarding.preparing.welcome")}
          </Text>
          <Text as="p" tone="subdued">
            {t("onboarding.preparing.subtitle")}
          </Text>
        </BlockStack>

        <ProgressBar progress={progress} size="small" tone="primary" />

        <BlockStack gap="200">
          {PHASE_ROWS.map((row) => {
            const done = phaseReached(phase, row.doneAt);
            const isCoverageRow =
              row.key === "onboarding.preparing.step.coverage";
            const active = phase === "coverage" && isCoverageRow;
            return (
              <InlineStack key={row.key} gap="200" blockAlign="center">
                <Box minWidth="20px">
                  {done ? (
                    <Icon source={CheckIcon} tone="success" />
                  ) : (
                    <Text as="span" tone="subdued">
                      …
                    </Text>
                  )}
                </Box>
                <BlockStack gap="100">
                  <Text as="span" tone={done || active ? "base" : "subdued"}>
                    {t(row.key)}
                  </Text>
                  {active && coverageLocaleLabel ? (
                    <Text as="span" tone="subdued" variant="bodySm">
                      {t("onboarding.preparing.coverageProgress", {
                        locale: coverageLocaleLabel,
                        done: coverageDone,
                        total: coverageTotal,
                        module: activeLabel
                          ? t(`onboarding.fastModule.${activeLabel}`, {
                              defaultValue: activeLabel,
                            })
                          : "…",
                      })}
                    </Text>
                  ) : null}
                </BlockStack>
              </InlineStack>
            );
          })}
        </BlockStack>

        <Text as="p" tone="subdued" variant="bodySm">
          {t("onboarding.preparing.hint", {
            count: summary.locales.suggestedTargets.length,
          })}
        </Text>
      </BlockStack>
    </Card>
  );
}
