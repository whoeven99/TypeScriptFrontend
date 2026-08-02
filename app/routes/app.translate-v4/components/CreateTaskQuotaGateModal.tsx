import { useFetcher, useNavigate } from "@remix-run/react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { v4CardStyle, v4Colors } from "../v4Styles";
import V4Button from "./V4Button";
import { V4Modal } from "./V4Modal";

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
    <V4Modal open={open} onClose={onClose} width={560} label={title}>
      <div style={{ padding: "24px 24px 20px" }}>
        <div
          style={{
            paddingBottom: 20,
            marginBottom: 20,
            borderBottom: `1px solid ${v4Colors.divider}`,
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "4px 10px",
              borderRadius: 999,
              background: v4Colors.primarySoft,
              color: v4Colors.primary,
              fontSize: 12,
              fontWeight: 600,
              lineHeight: "20px",
              marginBottom: 12,
            }}
          >
            {t("Translation credits")}
          </span>
          <h3
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 600,
              lineHeight: 1.25,
              color: v4Colors.text,
            }}
          >
            {title}
          </h3>
          {description ? (
            <p
              style={{
                marginTop: 12,
                marginBottom: 0,
                color: v4Colors.textMuted,
                fontSize: 14,
                lineHeight: "22px",
                maxWidth: 460,
              }}
            >
              {description}
            </p>
          ) : null}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {isTrial ? (
            <div
              style={{
                ...v4CardStyle,
                background: v4Colors.summaryBg,
                padding: "16px 18px",
                borderRadius: 16,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
                    <span style={{ color: v4Colors.text, lineHeight: "22px" }}>{item}</span>
                  </div>
                ))}
              </div>
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
                <span
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
                </span>
                <span
                  style={{
                    display: "block",
                    fontSize: 16,
                    fontWeight: 600,
                    color: v4Colors.text,
                    marginBottom: 8,
                    lineHeight: 1.4,
                  }}
                >
                  {nextStepLabel}
                </span>
                <span style={{ color: v4Colors.textMuted, lineHeight: "22px" }}>
                  {nextStepDescription}
                </span>
              </div>

              <div
                style={{
                  ...v4CardStyle,
                  background: v4Colors.cardSubdued,
                  padding: "16px 18px",
                  borderRadius: 16,
                }}
              >
                <span
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
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
                      <span style={{ color: v4Colors.text, lineHeight: "22px" }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 12,
              flexWrap: "wrap",
              paddingTop: 4,
            }}
          >
            {isTrial ? (
              <V4Button
                onClick={handleTrialAction}
                loading={pendingAction === "trial" && planFetcher.state === "submitting"}
                style={{
                  minWidth: 220,
                  height: "auto",
                  paddingBlock: 8,
                  borderColor: v4Colors.cardBorder,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    lineHeight: 1.25,
                  }}
                >
                  <span style={{ color: "inherit", fontWeight: 600 }}>
                    {t("Free trial")}
                  </span>
                  <span style={{ color: "inherit", opacity: 0.72, fontSize: 12 }}>
                    {t("Charged after 5 days")}
                  </span>
                </div>
              </V4Button>
            ) : (
              <V4Button
                onClick={onClose}
                style={{
                  minWidth: 108,
                  borderColor: v4Colors.cardBorder,
                }}
              >
                {t("Maybe later")}
              </V4Button>
            )}
            {!isTrial ? (
              <V4Button
                type="primary"
                onClick={handlePrimaryAction}
                loading={pendingAction === "subscribe" && planFetcher.state === "submitting"}
                style={{ minWidth: 140 }}
              >
                {t("View Plans")}
              </V4Button>
            ) : null}
          </div>
        </div>
      </div>
    </V4Modal>
  );
}

function openUrl(url: string) {
  open(url, "_top");
}
