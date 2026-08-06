import { Input, Select, Typography } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { openCreditsPurchaseModal } from "~/utils/creditsPurchaseModal";
import {
  AI_MODEL_OPTIONS,
  DEFAULT_AI_MODEL,
} from "~/routes/app.translate-v4/constants";
import { getV4AiModelLabel } from "~/routes/app.translate-v4/v4I18n";
import { V4ModalShell } from "~/components/V4ModalShell";
import Button, { type AppButtonProps } from "~/ui/components/AppButton";
import { v4Colors } from "~/routes/app.translate-v4/v4Styles";

const { TextArea } = Input;
const { Text } = Typography;

const MAX_PROMPT_LENGTH = 500;
const AI_MODEL_STORAGE_KEY = "ciwi.manage.singleTranslate.aiModel";
const ESTIMATE_DEBOUNCE_MS = 350;

type SingleTranslateModalState = "missing" | "quality" | "outdated";

type SingleTranslatePreset = {
  value: string;
  label: string;
  prompt: string;
};

export type SingleTranslateSubmitPayload = {
  customPrompt?: string;
  aiModel: string;
};

interface SingleTranslateActionProps {
  existingTranslation?: string | null;
  isOutdated?: boolean;
  loading?: boolean;
  /** 源文字段（用于积分预估）。 */
  sourceText?: string | null;
  /** 目标语言 locale。 */
  targetLocale?: string | null;
  /** Shopify 字段 key（handle 走专用 prompt）。 */
  fieldKey?: string | null;
  onSubmit: (payload: SingleTranslateSubmitPayload) => void | Promise<void>;
  triggerProps?: AppButtonProps;
}

const normalizeText = (value?: string | null) => value?.trim() ?? "";

function readStoredAiModel(): string {
  try {
    const stored = sessionStorage.getItem(AI_MODEL_STORAGE_KEY)?.trim() ?? "";
    if (stored && AI_MODEL_OPTIONS.some((option) => option.value === stored)) {
      return stored;
    }
  } catch {
    // sessionStorage may be unavailable
  }
  return DEFAULT_AI_MODEL;
}

function persistAiModel(aiModel: string) {
  try {
    sessionStorage.setItem(AI_MODEL_STORAGE_KEY, aiModel);
  } catch {
    // ignore quota / private mode
  }
}

function getModalState(args: {
  hasExistingTranslation: boolean;
  isOutdated: boolean;
}): SingleTranslateModalState {
  if (!args.hasExistingTranslation) return "missing";
  if (args.isOutdated) return "outdated";
  return "quality";
}

const SingleTranslateAction: React.FC<SingleTranslateActionProps> = ({
  existingTranslation,
  isOutdated = false,
  loading = false,
  sourceText,
  targetLocale,
  fieldKey,
  onSubmit,
  triggerProps,
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<string | undefined>();
  const [aiModel, setAiModel] = useState(DEFAULT_AI_MODEL);
  const [estimatedCredits, setEstimatedCredits] = useState<number | null>(null);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [currentRemainingCredits, setCurrentRemainingCredits] = useState<
    number | null
  >(null);
  const [quotaLoading, setQuotaLoading] = useState(false);
  const hasSubmittedRef = useRef(false);
  const hasExistingTranslation = useMemo(
    () => normalizeText(existingTranslation).length > 0,
    [existingTranslation],
  );
  const modalState = useMemo(
    () => getModalState({ hasExistingTranslation, isOutdated }),
    [hasExistingTranslation, isOutdated],
  );

  const aiModelOptions = useMemo(
    () =>
      AI_MODEL_OPTIONS.map((option) => ({
        value: option.value,
        label: getV4AiModelLabel(option.value, t),
      })),
    [t],
  );

  const presetOptions = useMemo<SingleTranslatePreset[]>(() => {
    if (modalState === "missing") {
      return [
        {
          value: "faithful",
          label: t("manage.singleTranslate.preset.faithful"),
          prompt: t("manage.singleTranslate.presetPrompt.faithful"),
        },
        {
          value: "natural",
          label: t("manage.singleTranslate.preset.natural"),
          prompt: t("manage.singleTranslate.presetPrompt.natural"),
        },
        {
          value: "brand",
          label: t("manage.singleTranslate.preset.brand"),
          prompt: t("manage.singleTranslate.presetPrompt.brand"),
        },
      ];
    }

    if (modalState === "outdated") {
      return [
        {
          value: "sync-latest",
          label: t("manage.singleTranslate.preset.syncLatest"),
          prompt: t("manage.singleTranslate.presetPrompt.syncLatest"),
        },
        {
          value: "keep-tone",
          label: t("manage.singleTranslate.preset.keepTone"),
          prompt: t("manage.singleTranslate.presetPrompt.keepTone"),
        },
        {
          value: "check-details",
          label: t("manage.singleTranslate.preset.checkDetails"),
          prompt: t("manage.singleTranslate.presetPrompt.checkDetails"),
        },
      ];
    }

    return [
      {
        value: "more-natural",
        label: t("manage.singleTranslate.preset.moreNatural"),
        prompt: t("manage.singleTranslate.presetPrompt.moreNatural"),
      },
      {
        value: "brand-stronger",
        label: t("manage.singleTranslate.preset.brandStronger"),
        prompt: t("manage.singleTranslate.presetPrompt.brandStronger"),
      },
      {
        value: "keep-terms",
        label: t("manage.singleTranslate.preset.keepTerms"),
        prompt: t("manage.singleTranslate.presetPrompt.keepTerms"),
      },
    ];
  }, [modalState, t]);

  const selectedPresetPrompt = useMemo(
    () =>
      presetOptions.find((option) => option.value === selectedPreset)?.prompt ?? "",
    [presetOptions, selectedPreset],
  );

  const shortfallCredits = useMemo(() => {
    if (estimatedCredits == null || currentRemainingCredits == null) return null;
    return Math.max(estimatedCredits - currentRemainingCredits, 0);
  }, [estimatedCredits, currentRemainingCredits]);

  useEffect(() => {
    if (loading) {
      hasSubmittedRef.current = true;
      return;
    }
    if (!hasSubmittedRef.current) return;
    hasSubmittedRef.current = false;
    setOpen(false);
    setPrompt("");
    setSelectedPreset(undefined);
  }, [loading]);

  useEffect(() => {
    if (!open) {
      setEstimatedCredits(null);
      setEstimateLoading(false);
      return;
    }
    const text = sourceText ?? "";
    const target = normalizeText(targetLocale);
    if (!text.trim() || !target) {
      setEstimatedCredits(0);
      setEstimateLoading(false);
      return;
    }

    const controller = new AbortController();
    setEstimateLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const customPrompt = [selectedPresetPrompt, normalizeText(prompt)]
          .filter(Boolean)
          .join("\n");
        const res = await fetch("/api/translate-v4/single-estimate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            context: text,
            target,
            key: fieldKey?.trim() || "value",
            customPrompt: customPrompt || undefined,
            aiModel,
          }),
          signal: controller.signal,
        });
        const data = (await res.json()) as {
          ok?: boolean;
          estimate?: { estimatedCredits?: number };
        };
        if (!controller.signal.aborted) {
          setEstimatedCredits(
            data.ok && typeof data.estimate?.estimatedCredits === "number"
              ? data.estimate.estimatedCredits
              : null,
          );
        }
      } catch {
        if (!controller.signal.aborted) setEstimatedCredits(null);
      } finally {
        if (!controller.signal.aborted) setEstimateLoading(false);
      }
    }, ESTIMATE_DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [
    open,
    sourceText,
    targetLocale,
    fieldKey,
    prompt,
    aiModel,
    selectedPresetPrompt,
  ]);

  useEffect(() => {
    if (!open) {
      setCurrentRemainingCredits(null);
      setQuotaLoading(false);
      return;
    }

    const controller = new AbortController();
    setQuotaLoading(true);

    void fetch("/api/translate-v4/quota", {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data: { quota?: { remaining?: number | string | null } }) => {
        if (controller.signal.aborted) return;
        const remaining = data?.quota?.remaining;
        const parsed =
          typeof remaining === "number"
            ? remaining
            : typeof remaining === "string"
              ? Number(remaining.trim())
              : Number.NaN;
        setCurrentRemainingCredits(
          Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : null,
        );
      })
      .catch(() => {
        if (!controller.signal.aborted) setCurrentRemainingCredits(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setQuotaLoading(false);
      });

    return () => controller.abort();
  }, [open]);

  const actionLabel = getActionLabel(modalState, t);
  const modalTitle = getModalTitle(modalState, t);
  const submitLabel = getSubmitLabel(modalState, t);
  const promptLabel = t("manage.singleTranslate.promptOptional");
  const promptDescription = getPromptDescription(modalState, t);
  const stateTitle = getStateTitle(modalState, t);
  const stateDescription = getStateDescription(modalState, t);

  const estimateLabel = estimateLoading
    ? t("manage.singleTranslate.estimateLoading")
    : estimatedCredits === null
      ? t("manage.singleTranslate.estimateUnavailable")
      : t("manage.singleTranslate.estimateCredits", {
          credits: estimatedCredits.toLocaleString(),
        });

  const remainingLabel = quotaLoading
    ? t("manage.singleTranslate.remainingLoading")
    : currentRemainingCredits == null
      ? t("manage.singleTranslate.remainingUnavailable")
      : t("manage.singleTranslate.remainingCredits", {
          credits: currentRemainingCredits.toLocaleString(),
        });

  const closeModal = () => {
    setOpen(false);
    setPrompt("");
    setSelectedPreset(undefined);
  };

  const handleSubmit = () => {
    const trimmedPrompt = normalizeText(prompt);
    const customPrompt = [selectedPresetPrompt, trimmedPrompt]
      .filter(Boolean)
      .join("\n");

    const openPurchaseModalWithContext = () => {
      closeModal();
      openCreditsPurchaseModal({
        kind: "single_translate",
        target: normalizeText(targetLocale) || "target",
        fieldKey: fieldKey?.trim() || "value",
        estimatedCredits,
        currentRemainingCredits,
        shortfallCredits,
        state: modalState,
      });
    };

    if (currentRemainingCredits != null && currentRemainingCredits <= 0) {
      openPurchaseModalWithContext();
      return;
    }

    if (
      estimatedCredits != null &&
      currentRemainingCredits != null &&
      estimatedCredits > currentRemainingCredits
    ) {
      openPurchaseModalWithContext();
      return;
    }

    persistAiModel(aiModel);
    hasSubmittedRef.current = true;
    void onSubmit({
      customPrompt: customPrompt || undefined,
      aiModel,
    });
  };

  return (
    <>
      <Button
        {...triggerProps}
        type={triggerProps?.type ?? "default"}
        size={triggerProps?.size ?? "middle"}
        onClick={() => {
          setAiModel(readStoredAiModel());
          setOpen(true);
        }}
        loading={loading}
      >
        {actionLabel}
      </Button>
      {open ? (
        <V4ModalShell open onClose={closeModal} width={560}>
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
                  background: "rgba(79, 70, 229, 0.1)",
                  color: v4Colors.primary,
                  marginBottom: 12,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {stateTitle}
              </div>
              <Text strong style={{ display: "block", fontSize: 24, lineHeight: 1.3 }}>
                {modalTitle}
              </Text>
              <Text
                type="secondary"
                style={{ display: "block", marginTop: 10, maxWidth: 460 }}
              >
                {stateDescription}
              </Text>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div
                style={{
                  padding: "14px 16px",
                  borderRadius: 16,
                  border: `1px solid ${v4Colors.cardBorder}`,
                  background:
                    shortfallCredits && shortfallCredits > 0
                      ? "rgba(239, 68, 68, 0.06)"
                      : v4Colors.cardSubdued,
                }}
              >
                <Text strong style={{ display: "block", marginBottom: 12 }}>
                  {t("manage.singleTranslate.summaryTitle")}
                </Text>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: 12,
                  }}
                >
                  <StatItem
                    label={t("Estimated total")}
                    value={estimateLabel}
                    critical={false}
                  />
                  <StatItem
                    label={t("Available now")}
                    value={remainingLabel}
                    critical={false}
                  />
                  <StatItem
                    label={t("Need to top up")}
                    value={
                      shortfallCredits == null
                        ? t("Estimating...")
                        : `${shortfallCredits.toLocaleString()} ${t("credits")}`
                    }
                    critical={Boolean(shortfallCredits && shortfallCredits > 0)}
                  />
                </div>
                <Text
                  type="secondary"
                  style={{ display: "block", marginTop: 10, fontSize: 12 }}
                >
                  {t("manage.singleTranslate.estimateHint")}
                </Text>
              </div>

              <div>
                <Text strong style={{ display: "block", marginBottom: 8 }}>
                  {t("v4.createTask.aiModel")}
                </Text>
                <Select
                  style={{ width: "100%" }}
                  options={aiModelOptions}
                  value={aiModel}
                  onChange={setAiModel}
                  getPopupContainer={(node) => node.parentElement ?? document.body}
                />
              </div>

              <div>
                <Text strong style={{ display: "block", marginBottom: 8 }}>
                  {t("manage.singleTranslate.goalLabel")}
                </Text>
                <Text
                  type="secondary"
                  style={{ display: "block", marginBottom: 8 }}
                >
                  {getGoalDescription(modalState, t)}
                </Text>
                <Select
                  style={{ width: "100%" }}
                  placeholder={t("manage.singleTranslate.goalPlaceholder")}
                  options={presetOptions.map((option) => ({
                    value: option.value,
                    label: option.label,
                  }))}
                  value={selectedPreset}
                  onChange={(value) => setSelectedPreset(value)}
                  allowClear
                  getPopupContainer={(node) => node.parentElement ?? document.body}
                />
              </div>

              <div>
                <Text strong style={{ display: "block", marginBottom: 4 }}>
                  {promptLabel}
                </Text>
                <Text
                  type="secondary"
                  style={{ display: "block", marginBottom: 8 }}
                >
                  {promptDescription}
                </Text>
                <TextArea
                  rows={4}
                  maxLength={MAX_PROMPT_LENGTH}
                  value={prompt}
                  placeholder={t("manage.singleTranslate.promptPlaceholder")}
                  onChange={(event) => setPrompt(event.target.value)}
                />
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 12,
                marginTop: 24,
              }}
            >
              <Button type="default" onClick={closeModal} disabled={loading}>
                {t("Cancel")}
              </Button>
              <Button type="primary" onClick={handleSubmit} loading={loading}>
                {submitLabel}
              </Button>
            </div>
          </div>
        </V4ModalShell>
      ) : null}
    </>
  );
};

function StatItem({
  label,
  value,
  critical,
}: {
  label: string;
  value: string;
  critical: boolean;
}) {
  return (
    <div>
      <Text type="secondary" style={{ display: "block", fontSize: 12 }}>
        {label}
      </Text>
      <Text
        strong
        style={{
          display: "block",
          marginTop: 4,
          color: critical ? "#dc2626" : undefined,
        }}
      >
        {value}
      </Text>
    </div>
  );
}

function getActionLabel(
  state: SingleTranslateModalState,
  t: (key: string) => string,
) {
  if (state === "missing") return t("Translate");
  if (state === "outdated") return t("Update translation");
  return t("Retranslate");
}

function getModalTitle(
  state: SingleTranslateModalState,
  t: (key: string) => string,
) {
  if (state === "missing") return t("manage.singleTranslate.titleMissing");
  if (state === "outdated") return t("manage.singleTranslate.titleOutdated");
  return t("manage.singleTranslate.titleQuality");
}

function getSubmitLabel(
  state: SingleTranslateModalState,
  t: (key: string) => string,
) {
  if (state === "missing") return t("manage.singleTranslate.submitMissing");
  if (state === "outdated") return t("manage.singleTranslate.submitOutdated");
  return t("manage.singleTranslate.submitQuality");
}

function getStateTitle(
  state: SingleTranslateModalState,
  t: (key: string) => string,
) {
  if (state === "missing") return t("manage.singleTranslate.stateMissing");
  if (state === "outdated") return t("manage.singleTranslate.stateOutdated");
  return t("manage.singleTranslate.stateQuality");
}

function getStateDescription(
  state: SingleTranslateModalState,
  t: (key: string) => string,
) {
  if (state === "missing") {
    return t("manage.singleTranslate.descMissing");
  }
  if (state === "outdated") {
    return t("manage.singleTranslate.descOutdated");
  }
  return t("manage.singleTranslate.descQuality");
}

function getGoalDescription(
  state: SingleTranslateModalState,
  t: (key: string) => string,
) {
  if (state === "missing") {
    return t("manage.singleTranslate.goalDescMissing");
  }
  if (state === "outdated") {
    return t("manage.singleTranslate.goalDescOutdated");
  }
  return t("manage.singleTranslate.goalDescQuality");
}

function getPromptDescription(
  state: SingleTranslateModalState,
  t: (key: string) => string,
) {
  if (state === "missing") {
    return t("manage.singleTranslate.promptDescMissing");
  }
  if (state === "outdated") {
    return t("manage.singleTranslate.promptDescOutdated");
  }
  return t("manage.singleTranslate.promptDescQuality");
}

export default SingleTranslateAction;
