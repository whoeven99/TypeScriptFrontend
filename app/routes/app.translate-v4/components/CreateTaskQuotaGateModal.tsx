import { useFetcher, useNavigate } from "@remix-run/react";
import { useEffect, useState } from "react";
import { BlockStack, Button, InlineStack, Text } from "@shopify/polaris";
import { useTranslation } from "react-i18next";
import { v4CardStyle, v4Colors } from "../v4Styles";
import { V4ModalShell } from "~/components/V4ModalShell";

type Props = {
  open: boolean;
  mode: "trial" | "pricing";
  onClose: () => void;
};

export function CreateTaskQuotaGateModal({ open, mode, onClose }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const planFetcher = useFetcher<{ success?: boolean; response?: { confirmationUrl?: string } }>();
  const [pendingAction, setPendingAction] = useState<"trial" | "subscribe" | null>(null);

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

  const submitBasicPlan = (trialDays: number, action: "trial" | "subscribe") => {
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
  const title = isTrial
    ? t("No credits left. Start your 5 days free trial")
    : t("Your credits are empty. Upgrade to keep translations moving");
  const description = isTrial
    ? null
    : t("Your free trial has already been used. Subscribe to a paid plan to restore monthly credits and continue creating translation tasks.");
  const nextStepLabel = t("Upgrade plan");
  const nextStepDescription = t("Move to a paid plan to get fresh monthly credits for new tasks.");
  const trialHighlights = [
    t("Get 1,500,000 credits immediately, a $9.99 value"),
    t("Launch this translation task right away"),
    t("Translate products, pages, and more with trial credits"),
    t("Cancel within 5 days for no charge"),
  ];
  const unlockItems = isTrial
    ? [
        t("Launch this translation task immediately"),
        t("Translate products, pages, and more with your trial credits"),
        t("Use glossary and advanced translation workflow features during the trial"),
      ]
    : [
        t("Translation access for products, pages, and more"),
        t("Glossary and advanced translation workflow support"),
        t("Monthly plan credits so your team can keep shipping multilingual content"),
      ];

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
              {t("Translation credits")}
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
                {trialHighlights.map((item) => (
                  <div key={item} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
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
                      {item}
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
                  {t("Next step")}
                </div>
                <div
                  style={{
                    marginBottom: 8,
                  }}
                >
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
                  {t("Included after upgrade")}
                </div>
                <BlockStack gap="200">
                  {unlockItems.map((item) => (
                    <div key={item} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
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
                        {item}
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
              <div style={{ minWidth: 220 }}>
                <Button
                  fullWidth
                  size="large"
                  variant="secondary"
                  onClick={handleTrialAction}
                  loading={pendingAction === "trial" && planFetcher.state === "submitting"}
                >
                  {t("Free trial")}
                </Button>
              </div>
            ) : (
              <div style={{ minWidth: 124 }}>
                <Button
                  fullWidth
                  size="large"
                  variant="secondary"
                  onClick={onClose}
                >
                  {t("Maybe later")}
                </Button>
              </div>
            )}
            {!isTrial ? (
              <div style={{ minWidth: 160 }}>
                <Button
                  fullWidth
                  size="large"
                  variant="primary"
                  onClick={handlePrimaryAction}
                  loading={pendingAction === "subscribe" && planFetcher.state === "submitting"}
                >
                  {t("View Plans")}
                </Button>
              </div>
            ) : (
              <div
                style={{
                  minWidth: 220,
                  alignSelf: "center",
                }}
              >
                <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                  {t("Charged after 5 days")}
                </Text>
              </div>
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
