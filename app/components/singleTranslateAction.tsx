import { Input, Modal, Space, Typography } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Button, { type AppButtonProps } from "~/ui/components/AppButton";

const { TextArea } = Input;
const { Text } = Typography;

const MAX_PROMPT_LENGTH = 500;

interface SingleTranslateActionProps {
  existingTranslation?: string | null;
  loading?: boolean;
  onSubmit: (customPrompt?: string) => void | Promise<void>;
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
  const hasSubmittedRef = useRef(false);
  const hasExistingTranslation = useMemo(
    () => normalizeText(existingTranslation).length > 0,
    [existingTranslation],
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
        }}
        footer={
          <Space size="small">
            <Button
              type="default"
              onClick={() => {
                setOpen(false);
                setPrompt("");
              }}
              disabled={loading}
            >
              {t("Cancel")}
            </Button>
            <Button
              type="primary"
              onClick={() => {
                void onSubmit(normalizeText(prompt) || undefined);
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
            {t(
              "Add suggestions and translate again.",
            )}
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
      </Modal>
    </>
  );
};

export default SingleTranslateAction;
