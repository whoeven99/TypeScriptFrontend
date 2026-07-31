import { useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { useFetcher, useNavigate } from "@remix-run/react";
import { useTranslation } from "react-i18next";
import { v4CardStyle, v4Colors } from "../v4Styles";
import {
  AI_MODEL_OPTIONS,
  CREATE_TASK_MODULE_LABELS,
} from "../constants";
import { localeRegionCode, localeShortName } from "../localeDisplay";
import { getV4AiModelLabel, getV4ModuleLabel } from "../v4I18n";
import {
  formatEstimateCredits,
  type CreateTaskEstimateView,
} from "../useCreateTaskEstimate";
import type { ShopLocaleOption } from "~/lib/createTranslateV4Tasks";
import Button from "~/ui/components/AppButton";

type Props = {
  open: boolean;
  creating: boolean;
  targetOptions: ShopLocaleOption[];
  targets: string[];
  modules: string[];
  aiModel: string;
  isCover: boolean;
  isHandle: boolean;
  estimate: CreateTaskEstimateView | null;
  quotaGateMode: "trial" | "pricing" | null;
  onClose: () => void;
  onConfirmCreate: () => void;
};

export function CreateTaskConfirmModal({
  open,
  creating,
  targetOptions,
  targets,
  modules,
  aiModel,
  isCover,
  isHandle,
  estimate,
  quotaGateMode,
  onClose,
  onConfirmCreate,
}: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const planFetcher = useFetcher<{
    success?: boolean;
    response?: { confirmationUrl?: string };
  }>();
  const modalBlocked = quotaGateMode !== null;

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !creating) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, creating, onClose]);

  useEffect(() => {
    if (!planFetcher.data?.success) return;
    const confirmationUrl = planFetcher.data.response?.confirmationUrl;
    if (confirmationUrl) {
      window.open(confirmationUrl, "_top");
    }
  }, [planFetcher.data]);

  const selectedTargets = useMemo(
    () =>
      [...targetOptions]
        .filter((option) => targets.includes(option.value))
        .map((option) => ({
          value: option.value,
          label: localeShortName(option.value, option.label),
          regionCode: localeRegionCode(option.value),
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [targetOptions, targets],
  );

  const selectedModules = useMemo(
    () =>
      modules.map((mod) => ({
        value: mod,
        label: getV4ModuleLabel(mod, t) || CREATE_TASK_MODULE_LABELS[mod] || mod,
      })),
    [modules, t],
  );

  const aiModelLabel = AI_MODEL_OPTIONS.some((option) => option.value === aiModel)
    ? getV4AiModelLabel(aiModel, t)
    : aiModel;
  const optionLabels = [
    isCover ? t("v4.createTask.overwriteExisting") : null,
    isHandle ? t("v4.createTask.translateHandle") : null,
  ].filter(Boolean) as string[];

  const estimateTitle = estimate?.loading
    ? t("v4.createTask.estimateLoading")
    : estimate?.estimatedCredits == null
      ? t("v4.createTask.estimateUnavailable")
      : estimate.isUpperBound
        ? t("v4.createTask.estimateUpperBound", {
            estimated: formatEstimateCredits(estimate.estimatedCredits),
          })
        : t("v4.createTask.estimateNeed", {
            estimated: formatEstimateCredits(estimate.estimatedCredits),
          });
  const remainingLabel =
    estimate?.remainingCredits != null
      ? t("v4.createTask.estimateRemaining", {
          remaining: formatEstimateCredits(estimate.remainingCredits),
        })
      : null;

  const title = modalBlocked
    ? quotaGateMode === "trial"
      ? t("v4.createTask.confirmBlockedTrialTitle")
      : t("v4.createTask.confirmBlockedPricingTitle")
    : t("v4.createTask.confirmTitle");
  const description = modalBlocked
    ? quotaGateMode === "trial"
      ? t("v4.createTask.confirmBlockedTrialDesc")
      : t("v4.createTask.confirmBlockedPricingDesc")
    : t("v4.createTask.confirmDescription");

  const handleTrialAction = () => {
    planFetcher.submit(
      {
        payForPlan: JSON.stringify({
          title: "Basic",
          monthlyPrice: 7.99,
          yearlyPrice: 6.39,
          yearly: false,
          trialDays: 5,
        }),
      },
      { method: "POST", action: "/app/pricing" },
    );
  };

  const handlePrimaryAction = () => {
    if (quotaGateMode === "trial") {
      handleTrialAction();
      return;
    }
    if (quotaGateMode === "pricing") {
      onClose();
      navigate("/app/pricing");
      return;
    }
    onConfirmCreate();
  };

  if (!open) return null;

  return (
    <div
      aria-modal="true"
      role="dialog"
      style={overlayStyle}
      onClick={() => {
        if (!creating) onClose();
      }}
    >
      <div
        style={panelStyle}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={headerStyle}>
          <div style={{ minWidth: 0 }}>
            <div style={titleStyle}>{title}</div>
            <div style={descriptionStyle}>{description}</div>
          </div>
          <button
            type="button"
            aria-label={t("Close")}
            onClick={onClose}
            disabled={creating}
            style={closeButtonStyle}
          >
            ×
          </button>
        </div>

        <div style={bodyStyle}>
          <div style={gridStyle}>
            <SummaryCard title={t("v4.createTask.targetLanguages")}>
              <TokenList
                items={selectedTargets.map((item) => `${item.regionCode} ${item.label}`)}
              />
            </SummaryCard>
            <SummaryCard title={t("v4.createTask.content")}>
              <TokenList items={selectedModules.map((item) => item.label)} />
            </SummaryCard>
          </div>

          <div style={gridStyle}>
            <SummaryCard title={t("v4.createTask.aiModel")}>
              <TokenList items={[aiModelLabel]} />
            </SummaryCard>
            <SummaryCard title={t("v4.createTask.translationOptions")}>
              {optionLabels.length > 0 ? (
                <TokenList items={optionLabels} />
              ) : (
                <div style={mutedTextStyle}>
                  {t("v4.createTask.confirmDefaultOptions")}
                </div>
              )}
            </SummaryCard>
          </div>

          <div
            style={{
              ...v4CardStyle,
              borderRadius: 16,
              padding: "16px 18px",
              background: modalBlocked || estimate?.needsMoreCredits
                ? "var(--app-accent-utility-soft)"
                : v4Colors.summaryBg,
            }}
          >
            <div style={eyebrowStyle}>{t("v4.createTask.confirmEstimateTitle")}</div>
            <div style={estimateTitleStyle}>{estimateTitle}</div>
            {remainingLabel ? (
              <div style={remainingStyle}>{remainingLabel}</div>
            ) : null}
            {estimate?.needsMoreCredits ? (
              <div style={warningStyle}>{t("v4.createTask.estimateShort")}</div>
            ) : null}
          </div>
        </div>

        <div style={footerStyle}>
          <Button
            onClick={onClose}
            disabled={creating}
            style={{ minWidth: 108, borderColor: v4Colors.cardBorder }}
          >
            {t("Cancel")}
          </Button>
          <Button
            type={modalBlocked ? "default" : "primary"}
            onClick={handlePrimaryAction}
            loading={creating || planFetcher.state === "submitting"}
            style={{
              minWidth: quotaGateMode === "trial" ? 160 : 140,
              borderColor: modalBlocked ? v4Colors.cardBorder : undefined,
            }}
          >
            {quotaGateMode === "trial"
              ? t("Free trial")
              : quotaGateMode === "pricing"
                ? t("v4.createTask.confirmViewPlans")
                : t("v4.createTask.confirmAction")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        ...v4CardStyle,
        borderRadius: 16,
        padding: "16px 18px",
        background: v4Colors.cardSubdued,
      }}
    >
      <div style={eyebrowStyle}>{title}</div>
      {children}
    </div>
  );
}

function TokenList({ items }: { items: string[] }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {items.map((item) => (
        <span key={item} style={tokenStyle}>
          {item}
        </span>
      ))}
    </div>
  );
}

const overlayStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 2147483100,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  background: "rgba(15, 23, 42, 0.32)",
} as const;

const panelStyle = {
  width: "min(720px, calc(100vw - 32px))",
  maxHeight: "min(720px, calc(100vh - 32px))",
  overflow: "hidden",
  borderRadius: 20,
  border: `1px solid ${v4Colors.cardBorder}`,
  background: v4Colors.cardBg,
  boxShadow: "var(--app-shadow-card-strong)",
  display: "flex",
  flexDirection: "column",
} as const;

const headerStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 16,
  padding: "24px 24px 20px",
  borderBottom: `1px solid ${v4Colors.divider}`,
} as const;

const bodyStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 16,
  padding: "20px 24px",
  overflowY: "auto",
} as const;

const footerStyle = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 12,
  flexWrap: "wrap",
  padding: "0 24px 24px",
} as const;

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14,
} as const;

const titleStyle = {
  margin: 0,
  fontSize: 24,
  fontWeight: 700,
  lineHeight: 1.25,
  color: v4Colors.text,
} as const;

const descriptionStyle = {
  marginTop: 12,
  color: v4Colors.textMuted,
  fontSize: 14,
  lineHeight: "22px",
  maxWidth: 560,
} as const;

const closeButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 32,
  height: 32,
  padding: 0,
  border: "none",
  background: "transparent",
  color: v4Colors.textMuted,
  fontSize: 22,
  lineHeight: 1,
  cursor: "pointer",
  flexShrink: 0,
} as const;

const eyebrowStyle = {
  display: "block",
  marginBottom: 10,
  fontSize: 12,
  fontWeight: 600,
  color: v4Colors.textMuted,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
} as const;

const estimateTitleStyle = {
  fontSize: 18,
  fontWeight: 600,
  color: v4Colors.text,
  lineHeight: 1.35,
} as const;

const remainingStyle = {
  marginTop: 6,
  color: v4Colors.textMuted,
  lineHeight: "22px",
} as const;

const warningStyle = {
  marginTop: 10,
  color: "var(--p-color-text-caution)",
  lineHeight: "22px",
} as const;

const mutedTextStyle = {
  color: v4Colors.textMuted,
  lineHeight: "22px",
} as const;

const tokenStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  borderRadius: 999,
  background: v4Colors.cardBg,
  border: `1px solid ${v4Colors.cardBorder}`,
  color: v4Colors.text,
  fontSize: 12,
  lineHeight: 1.35,
} as const;
