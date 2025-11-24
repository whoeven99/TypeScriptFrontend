import { useEffect, useMemo, useState } from "react";
import { Modal, Input, Space, Button, Typography, Flex, Select } from "antd";
import { LanguagesDataType } from "~/routes/app.language/route";
import { useTranslation } from "react-i18next";
import { mockIpConfigDataUpdate } from "~/api/JavaServer";
import { globalStore } from "~/globalStore";
import { CurrencyDataType } from "~/routes/app.currency/route";

const { Text } = Typography;

interface UpdateCustomRedirectsModalProps {
  languageTableData: LanguagesDataType[];
  currencyTableData: CurrencyDataType[];
  domainBindingLanguageData: any[];
  regionsData: any[];
  server: string;
  dataSource: {
    key: number;
    status: boolean;
    region: string;
    language: string;
    currency: string;
    redirect_url: string;
  }[];
  defaultData?:
    | {
        key: number;
        status: boolean;
        region: string;
        language: string;
        currency: string;
        redirect_url: string;
      }
    | undefined;
  handleUpdateDataSource: ({
    key,
    region,
    language,
    currency,
    redirect_url,
  }: {
    key?: number;
    region: string;
    language: string;
    currency: string;
    redirect_url: string;
  }) => void;
  type: "create" | "edit";
  open: boolean;
  setIsModalHide: () => void;
}

const UpdateCustomRedirectsModal: React.FC<UpdateCustomRedirectsModalProps> = ({
  languageTableData,
  currencyTableData,
  domainBindingLanguageData,
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
    redirect_url: string;
  }>({
    region: "",
    language: "",
    currency: "",
    redirect_url: "",
  });

  //地区数据
  const regionsOptions = useMemo(() => {
    if (regionsData.length > 0) {
      return regionsData.map((item) => ({
        value: item.code,
        label: item.name,
      }));
    }
  }, [regionsData]);

  //语言数据
  const languageOptions = useMemo(() => {
    if (languageTableData.length > 0) {
      return languageTableData.map((item) => ({
        value: item.locale,
        label: item.name,
      }));
    }
  }, [languageTableData]);

  //货币数据
  const currencyOptions = useMemo(() => {
    if (currencyTableData.length > 0) {
      return currencyTableData.map((item) => ({
        value: item.currencyCode,
        label: item.currency,
      }));
    }
  }, [currencyTableData]);

  //域名数据
  const domainOptions = useMemo(() => {
    if (domainBindingLanguageData.length > 0) {
      return domainBindingLanguageData
        .find(
          (domainBindingLanguageItem) =>
            domainBindingLanguageItem?.region?.code == formData.region,
        )
        ?.domains?.map((domainsItem: any) => ({
          value: domainsItem?.url,
          label: domainsItem?.url,
        }));
    }
  }, [domainBindingLanguageData, formData.region]);

  //存在数据为空时禁用提交
  const confirmButtonDisable = useMemo<boolean>(
    () =>
      !formData.region ||
      !formData.language ||
      !formData.currency ||
      !formData.redirect_url ||
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
        redirect_url: "",
      });
    }
  }, [defaultData, open]);

  useEffect(() => {
    console.log("domainOptions: ", domainOptions);
    console.log("formData: ", formData);

    if (Array.isArray(domainOptions) && domainOptions.length) {
      const findIndex = domainOptions?.find(
        (item: any) => item?.value == formData.redirect_url,
      );
      if (!findIndex) setFormData({ ...formData, redirect_url: "" });
    }
  }, [domainOptions]);

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
      case item == "redirect_url":
        setFormData({
          ...formData,
          redirect_url: e,
        });
        break;
      default:
        break;
    }
  };

  //提交表单数据方法
  const handleConfirm = async (id?: number) => {
    let isSameRuleError = true;

    const { region, language, currency, redirect_url } = formData;

    const isDuplicated = dataSource.some((item: any) => {
      // 如果是 update，需要排除自身
      if (type !== "create" && item.key === id) return false;

      return (
        item.region === region &&
        item.language === language &&
        item.currency === currency &&
        item.redirect_url === redirect_url
      );
    });

    // isSameRuleError = false 代表发现重复规则
    isSameRuleError = !isDuplicated;

    if (isSameRuleError) {
      setLoadingStatusArray((prev) => [...prev, "submitting"]);
      let data;
      if (defaultData) {
        data = await mockIpConfigDataUpdate({
          id: defaultData.key,
          shop: globalStore?.shop || "",
          server: server,
          region: formData.region,
          language: formData.language,
          currency: formData.currency,
          redirect_url: formData.redirect_url,
        });
      } else {
        data = await mockIpConfigDataUpdate({
          shop: globalStore?.shop || "",
          server: server,
          region: formData.region,
          language: formData.language,
          currency: formData.currency,
          redirect_url: formData.redirect_url,
        });
      }

      if (data.success) {
        const newData = {
          key: data.response?.id || defaultData?.key,
          region: data.response?.region,
          language: data.response?.language,
          currency: data.response?.currency,
          redirect_url: data.response?.redirect_url,
        };
        handleUpdateDataSource(newData);
        shopify.toast.show("Saved successfully");
        setFormData({
          ...formData,
          region: "",
          language: "",
          currency: "",
          redirect_url: "",
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
      redirect_url: "",
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
            options={languageOptions}
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
            options={currencyOptions}
            value={formData.currency}
          />
        </Flex>
        <Flex align="center">
          <Text style={{ width: 100, whiteSpace: "nowrap" }}>
            {t("Redirect URL")}:
          </Text>
          <Select
            style={{ flex: 1 }}
            disabled={!formData?.region}
            onChange={(e) => handleChange({ e, item: "redirect_url" })}
            options={domainOptions}
            value={formData.redirect_url}
          />
        </Flex>
      </Space>
    </Modal>
  );
};

export default UpdateCustomRedirectsModal;
