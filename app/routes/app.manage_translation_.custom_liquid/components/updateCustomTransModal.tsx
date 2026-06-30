import { useEffect, useMemo, useState } from "react";
import { Modal, Input, Space, Button, Typography, Select, Flex } from "antd";
import { useSelector } from "react-redux";
import { LanguagesDataType } from "~/routes/app.language/route";
import { useTranslation } from "react-i18next";
import {
  insertLiquidCompat,
  type LiquidTableRow,
} from "../liquidClient";

const { Text } = Typography;

interface UpdateCustomTransModalProps {
  dataSource: LiquidTableRow[];
  defaultData?: LiquidTableRow | undefined;
  handleUpdateDataSource: (row: LiquidTableRow & { key?: string }) => void;
  title: string;
  open: boolean;
  setIsModalHide: () => void;
}

const UpdateCustomTransModal: React.FC<UpdateCustomTransModalProps> = ({
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
  }, [defaultData]);

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
      setLoadingStatusArray((prev) => [...prev, "submitting"]);
      const data = await insertLiquidCompat({
        id: defaultData?.key,
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
        shopify.toast.show(data.errorMsg);
      }
      setLoadingStatusArray((prev) =>
        prev.filter((item) => item !== "submitting"),
      );
    } else {
      shopify.toast.show(t("You cannot add two conflicting rules."));
    }
  };

  return (
    <Modal
      title={title}
      open={open}
      onCancel={setIsModalHide}
      centered
      footer={[
        <Space key="updateCustomTransModal_footer">
          <Button onClick={setIsModalHide}>{t("Cancel")}</Button>
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
              setFormData({
                ...formData,
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
