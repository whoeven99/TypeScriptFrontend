import { useEffect, useMemo, useState } from "react";
import { Modal, Input, Space, Button, Typography, Flex, Select } from "antd";
import { LanguagesDataType } from "~/routes/app.language/route";
import { useTranslation } from "react-i18next";
import { globalStore } from "~/globalStore";
import { CurrencyDataType } from "~/routes/app.currency/route";
import { UpdateUserIp } from "~/api/JavaServer";

const { Text } = Typography;

interface UpdateCustomRedirectsModalProps {
  languageTableData: LanguagesDataType[];
  currencyTableData: CurrencyDataType[];
  regionsData: any[];
  server: string;
  dataSource: {
    key: number;
    status: boolean;
    region: string;
    language: string;
    currency: string;
  }[];
  defaultData?:
    | {
        key: number;
        status: boolean;
        region: string;
        language: string;
        currency: string;
      }
    | undefined;
  handleUpdateDataSource: ({
    key,
    region,
    language,
    currency,
  }: {
    key?: number;
    region: string;
    language: string;
    currency: string;
  }) => void;
  type: "create" | "edit";
  open: boolean;
  setIsModalHide: () => void;
}

const UpdateCustomRedirectsModal: React.FC<UpdateCustomRedirectsModalProps> = ({
  languageTableData,
  currencyTableData,
  regionsData,
  server,
  dataSource,
  defaultData,
  handleUpdateDataSource,
  type,
  open,
  setIsModalHide,
}) => {
  const { t } = useTranslation();

  //表单数据依据
  const [formData, setFormData] = useState<{
    region: string;
    language: string;
    currency: string;
  }>({
    region: "",
    language: "",
    currency: "",
  });

  //地区数据
  const regionsOptions = useMemo(() => {
    if (regionsData.length > 0) {
      return regionsData.map((item) => ({
        value: item.code,
        label: item.name,
      }));
    }
    return [];
  }, [regionsData]);

  //语言数据
  const languageOptions = useMemo(() => {
    if (languageTableData.length > 0) {
      return languageTableData.map((item) => ({
        value: item.locale,
        label: item.name,
      }));
    }
    return [];
  }, [languageTableData]);

  //货币数据
  const currencyOptions = useMemo(() => {
    if (currencyTableData.length > 0) {
      return currencyTableData.map((item) => ({
        value: item.currencyCode,
        label: item.currency,
      }));
    }
    return [];
  }, [currencyTableData]);

  //存在数据为空时禁用提交
  const confirmButtonDisable = useMemo<boolean>(
    () =>
      !formData.region ||
      !formData.language ||
      !formData.currency ||
      JSON.stringify(formData) == JSON.stringify(defaultData),
    [formData],
  );

  //加载状态数组，目前submitting表示正在提交
  const [loadingStatusArray, setLoadingStatusArray] = useState<string[]>([]);

  //初始化表单数据
  useEffect(() => {
    if (defaultData && open) {
      setFormData(defaultData);
    } else {
      setFormData({
        region: "",
        language: "",
        currency: "",
      });
    }
  }, [defaultData, open]);

  const handleChange = ({
    e,
    item,
  }: {
    e: string;
    item: "language" | "currency" | "region" | "redirect_url";
  }) => {
    switch (true) {
      case item == "language":
        setFormData({
          ...formData,
          language: e,
        });
        break;
      case item == "currency":
        setFormData({
          ...formData,
          currency: e,
        });
        break;
      case item == "region":
        setFormData({
          ...formData,
          region: e,
        });
        break;
      default:
        break;
    }
  };

  //提交表单数据方法
  const handleConfirm = async (id?: number) => {
    let isSameRuleError = true;

    const { region } = formData;

    const isDuplicated = dataSource.some((item: any) => {
      // 如果是 update，需要排除自身
      if (type !== "create" && item.key === id) return false;

      return item.region === region;
    });

    // isSameRuleError = false 代表发现重复规则
    isSameRuleError = !isDuplicated;

    if (isSameRuleError) {
      setLoadingStatusArray((prev) => [...prev, "submitting"]);
      let data;
      if (defaultData) {
        data = await UpdateUserIp({
          id: defaultData.key,
          shop: globalStore?.shop || "",
          server: server,
          region: formData.region,
          language: formData.language,
          currency: formData.currency,
        });
      } else {
        data = await UpdateUserIp({
          shop: globalStore?.shop || "",
          server: server,
          region: formData.region,
          language: formData.language,
          currency: formData.currency,
        });
      }

      if (data.success) {
        const newData = {
          key: data.response?.id || defaultData?.key,
          region: data.response?.region,
          language: data.response?.language,
          currency: data.response?.currency,
        };
        handleUpdateDataSource(newData);
        shopify.toast.show("Saved successfully");
        setFormData({
          ...formData,
          region: "",
          language: "",
          currency: "",
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

  const onCancel = () => {
    setFormData({
      region: "",
      language: "",
      currency: "",
    });
    setIsModalHide();
  };

  return (
    <Modal
      title={t("Configure Redirect Rule")}
      open={open}
      onCancel={onCancel}
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
        <Text>
          {t(
            "Define the region, language, currency, and redirect URL for this rule.The Switcher will use these settings to direct visitors.",
          )}
        </Text>
        <Flex align="center">
          <Text style={{ width: 100, whiteSpace: "nowrap" }}>
            {t("Region")}:
          </Text>
          <Select
            style={{ flex: 1 }}
            disabled={type == "edit"}
            onChange={(e) => handleChange({ e, item: "region" })}
            options={regionsOptions}
            value={formData.region}
          />
        </Flex>
        <Flex align="center">
          <Text style={{ width: 100, whiteSpace: "nowrap" }}>
            {t("Language")}:
          </Text>
          <Select
            style={{ flex: 1 }}
            onChange={(e) => handleChange({ e, item: "language" })}
            options={[
              {
                label: t("Follow browser language"),
                value: "auto",
              },
              ...languageOptions,
            ]}
            value={formData.language}
          />
        </Flex>
        <Flex align="center">
          <Text style={{ width: 100, whiteSpace: "nowrap" }}>
            {t("Currency")}:
          </Text>
          <Select
            style={{ flex: 1 }}
            onChange={(e) => handleChange({ e, item: "currency" })}
            options={[
              {
                label: t("Follow Ip currency"),
                value: "auto",
              },
              ...currencyOptions,
            ]}
            value={formData.currency}
          />
        </Flex>
      </Space>
    </Modal>
  );
};

export default UpdateCustomRedirectsModal;
