import { Card, BlockStack, InlineStack, Button, Text } from "@shopify/polaris";
import { useTranslation } from "react-i18next";

export type PrimaryCtaKind = "create" | "trial" | "upgrade" | "configure";

const PRIMARY_LABEL_KEY: Record<PrimaryCtaKind, string> = {
  create: "onboarding.action.createTask",
  trial: "onboarding.action.startTrial",
  upgrade: "onboarding.action.upgrade",
  configure: "onboarding.action.configureLanguages",
};

export function ActionFooter({
  primaryCta,
  creating,
  onPrimary,
  onCustomize,
  onSkip,
}: {
  primaryCta: PrimaryCtaKind;
  creating: boolean;
  onPrimary: () => void;
  onCustomize: () => void;
  onSkip: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Card>
      <BlockStack gap="300">
        <InlineStack gap="300" align="space-between" blockAlign="center" wrap>
          <Button
            variant="primary"
            size="large"
            loading={creating && primaryCta === "create"}
            onClick={onPrimary}
          >
            {t(PRIMARY_LABEL_KEY[primaryCta])}
          </Button>
          <InlineStack gap="200">
            <Button variant="tertiary" onClick={onCustomize}>
              {t("onboarding.action.customize")}
            </Button>
            <Button variant="plain" onClick={onSkip}>
              {t("onboarding.action.skip")}
            </Button>
          </InlineStack>
        </InlineStack>
        <Text as="p" tone="subdued" variant="bodySm">
          {t("onboarding.action.hint")}
        </Text>
      </BlockStack>
    </Card>
  );
}
