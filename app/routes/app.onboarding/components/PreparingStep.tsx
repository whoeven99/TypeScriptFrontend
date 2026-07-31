import { useEffect, useState } from "react";
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

/** Preparing 页进度项（方案 8.1 建议展示项）。 */
const PROGRESS_ITEM_KEYS = [
  "onboarding.preparing.step.structure",
  "onboarding.preparing.step.data",
  "onboarding.preparing.step.market",
  "onboarding.preparing.step.coverage",
  "onboarding.preparing.step.recommendation",
] as const;

export function PreparingStep({ summary }: { summary: OnboardingSummary }) {
  const { t } = useTranslation();
  const [doneCount, setDoneCount] = useState(0);

  // 逐项点亮，绑定“正在准备”的过程感（约 2s 内走完）。
  useEffect(() => {
    if (doneCount >= PROGRESS_ITEM_KEYS.length) return;
    const timer = window.setTimeout(() => {
      setDoneCount((c) => Math.min(PROGRESS_ITEM_KEYS.length, c + 1));
    }, 380);
    return () => window.clearTimeout(timer);
  }, [doneCount]);

  const progress = Math.round((doneCount / PROGRESS_ITEM_KEYS.length) * 100);

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
          {PROGRESS_ITEM_KEYS.map((key, index) => {
            const done = index < doneCount;
            return (
              <InlineStack key={key} gap="200" blockAlign="center">
                <Box minWidth="20px">
                  {done ? (
                    <Icon source={CheckIcon} tone="success" />
                  ) : (
                    <Text as="span" tone="subdued">
                      …
                    </Text>
                  )}
                </Box>
                <Text as="span" tone={done ? "base" : "subdued"}>
                  {t(key)}
                </Text>
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
