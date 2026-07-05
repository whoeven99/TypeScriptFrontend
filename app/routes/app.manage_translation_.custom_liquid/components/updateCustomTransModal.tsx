import { useEffect, useMemo, useState } from "react";
import { Alert, Modal, Input, Space, Typography, Select, Flex } from "antd";
import Button from "~/ui/components/AppButton";
import { useSelector } from "react-redux";
import type { LanguagesDataType } from "~/routes/app.language/route";
import { useTranslation } from "react-i18next";
import { globalStore } from "~/globalStore";
import { insertLiquidCompat, type LiquidTableRow } from "../liquidClient";
import {
  getTranslateV4ErrorMessage,
  TRANSLATE_V4_ERROR_KEYS,
} from "~/utils/translateV4Errors";

const { Text } = Typography;

interface UpdateCustomTransModalProps {
  migrated: boolean;
  server: string;
  dataSource: LiquidTableRow[];
  defaultData?: LiquidTableRow | undefined;
  handleUpdateDataSource: (row: LiquidTableRow & { key?: string }) => void;
  title: string;
  open: boolean;
  setIsModalHide: () => void;
}

const UpdateCustomTransModal: React.FC<UpdateCustomTransModalProps> = ({
  migrated,
  server,
  dataSource,
  defaultData,
  handleUpdateDataSource,
  title,
  open,
  setIsModalHide,
}) => {
  const { t } = useTranslation();

  const languageTableData: LanguagesDataType[] = useSelector(
    (state: any) => state.languageTableData.rows,
  );

  const options = useMemo(() => {
    if (languageTableData.length > 0) {
      return languageTableData.map((item) => ({
        value: item.locale,
        label: item.name,
      }));
    }
  }, [languageTableData]);

  const [formData, setFormData] = useState<{
    sourceText: string;
    targetText: string;
    replacementMethod: boolean;
    languageCode: string;
  }>({
    sourceText: "",
    targetText: "",
    replacementMethod: true,
    languageCode: "",
  });

  const confirmButtonDisable = useMemo<boolean>(
    () =>
      !formData.languageCode ||
      !formData.sourceText ||
      !formData.targetText ||
      JSON.stringify(formData) == JSON.stringify(defaultData),
    [formData, defaultData],
  );

  const [loadingStatusArray, setLoadingStatusArray] = useState<string[]>([]);
  const [modalAlert, setModalAlert] = useState<{
    type: "warning" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (defaultData) {
      setFormData(defaultData);
    } else {
      setFormData({
        sourceText: "",
        targetText: "",
        replacementMethod: true,
        languageCode: "",
      });
    }
    setModalAlert(null);
  }, [defaultData]);

  const handleCloseModal = () => {
    setModalAlert(null);
    setIsModalHide();
  };

  const handleConfirm = async (id?: string) => {
    let isSameRuleError = true;

    const source = formData.sourceText + formData.languageCode;
    for (const item of dataSource) {
      const string = item.sourceText + item.languageCode;
      if (title === "Create rule") {
        if (source == string) {
          isSameRuleError = false;
        }
      } else if (source == string && item.key !== id) {
        isSameRuleError = false;
      }
    }

    if (isSameRuleError) {
      setModalAlert(null);
      setLoadingStatusArray((prev) => [...prev, "submitting"]);
      const data = await insertLiquidCompat({
        migrated,
        id: defaultData?.key,
        shop: globalStore?.shop || "",
        server,
        sourceText: formData.sourceText,
        targetText: formData.targetText,
        replacementMethod: formData.replacementMethod,
        languageCode: formData.languageCode,
      });

      if (data.success) {
        const newData: LiquidTableRow = {
          key: String(data.response?.id ?? defaultData?.key ?? ""),
          sourceText: String(
            data.response?.liquidBeforeTranslation ?? formData.sourceText,
          ),
          targetText: String(
            data.response?.liquidAfterTranslation ?? formData.targetText,
          ),
          replacementMethod:
            data.response?.replacementMethod ?? formData.replacementMethod,
          languageCode: String(
            data.response?.languageCode ?? formData.languageCode,
          ),
        };
        handleUpdateDataSource(newData);
        shopify.toast.show("Saved successfully");
        setFormData({
          ...formData,
          sourceText: "",
          targetText: "",
        });
        setIsModalHide();
      } else {
        setModalAlert({
          type: "error",
          message: getTranslateV4ErrorMessage(
            t,
            data.errorMsg,
            TRANSLATE_V4_ERROR_KEYS.LIQUID_SAVE_FAILED,
          ),
        });
      }
      setLoadingStatusArray((prev) =>
        prev.filter((item) => item !== "submitting"),
      );
    } else {
      setModalAlert({
        type: "warning",
        message: t("You cannot add two conflicting rules."),
      });
    }
  };

  return (
    <Modal
      title={title}
      open={open}
      onCancel={handleCloseModal}
      centered
      footer={[
        <Space key="updateCustomTransModal_footer">
          <Button onClick={handleCloseModal}>{t("Cancel")}</Button>
          <Button
            onClick={() => handleConfirm(defaultData?.key)}
            type="primary"
            disabled={confirmButtonDisable}
            loading={loadingStatusArray.includes("submitting")}
          >
            {t("Save")}
          </Button>
        </Space>,
      ]}
    >
      <Space direction="vertical" size="middle" style={{ display: "flex" }}>
        {modalAlert ? (
          <Alert
            type={modalAlert.type}
            showIcon
            message={modalAlert.message}
            closable
            onClose={() => setModalAlert(null)}
          />
        ) : null}
        <Text>{t("Keep translation consistent across your store")}</Text>
        <Flex
          gap={8}
          justify="center"
          align="flex-start"
          style={{
            width: "100%",
          }}
        >
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              width: "100%",
            }}
          >
            <Input
              placeholder={t("Please enter original text")}
              value={formData.sourceText}
              onChange={(e) => {
                setModalAlert(null);
                setFormData({
                  ...formData,
                  sourceText: e.target.value,
                });
              }}
              disabled={loadingStatusArray.includes("submitting")}
            />
          </div>
          <Text style={{ margin: "0 8px", lineHeight: "32px" }}>{t("to")}</Text>
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              width: "100%",
            }}
          >
            <Input
              placeholder={t("Please enter escaped text")}
              value={formData.targetText}
              onChange={(e) => {
                setModalAlert(null);
                setFormData({
                  ...formData,
                  targetText: e.target.value,
                });
              }}
              disabled={loadingStatusArray.includes("submitting")}
            />
          </div>
        </Flex>
        <Text strong>{t("Apply for")}</Text>
        <div style={{ display: "flex", flexDirection: "column", width: 200 }}>
          <Select
            options={options}
            style={{ width: "100%" }}
            onChange={(e) => {
              setModalAlert(null);
              setFormData({
                ...formData,
                languageCode: e,
                languageCode: e,
              });
            }}
            value={formData.languageCode}
            disabled={loadingStatusArray.includes("submitting")}
          />
        </div>
      </Space>
    </Modal>
  );
};

export default UpdateCustomTransModal;
