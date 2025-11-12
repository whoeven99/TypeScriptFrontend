import { useEffect, useMemo, useState } from "react";
import { Modal, Input, Space, Button, Typography, Select, Flex } from "antd";
import { useSelector } from "react-redux";
import { LanguagesDataType } from "~/routes/app.language/route";
import { useTranslation } from "react-i18next";
import { InsertShopNameLiquidData } from "~/api/JavaServer";
import { globalStore } from "~/globalStore";

const { Text } = Typography;

interface UpdateCustomTransModalProps {
  server: string;
  dataSource: {
    key: number;
    sourceText: string;
    targetText: string;
    replacementMethod: boolean;
    languageCode: string;
  }[];
  defaultData?:
    | {
        key: number;
        sourceText: string;
        targetText: string;
        replacementMethod: boolean;
        languageCode: string;
      }
    | undefined;
  handleUpdateDataSource: ({
    key,
    sourceText,
    targetText,
    replacementMethod,
    languageCode,
  }: {
    key?: number;
    sourceText: string;
    targetText: string;
    replacementMethod: boolean;
    languageCode: string;
  }) => void;
  title: string;
  open: boolean;
  setIsModalHide: () => void;
}

const UpdateCustomTransModal: React.FC<UpdateCustomTransModalProps> = ({
  server,
  dataSource,
  defaultData,
  handleUpdateDataSource,
  title,
  open,
  setIsModalHide,
}) => {
  const { t } = useTranslation();

  //语言源数据
  const languageTableData: LanguagesDataType[] = useSelector(
    (state: any) => state.languageTableData.rows,
  );

  //语言数据
  const options = useMemo(() => {
    if (languageTableData.length > 0) {
      return languageTableData.map((item) => ({
        value: item.locale,
        label: item.name,
      }));
    }
  }, [languageTableData]);

  //表单数据依据
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

  //存在数据为空时禁用提交
  const confirmButtonDisable = useMemo<boolean>(
    () =>
      !formData.languageCode ||
      !formData.sourceText ||
      !formData.targetText ||
      JSON.stringify(formData) == JSON.stringify(defaultData),
    [formData],
  );

  //加载状态数组，目前submitting表示正在提交
  const [loadingStatusArray, setLoadingStatusArray] = useState<string[]>([]);

  //初始化表单数据
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

  //提交表单数据方法
  const handleConfirm = async (id?: number) => {
    let isSameRuleError = true;

    const source = formData.sourceText + formData.languageCode;
    dataSource.map((item: any) => {
      const string = item.sourceText + item.languageCode;
      if (title === "Create rule") {
        if (source == string) {
          isSameRuleError = false;
        }
      } else {
        if (source == string && item.key !== id) {
          isSameRuleError = false;
        }
      }
    });

    if (isSameRuleError) {
      setLoadingStatusArray((prev) => [...prev, "submitting"]);
      let data;
      if (defaultData) {
        data = await InsertShopNameLiquidData({
          id: defaultData.key,
          shop: globalStore?.shop || "",
          server: server,
          sourceText: formData.sourceText,
          targetText: formData.targetText,
          replacementMethod: formData.replacementMethod,
          languageCode: formData.languageCode,
        });
      } else {
        data = await InsertShopNameLiquidData({
          shop: globalStore?.shop || "",
          server: server,
          sourceText: formData.sourceText,
          targetText: formData.targetText,
          replacementMethod: formData.replacementMethod,
          languageCode: formData.languageCode,
        });
      }

      if (data.success) {
        const newData = {
          key: data.response?.id || defaultData?.key,
          sourceText: data.response?.liquidBeforeTranslation,
          targetText: data.response?.liquidAfterTranslation,
          replacementMethod: true,
          languageCode: data.response?.languageCode,
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
      setLoadingStatusArray(
        loadingStatusArray.filter((item) => item == "submitting"),
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
