import { useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { useFetcher, useNavigate } from "@remix-run/react";
import { Modal, Space, Typography } from "antd";
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

const { Paragraph, Text, Title } = Typography;

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
    if (!planFetcher.data?.success) return;
    const confirmationUrl = planFetcher.data.response?.confirmationUrl;
    if (confirmationUrl) openUrl(confirmationUrl);
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

  const aiModelLabel = AI_MODEL_OPTIONS.some(
    (option) => option.value === aiModel,
  )
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

  return (
    <Modal
      open={open}
      onCancel={creating ? undefined : onClose}
      footer={null}
      centered
      width={720}
      zIndex={2147483100}
      destroyOnHidden
      maskClosable={!creating}
      keyboard={!creating}
      closeIcon={
        <span
          aria-hidden
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 24,
            height: 24,
            fontSize: 18,
            color: v4Colors.textMuted,
            lineHeight: 1,
          }}
        >
          ×
        </span>
      }
      styles={{
        content: {
          padding: 0,
          overflow: "hidden",
          borderRadius: 20,
          border: `1px solid ${v4Colors.cardBorder}`,
          background: v4Colors.cardBg,
          boxShadow: "var(--app-shadow-card-strong)",
        },
        body: {
          padding: 0,
          maxHeight: "min(720px, calc(100vh - 96px))",
          overflowY: "auto",
        },
      }}
    >
      <div style={{ padding: "24px 24px 20px" }}>
        <div
          style={{
            paddingBottom: 20,
            marginBottom: 20,
            borderBottom: `1px solid ${v4Colors.divider}`,
          }}
        >
          <Title level={3} style={{ margin: 0, lineHeight: 1.25, color: v4Colors.text }}>
            {title}
          </Title>
          <Paragraph
            style={{
              marginTop: 12,
              marginBottom: 0,
              color: v4Colors.textMuted,
              fontSize: 14,
              lineHeight: "22px",
              maxWidth: 560,
            }}
          >
            {description}
          </Paragraph>
        </div>

        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 14,
            }}
          >
            <SummaryCard title={t("v4.createTask.targetLanguages")}>
              <TokenList
                items={selectedTargets.map((item) => `${item.regionCode} ${item.label}`)}
              />
            </SummaryCard>

            <SummaryCard title={t("v4.createTask.content")}>
              <TokenList items={selectedModules.map((item) => item.label)} />
            </SummaryCard>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 14,
            }}
          >
            <SummaryCard title={t("v4.createTask.aiModel")}>
              <TokenList items={[aiModelLabel]} />
            </SummaryCard>

            <SummaryCard title={t("v4.createTask.translationOptions")}>
              {optionLabels.length > 0 ? (
                <TokenList items={optionLabels} />
              ) : (
                <Text style={{ color: v4Colors.textMuted }}>
                  {t("v4.createTask.confirmDefaultOptions")}
                </Text>
              )}
            </SummaryCard>
          </div>

          <div
            style={{
              ...v4CardStyle,
              borderRadius: 16,
              padding: "16px 18px",
              background: modalBlocked
                ? "var(--app-accent-utility-soft)"
                : estimate?.needsMoreCredits
                  ? "var(--app-accent-utility-soft)"
                  : v4Colors.summaryBg,
            }}
          >
            <Text
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
              {t("v4.createTask.confirmEstimateTitle")}
            </Text>
            <Text
              strong
              style={{
                display: "block",
                fontSize: 18,
                color: v4Colors.text,
                lineHeight: 1.35,
              }}
            >
              {estimateTitle}
            </Text>
            {remainingLabel ? (
              <Text
                style={{
                  display: "block",
                  marginTop: 6,
                  color: v4Colors.textMuted,
                  lineHeight: "22px",
                }}
              >
                {remainingLabel}
              </Text>
            ) : null}
            {estimate?.needsMoreCredits ? (
              <Text
                style={{
                  display: "block",
                  marginTop: 10,
                  color: "var(--p-color-text-caution)",
                  lineHeight: "22px",
                }}
              >
                {t("v4.createTask.estimateShort")}
              </Text>
            ) : null}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 12,
              flexWrap: "wrap",
              paddingTop: 4,
            }}
          >
            <Button
              onClick={onClose}
              disabled={creating}
              style={{
                minWidth: 108,
                borderColor: v4Colors.cardBorder,
              }}
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
        </Space>
      </div>
    </Modal>
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
      <Text
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
        {title}
      </Text>
      {children}
    </div>
  );
}

function TokenList({ items }: { items: string[] }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {items.map((item) => (
        <span
          key={item}
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "6px 10px",
            borderRadius: 999,
            background: v4Colors.cardBg,
            border: `1px solid ${v4Colors.cardBorder}`,
            color: v4Colors.text,
            fontSize: 12,
            lineHeight: 1.35,
          }}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function openUrl(url: string) {
  open(url, "_top");
}
