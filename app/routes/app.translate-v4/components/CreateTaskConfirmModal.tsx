import { useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { useFetcher, useNavigate } from "@remix-run/react";
import { useTranslation } from "react-i18next";
import { v4Colors } from "../v4Styles";
import {
  AI_MODEL_OPTIONS,
  CREATE_TASK_MODULE_LABELS,
} from "../constants";
import { localeRegionCode, localeShortName } from "../localeDisplay";
import { getV4AiModelLabel, getV4ModuleLabel } from "../v4I18n";
import {
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

  const estimatedCreditsLabel =
    estimate?.estimatedCredits != null
      ? formatCreditsFull(estimate.estimatedCredits)
      : null;
  const remainingCreditsLabel =
    estimate?.remainingCredits != null
      ? formatCreditsFull(estimate.remainingCredits)
      : null;
  const shortfallCredits =
    estimate?.estimatedCredits != null && estimate?.remainingCredits != null
      ? Math.max(estimate.estimatedCredits - estimate.remainingCredits, 0)
      : null;
  const shortfallCreditsLabel =
    shortfallCredits != null && shortfallCredits > 0
      ? formatCreditsFull(shortfallCredits)
      : null;
  const estimateTitle = estimate?.loading
    ? t("v4.createTask.estimateLoading")
    : estimate?.estimatedCredits == null
      ? t("v4.createTask.estimateUnavailable")
      : estimate.isUpperBound
        ? t("v4.createTask.estimateUpperBound", {
            estimated: formatCreditsFull(estimate.estimatedCredits),
          })
        : t("v4.createTask.estimateNeed", {
            estimated: formatCreditsFull(estimate.estimatedCredits),
          });
  const remainingLabel =
    estimate?.remainingCredits != null
      ? t("v4.createTask.estimateRemaining", {
          remaining: formatCreditsFull(estimate.remainingCredits),
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
          <SummaryRow title={t("v4.createTask.targetLanguages")}>
            <PlainList
              items={selectedTargets.map((item) => `${item.regionCode} ${item.label}`)}
              columns={2}
            />
          </SummaryRow>

          <SummaryRow title={t("v4.createTask.content")}>
            <PlainList items={selectedModules.map((item) => item.label)} columns={2} />
          </SummaryRow>

          <SummaryRow title={t("v4.createTask.aiModel")}>
            <div style={valueTextStyle}>{aiModelLabel}</div>
          </SummaryRow>

          <SummaryRow title={t("v4.createTask.translationOptions")}>
            {optionLabels.length > 0 ? (
              <PlainList items={optionLabels} />
            ) : (
              <div style={mutedTextStyle}>
                {t("v4.createTask.confirmDefaultOptions")}
              </div>
            )}
          </SummaryRow>

          <SummaryRow
            title={t("v4.createTask.confirmEstimateTitle")}
            emphasize={modalBlocked || Boolean(estimate?.needsMoreCredits)}
          >
            {estimatedCreditsLabel && remainingCreditsLabel ? (
              <>
                <div style={creditHeadlineStyle}>
                  <span
                    style={{
                      ...creditHeadlineNumberStyle,
                      color:
                        modalBlocked || Boolean(estimate?.needsMoreCredits)
                          ? "var(--p-color-text-caution)"
                          : v4Colors.text,
                    }}
                  >
                    {estimatedCreditsLabel}
                  </span>
                  <span style={creditSlashStyle}>/</span>
                  <span
                    style={{
                      ...creditHeadlineNumberStyle,
                      color:
                        modalBlocked || Boolean(estimate?.needsMoreCredits)
                          ? "var(--p-color-text-caution)"
                          : v4Colors.text,
                    }}
                  >
                    {remainingCreditsLabel}
                  </span>
                </div>

                <div style={creditMetaRowStyle}>
                  <div style={creditMetaItemStyle}>
                    <span style={creditMetaLabelStyle}>
                      {t("v4.createTask.confirmEstimateNeedLabel")}
                    </span>
                    <span style={creditMetaValueStyle}>{estimatedCreditsLabel}</span>
                  </div>
                  <div style={creditMetaItemStyle}>
                    <span style={creditMetaLabelStyle}>
                      {t("v4.createTask.confirmEstimateLeftLabel")}
                    </span>
                    <span
                      style={{
                        ...creditMetaValueStyle,
                        color:
                          modalBlocked || Boolean(estimate?.needsMoreCredits)
                            ? "var(--p-color-text-caution)"
                            : v4Colors.text,
                      }}
                    >
                      {remainingCreditsLabel}
                    </span>
                  </div>
                  {shortfallCreditsLabel ? (
                    <div style={creditMetaItemStyle}>
                      <span style={creditMetaLabelStyle}>
                        {t("v4.createTask.confirmEstimateShortLabel")}
                      </span>
                      <span
                        style={{
                          ...creditMetaValueStyle,
                          color: "var(--p-color-text-caution)",
                        }}
                      >
                        {shortfallCreditsLabel}
                      </span>
                    </div>
                  ) : null}
                </div>

                <div style={estimateHintStyle}>{estimateTitle}</div>
              </>
            ) : (
              <div style={estimateTitleStyle}>{estimateTitle}</div>
            )}
            {!estimatedCreditsLabel && remainingLabel ? (
              <div style={remainingStyle}>{remainingLabel}</div>
            ) : null}
            {estimate?.needsMoreCredits ? (
              <div style={warningStyle}>{t("v4.createTask.estimateShort")}</div>
            ) : null}
          </SummaryRow>
        </div>

        <div style={footerStyle}>
          <Button
            size="large"
            onClick={onClose}
            disabled={creating}
            style={{
              minWidth: 116,
              paddingInline: 18,
              borderColor: v4Colors.cardBorder,
            }}
          >
            {t("Cancel")}
          </Button>
          <Button
            size="large"
            type={modalBlocked ? "default" : "primary"}
            onClick={handlePrimaryAction}
            loading={creating || planFetcher.state === "submitting"}
            style={{
              minWidth: quotaGateMode === "trial" ? 172 : 152,
              paddingInline: 20,
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

function SummaryRow({
  title,
  children,
  emphasize = false,
}: {
  title: string;
  children: ReactNode;
  emphasize?: boolean;
}) {
  return (
    <div
      style={{
        ...rowStyle,
        background: emphasize ? "var(--app-accent-utility-soft)" : "transparent",
        borderColor: emphasize ? "rgba(200, 139, 36, 0.24)" : v4Colors.divider,
      }}
    >
      <div style={rowTitleStyle}>{title}</div>
      <div style={rowContentStyle}>{children}</div>
    </div>
  );
}

function PlainList({
  items,
  columns = 1,
}: {
  items: string[];
  columns?: 1 | 2;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          columns === 2 ? "repeat(auto-fit, minmax(180px, 1fr))" : "minmax(0, 1fr)",
        gap: "8px 18px",
      }}
    >
      {items.map((item) => (
        <div key={item} style={listItemStyle}>
          <span style={listBulletStyle} aria-hidden>
            ✓
          </span>
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}

function formatCreditsFull(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

const overlayStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 2147483100,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 32,
  background: "rgba(15, 23, 42, 0.32)",
} as const;

const panelStyle = {
  width: "min(860px, calc(100vw - 40px))",
  maxHeight: "min(780px, calc(100vh - 40px))",
  overflow: "hidden",
  borderRadius: 24,
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
  padding: "30px 32px 22px",
  borderBottom: `1px solid ${v4Colors.divider}`,
} as const;

const bodyStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 0,
  padding: "8px 32px 0",
  overflowY: "auto",
} as const;

const footerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 12,
  flexWrap: "wrap",
  padding: "28px 32px 32px",
  borderTop: `1px solid ${v4Colors.divider}`,
  background: v4Colors.cardBg,
} as const;

const titleStyle = {
  margin: 0,
  fontSize: 28,
  fontWeight: 700,
  lineHeight: 1.25,
  color: v4Colors.text,
} as const;

const descriptionStyle = {
  marginTop: 12,
  color: v4Colors.textMuted,
  fontSize: 15,
  lineHeight: "24px",
  maxWidth: 680,
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

const rowStyle = {
  display: "grid",
  gridTemplateColumns: "220px minmax(0, 1fr)",
  gap: 24,
  alignItems: "start",
  padding: "18px 0",
  borderBottom: `1px solid ${v4Colors.divider}`,
} as const;

const rowTitleStyle = {
  fontSize: 12,
  fontWeight: 600,
  color: v4Colors.textMuted,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  lineHeight: 1.5,
} as const;

const rowContentStyle = {
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: 8,
} as const;

const estimateTitleStyle = {
  fontSize: 22,
  fontWeight: 600,
  color: v4Colors.text,
  lineHeight: 1.35,
} as const;

const creditHeadlineStyle = {
  display: "flex",
  alignItems: "baseline",
  flexWrap: "wrap",
  gap: 12,
  lineHeight: 1,
} as const;

const creditHeadlineNumberStyle = {
  fontSize: 30,
  fontWeight: 700,
  letterSpacing: "-0.03em",
} as const;

const creditSlashStyle = {
  color: v4Colors.textMuted,
  fontSize: 24,
  fontWeight: 500,
} as const;

const creditMetaRowStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "12px 20px",
  marginTop: 6,
} as const;

const creditMetaItemStyle = {
  display: "flex",
  alignItems: "baseline",
  gap: 8,
} as const;

const creditMetaLabelStyle = {
  color: v4Colors.textMuted,
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "0.03em",
  textTransform: "uppercase",
  lineHeight: 1.5,
} as const;

const creditMetaValueStyle = {
  color: v4Colors.text,
  fontSize: 15,
  fontWeight: 600,
  lineHeight: "24px",
} as const;

const estimateHintStyle = {
  color: v4Colors.textMuted,
  fontSize: 13,
  lineHeight: "22px",
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

const valueTextStyle = {
  color: v4Colors.text,
  fontSize: 15,
  lineHeight: "24px",
} as const;

const mutedTextStyle = {
  color: v4Colors.textMuted,
  fontSize: 15,
  lineHeight: "24px",
} as const;

const listItemStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  color: v4Colors.text,
  fontSize: 15,
  lineHeight: "24px",
  minWidth: 0,
} as const;

const listBulletStyle = {
  color: v4Colors.primary,
  fontSize: 13,
  lineHeight: 1,
  flexShrink: 0,
} as const;
