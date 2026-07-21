import { Input, Modal, Space, Typography } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AI_MODEL_OPTIONS,
  DEFAULT_AI_MODEL,
} from "~/routes/app.translate-v4/constants";
import Button, { type AppButtonProps } from "~/ui/components/AppButton";

const { TextArea } = Input;
const { Text } = Typography;

const MAX_PROMPT_LENGTH = 500;

export type SingleTranslateSubmitOptions = {
  customPrompt?: string;
  aiModel: string;
};

interface SingleTranslateActionProps {
  existingTranslation?: string | null;
  loading?: boolean;
  onSubmit: (options: SingleTranslateSubmitOptions) => void | Promise<void>;
  triggerProps?: AppButtonProps;
}

const normalizeText = (value?: string | null) => value?.trim() ?? "";

const SingleTranslateAction: React.FC<SingleTranslateActionProps> = ({
  existingTranslation,
  loading = false,
  onSubmit,
  triggerProps,
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [aiModel, setAiModel] = useState(DEFAULT_AI_MODEL);
  const hasSubmittedRef = useRef(false);
  const hasExistingTranslation = useMemo(
    () => normalizeText(existingTranslation).length > 0,
    [existingTranslation],
  );

  const aiModelOptions = useMemo(
    () =>
      AI_MODEL_OPTIONS.map((option) => ({
        value: option.value,
        label: option.label,
      })),
    [],
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

  const actionLabel = hasExistingTranslation
    ? t("Retranslate")
    : t("Translate");
  const promptLabel = hasExistingTranslation
    ? t("Translation quality not good enough?")
    : t("Translate");
  const submitLabel = hasExistingTranslation
    ? t("Retranslate")
    : t("Start translation");

  const resetAndClose = () => {
    setOpen(false);
    setPrompt("");
    setAiModel(DEFAULT_AI_MODEL);
  };

  const handleSubmit = () => {
    void onSubmit({
      customPrompt: normalizeText(prompt) || undefined,
      aiModel: aiModel.trim() || DEFAULT_AI_MODEL,
    });
  };

  return (
    <>
      <Button
        {...triggerProps}
        type={triggerProps?.type ?? "default"}
        size={triggerProps?.size ?? "middle"}
        onClick={() => {
          setAiModel(DEFAULT_AI_MODEL);
          setPrompt("");
          setOpen(true);
        }}
        loading={loading}
      >
        {actionLabel}
      </Button>
      <Modal
        title={promptLabel}
        open={open}
        centered
        width={560}
        destroyOnHidden
        onCancel={resetAndClose}
        footer={
          <Space size="small">
            <Button
              type="default"
              onClick={resetAndClose}
              disabled={loading}
            >
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
            <Text
              strong
              style={{ display: "block", marginBottom: 8, fontSize: 13 }}
            >
              {t("v4.createTask.aiModel")}
            </Text>
            <select
              className="v4-ai-model-native-select"
              value={aiModel}
              onChange={(event) => setAiModel(event.target.value)}
              aria-label={t("v4.createTask.aiModel")}
              style={{ marginBottom: 0 }}
            >
              {aiModelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          {hasExistingTranslation ? (
            <>
              <Text type="secondary">
                {t("Add suggestions and translate again.")}
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
            </>
          ) : (
            <Text type="secondary">
              {t("Choose an AI model and start translation.")}
            </Text>
          )}
        </div>
      </Modal>
    </>
  );
};

export default SingleTranslateAction;
