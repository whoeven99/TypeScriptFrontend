import { useFetcher, useNavigate } from "@remix-run/react";
import { useEffect, useState } from "react";
import { BlockStack, Button, InlineStack, Text } from "@shopify/polaris";
import { useTranslation } from "react-i18next";
import { V4ModalShell } from "~/components/V4ModalShell";
import { v4CardStyle, v4Colors } from "../v4Styles";

type Props = {
  open: boolean;
  mode: "trial" | "pricing";
  onClose: () => void;
};

export function CreateTaskQuotaGateModal({ open, mode, onClose }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const planFetcher = useFetcher<{
    success?: boolean;
    response?: { confirmationUrl?: string };
  }>();
  const [pendingAction, setPendingAction] = useState<
    "trial" | "subscribe" | null
  >(null);

  useEffect(() => {
    if (!planFetcher.data?.success) return;
    const confirmationUrl = planFetcher.data.response?.confirmationUrl;
    if (confirmationUrl) openUrl(confirmationUrl);
  }, [planFetcher.data]);

  useEffect(() => {
    if (planFetcher.state === "idle") {
      setPendingAction(null);
    }
  }, [planFetcher.state]);

  const submitBasicPlan = (
    trialDays: number,
    action: "trial" | "subscribe",
  ) => {
    setPendingAction(action);
    planFetcher.submit(
      {
        payForPlan: JSON.stringify({
          title: "Basic",
          monthlyPrice: 7.99,
          yearlyPrice: 6.39,
          yearly: false,
          trialDays,
        }),
      },
      { method: "POST", action: "/app/pricing" },
    );
  };

  const handlePrimaryAction = () => {
    if (mode === "trial") {
      submitBasicPlan(0, "subscribe");
      return;
    }

    onClose();
    navigate("/app/pricing");
  };

  const handleTrialAction = () => {
    submitBasicPlan(5, "trial");
  };

  const isTrial = mode === "trial";
  const trialHighlightKeys = [
    "v4.quotaGate.trialHighlight1",
    "v4.quotaGate.trialHighlight2",
    "v4.quotaGate.trialHighlight3",
    "v4.quotaGate.trialHighlight4",
  ] as const;
  const trialUnlockKeys = [
    "v4.quotaGate.trialUnlock1",
    "v4.quotaGate.trialUnlock2",
    "v4.quotaGate.trialUnlock3",
  ] as const;
  const pricingUnlockKeys = [
    "v4.quotaGate.pricingUnlock1",
    "v4.quotaGate.pricingUnlock2",
    "v4.quotaGate.pricingUnlock3",
  ] as const;
  const title = isTrial
    ? t("v4.quotaGate.trialTitle")
    : t("v4.quotaGate.pricingTitle");
  const description = isTrial ? null : t("v4.quotaGate.pricingDescription");
  const nextStepLabel = t("v4.quotaGate.upgradePlan");
  const nextStepDescription = t("v4.quotaGate.upgradePlanDescription");
  const unlockKeys = isTrial ? trialUnlockKeys : pricingUnlockKeys;

  return (
    <V4ModalShell open={open} onClose={onClose} width={560}>
      <div style={{ padding: "24px 24px 20px" }}>
        <div
          style={{
            paddingBottom: 20,
            marginBottom: 20,
            borderBottom: `1px solid ${v4Colors.divider}`,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "4px 10px",
              borderRadius: 999,
              background: v4Colors.primarySoft,
              color: v4Colors.primary,
              marginBottom: 12,
            }}
          >
            <Text as="span" variant="bodySm" fontWeight="semibold">
              {t("v4.quotaGate.badge")}
            </Text>
          </div>
          <Text as="h2" variant="headingLg" fontWeight="bold">
            {title}
          </Text>
          {description ? (
            <div
              style={{
                marginTop: 12,
                color: v4Colors.textMuted,
                maxWidth: 460,
              }}
            >
              <Text as="p" variant="bodyMd" tone="subdued">
                {description}
              </Text>
            </div>
          ) : null}
        </div>

        <BlockStack gap="400">
          {isTrial ? (
            <div
              style={{
                ...v4CardStyle,
                background: v4Colors.summaryBg,
                padding: "16px 18px",
                borderRadius: 16,
              }}
            >
              <BlockStack gap="200">
                {trialHighlightKeys.map((key) => (
                  <div
                    key={key}
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                    }}
                  >
                    <span
                      aria-hidden
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: v4Colors.primary,
                        marginTop: 7,
                        flexShrink: 0,
                      }}
                    />
                    <Text as="span" variant="bodyMd">
                      {t(key)}
                    </Text>
                  </div>
                ))}
              </BlockStack>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 12,
              }}
            >
              <div
                style={{
                  ...v4CardStyle,
                  background: v4Colors.summaryBg,
                  padding: "16px 18px",
                  borderRadius: 16,
                }}
              >
                <div
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    color: v4Colors.textMuted,
                    marginBottom: 8,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  {t("v4.quotaGate.nextStep")}
                </div>
                <div style={{ marginBottom: 8 }}>
                  <Text as="h3" variant="headingSm" fontWeight="semibold">
                    {nextStepLabel}
                  </Text>
                </div>
                <Text as="p" variant="bodyMd" tone="subdued">
                  {nextStepDescription}
                </Text>
              </div>

              <div
                style={{
                  ...v4CardStyle,
                  background: v4Colors.cardSubdued,
                  padding: "16px 18px",
                  borderRadius: 16,
                }}
              >
                <div
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    color: v4Colors.textMuted,
                    marginBottom: 10,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  {t("v4.quotaGate.includedAfterUpgrade")}
                </div>
                <BlockStack gap="200">
                  {unlockKeys.map((key) => (
                    <div
                      key={key}
                      style={{
                        display: "flex",
                        gap: 10,
                        alignItems: "flex-start",
                      }}
                    >
                      <span
                        aria-hidden
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: v4Colors.primary,
                          marginTop: 7,
                          flexShrink: 0,
                        }}
                      />
                      <Text as="span" variant="bodyMd">
                        {t(key)}
                      </Text>
                    </div>
                  ))}
                </BlockStack>
              </div>
            </div>
          )}

          <div style={{ paddingTop: 4 }}>
            <InlineStack align="end" gap="300">
              {isTrial ? (
                <>
                  <div style={{ minWidth: 220 }}>
                    <Button
                      fullWidth
                      size="large"
                      variant="secondary"
                      onClick={handleTrialAction}
                      loading={
                        pendingAction === "trial" &&
                        planFetcher.state === "submitting"
                      }
                    >
                      {t("v4.quotaGate.freeTrial")}
                    </Button>
                  </div>
                  <div
                    style={{
                      minWidth: 220,
                      alignSelf: "center",
                    }}
                  >
                    <Text
                      as="p"
                      variant="bodySm"
                      tone="subdued"
                      alignment="center"
                    >
                      {t("v4.quotaGate.chargedAfter5Days")}
                    </Text>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ minWidth: 124 }}>
                    <Button
                      fullWidth
                      size="large"
                      variant="secondary"
                      onClick={onClose}
                    >
                      {t("v4.quotaGate.maybeLater")}
                    </Button>
                  </div>
                  <div style={{ minWidth: 160 }}>
                    <Button
                      fullWidth
                      size="large"
                      variant="primary"
                      onClick={handlePrimaryAction}
                      loading={
                        pendingAction === "subscribe" &&
                        planFetcher.state === "submitting"
                      }
                    >
                      {t("v4.quotaGate.viewPlans")}
                    </Button>
                  </div>
                </>
              )}
            </InlineStack>
          </div>
        </BlockStack>
      </div>
    </V4ModalShell>
  );
}

function openUrl(url: string) {
  open(url, "_top");
}
