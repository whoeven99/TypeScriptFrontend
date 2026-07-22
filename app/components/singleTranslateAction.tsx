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

interface SingleTranslateActionProps {
  existingTranslation?: string | null;
  loading?: boolean;
  onSubmit: (customPrompt?: string, aiModel?: string) => void | Promise<void>;
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
    setAiModel(DEFAULT_AI_MODEL);
  }, [loading]);

  const actionLabel = hasExistingTranslation
    ? t("Retranslate")
    : t("Translate");
  const promptLabel = hasExistingTranslation
    ? t("Translation quality not good enough?")
    : t("Translation prompt");
  const submitLabel = hasExistingTranslation
    ? t("Retranslate")
    : t("Start translation");

  return (
    <>
      <Button
        {...triggerProps}
        type={triggerProps?.type ?? "default"}
        size={triggerProps?.size ?? "middle"}
        onClick={() => {
          if (!hasExistingTranslation) {
            hasSubmittedRef.current = true;
            void onSubmit();
            return;
          }
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
        onCancel={() => {
          setOpen(false);
          setPrompt("");
          setAiModel(DEFAULT_AI_MODEL);
        }}
        footer={
          <Space size="small">
            <Button
              type="default"
              onClick={() => {
                setOpen(false);
                setPrompt("");
                setAiModel(DEFAULT_AI_MODEL);
              }}
              disabled={loading}
            >
              {t("Cancel")}
            </Button>
            <Button
              type="primary"
              onClick={() => {
                void onSubmit(normalizeText(prompt) || undefined, aiModel);
              }}
              loading={loading}
            >
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
          <Text type="secondary">
            {t("Add suggestions and translate again.")}
          </Text>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <Text>{t("v4.createTask.aiModel")}</Text>
            <Select
              value={aiModel}
              options={aiModelOptions}
              onChange={setAiModel}
              style={{ width: "100%" }}
            />
          </div>
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
      </Modal>
    </>
  );
};

export default SingleTranslateAction;
