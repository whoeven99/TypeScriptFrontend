import { useTranslation } from "react-i18next";
import {
  formatExpandCredits,
  type OnboardingUpgradeOffer,
} from "~/lib/expandMarket";
import AppButton from "~/ui/components/AppButton";
import AppStatusBadge from "~/ui/components/AppStatusBadge";

type Props = {
  language: string;
  offer: OnboardingUpgradeOffer;
  /** 已订阅（含 returnUrl subscribed=1）：只推开启自动更新。 */
  subscribed: boolean;
  subscribing: boolean;
  enablingAuto: boolean;
  onSubscribe: () => void;
  onEnableAutoTranslate: () => void;
};

/**
 * 起步包成功后：
 * - 未订阅：主推订阅，避免把订阅前不可完成的自动更新作为同级动作
 * - 已订阅：只推开启本语言自动更新
 */
export function OnboardingNextSteps({
  language,
  offer,
  subscribed,
  subscribing,
  enablingAuto,
  onSubscribe,
  onEnableAutoTranslate,
}: Props) {
  const { t } = useTranslation();
  const sub = offer.recommendedSubscription;
  const busy = subscribing || enablingAuto;

  if (subscribed) {
    return (
      <div
        style={{
          marginTop: 16,
          padding: 14,
          borderRadius: 10,
          border: "1px solid var(--app-color-border-secondary)",
          background: "var(--p-color-bg-surface)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              alignItems: "center",
              marginBottom: 6,
            }}
          >
            <AppStatusBadge tone="success">
              {t("expand.nextSubscribedBadge")}
            </AppStatusBadge>
            <AppStatusBadge tone="info">
              {t("expand.nextFinalStepBadge")}
            </AppStatusBadge>
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              lineHeight: "24px",
              color: "var(--app-color-text)",
              marginBottom: 6,
            }}
          >
            {t("expand.nextAutoTitle", { language })}
          </div>
          <div
            style={{
              fontSize: 13,
              lineHeight: "20px",
              color: "var(--app-color-text-secondary)",
            }}
          >
            {t("expand.nextAutoBody", { language })}
          </div>
        </div>

        <div>
          <AppButton
            type="primary"
            size="small"
            loading={enablingAuto}
            disabled={busy}
            onClick={onEnableAutoTranslate}
          >
            {t("expand.nextEnableAutoCompleteCta")}
          </AppButton>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        marginTop: 16,
        padding: 14,
        borderRadius: 10,
        border: "1px solid var(--app-color-border-secondary)",
        background: "var(--p-color-bg-surface)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            lineHeight: "24px",
            color: "var(--app-color-text)",
            marginBottom: 6,
          }}
        >
          {t("expand.nextSubscribeTitle")}
        </div>
        <div
          style={{
            fontSize: 13,
            lineHeight: "20px",
            color: "var(--app-color-text-secondary)",
          }}
        >
          {t("expand.nextSubscribeBody", { language })}
        </div>
      </div>

      <div
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: "var(--app-color-text-secondary)",
          lineHeight: "20px",
        }}
      >
        <span style={{ fontWeight: 650, color: "var(--app-color-text)" }}>
          {sub.title}
        </span>
        <span
          style={{
            marginLeft: 6,
            fontWeight: 650,
            color: "var(--p-color-text-info)",
          }}
        >
          {sub.currencyCode} {sub.monthlyPrice.toFixed(2)}
          {t("expand.nextPerMonth")}
        </span>
        <span
          style={{
            marginLeft: 6,
            fontWeight: 500,
            color: "var(--app-color-text-secondary)",
          }}
        >
          · {t("expand.nextSubCredits", {
            credits: formatExpandCredits(sub.creditsPerMonth),
          })}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
        }}
      >
        <AppButton
          type="primary"
          size="small"
          loading={subscribing}
          disabled={busy}
          onClick={onSubscribe}
        >
          {t("expand.nextSubscribeCta", {
            plan: sub.title,
            price: sub.monthlyPrice.toFixed(2),
            currency: sub.currencyCode,
          })}
        </AppButton>
      </div>
    </div>
  );
}
