import { Input, Modal, Select, Space, Typography } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AI_MODEL_OPTIONS,
  DEFAULT_AI_MODEL,
} from "~/routes/app.translate-v4/constants";
import { getV4AiModelLabel } from "~/routes/app.translate-v4/v4I18n";
import Button, { type AppButtonProps } from "~/ui/components/AppButton";

const { TextArea } = Input;
const { Text } = Typography;

const MAX_PROMPT_LENGTH = 500;
const AI_MODEL_STORAGE_KEY = "ciwi.manage.singleTranslate.aiModel";
const ESTIMATE_DEBOUNCE_MS = 350;

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
  const [aiModel, setAiModel] = useState(DEFAULT_AI_MODEL);
  const [estimatedCredits, setEstimatedCredits] = useState<number | null>(null);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const hasSubmittedRef = useRef(false);
  const hasExistingTranslation = useMemo(
    () => normalizeText(existingTranslation).length > 0,
    [existingTranslation],
  );
  const shouldUpdateTranslation = hasExistingTranslation && isOutdated;

  const aiModelOptions = useMemo(
    () =>
      AI_MODEL_OPTIONS.map((option) => ({
        value: option.value,
        label: getV4AiModelLabel(option.value, t),
      })),
    [t],
  );

  useEffect(() => {
    if (loading) {
      hasSubmittedRef.current = true;
      return;
    }
    if (!hasSubmittedRef.current) return;
    hasSubmittedRef.current = false;
    setOpen(false);
    setPrompt("");
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
        const res = await fetch("/api/translate-v4/single-estimate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            context: text,
            target,
            key: fieldKey?.trim() || "value",
            customPrompt: normalizeText(prompt) || undefined,
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
  }, [open, sourceText, targetLocale, fieldKey, prompt]);

  const actionLabel = !hasExistingTranslation
    ? t("Translate")
    : shouldUpdateTranslation
      ? t("Update translation")
      : t("Retranslate");
  const modalTitle = !hasExistingTranslation
    ? t("Translate")
    : shouldUpdateTranslation
      ? t("Update translation")
      : t("Translation quality not good enough?");
  const submitLabel = !hasExistingTranslation
    ? t("Start translation")
    : shouldUpdateTranslation
      ? t("Update translation")
      : t("Retranslate");
  const promptLabel = t("manage.singleTranslate.promptOptional");
  const promptDescription = !hasExistingTranslation
    ? t("manage.singleTranslate.promptOptionalHint")
    : shouldUpdateTranslation
      ? t("The source text changed. Add suggestions if you want to refresh the translation.")
      : t("Add suggestions and translate again.");

  const estimateLabel = estimateLoading
    ? t("manage.singleTranslate.estimateLoading")
    : estimatedCredits === null
      ? t("manage.singleTranslate.estimateUnavailable")
      : t("manage.singleTranslate.estimateCredits", {
          credits: estimatedCredits.toLocaleString(),
        });

  const closeModal = () => {
    setOpen(false);
    setPrompt("");
  };

  const handleSubmit = () => {
    persistAiModel(aiModel);
    void onSubmit({
      customPrompt: normalizeText(prompt) || undefined,
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
        <Modal
          title={modalTitle}
          open
          centered
          width={560}
          destroyOnHidden
          onCancel={closeModal}
          footer={
            <Space size="small">
              <Button type="default" onClick={closeModal} disabled={loading}>
                {t("Cancel")}
              </Button>
              <Button type="primary" onClick={handleSubmit} loading={loading}>
                {submitLabel}
              </Button>
            </Space>
          }
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              paddingTop: "8px",
            }}
          >
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
              <Text type="secondary">{estimateLabel}</Text>
              <Text
                type="secondary"
                style={{ display: "block", marginTop: 4, fontSize: 12 }}
              >
                {t("manage.singleTranslate.estimateHint")}
              </Text>
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
                placeholder={t(
                  "e.g. Make the wording more natural and aligned with the brand tone",
                )}
                onChange={(event) => setPrompt(event.target.value)}
              />
            </div>
          </div>
        </Modal>
      ) : null}
    </>
  );
};

export default SingleTranslateAction;
