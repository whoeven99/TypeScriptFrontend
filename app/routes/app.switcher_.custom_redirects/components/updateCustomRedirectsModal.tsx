import { useEffect, useMemo, useState } from "react";
import { Modal, Space, Button, Typography, Flex, Select, Popover } from "antd";
import { LanguagesDataType } from "~/routes/app.language/route";
import { useTranslation } from "react-i18next";
import { globalStore } from "~/globalStore";
import { CurrencyDataType } from "~/routes/app.currency/route";
import { UpdateUserIp } from "~/api/JavaServer";
import { WarningOutlined } from "@ant-design/icons";
import currencyLocaleData from "~/utils/currency-locale-data";

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
    languageCode: string;
    currencyCode: string;
  }[];
  defaultData:
    | {
        key: number;
        status: boolean;
        region: string;
        languageCode: string;
        currencyCode: string;
      }
    | undefined;
  handleUpdateDataSource: ({
    key,
    region,
    languageCode,
    currencyCode,
  }: {
    key: number;
    region: string;
    languageCode: string;
    currencyCode: string;
  }) => void;
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
  open,
  setIsModalHide,
}) => {
  const { t } = useTranslation();

  //表单数据依据
  const [formData, setFormData] = useState<{
    region: string;
    languageCode: string;
    currencyCode: string;
  }>({
    region: "",
    languageCode: "",
    currencyCode: "",
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
      return currencyTableData.map((item) => {
        const label = `${
          currencyLocaleData[
            item.currencyCode as keyof typeof currencyLocaleData
          ]?.symbol
        }(${item.currencyCode})`;

        return {
          value: item.currencyCode,
          label: label,
        };
      });
    }
    return [];
  }, [currencyTableData]);

  //存在数据为空时禁用提交
  const confirmButtonDisable = useMemo<boolean>(
    () =>
      !formData.region ||
      !formData.languageCode ||
      !formData.currencyCode ||
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
        languageCode: "",
        currencyCode: "",
      });
    }
  }, [defaultData, open]);

  const handleChange = ({
    e,
    item,
  }: {
    e: string;
    item: "languageCode" | "currencyCode" | "region" | "redirect_url";
  }) => {
    switch (true) {
      case item == "languageCode":
        setFormData({
          ...formData,
          languageCode: e,
        });
        break;
      case item == "currencyCode":
        setFormData({
          ...formData,
          currencyCode: e,
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
    // 编辑表单数据源
    if (!defaultData?.key) return;

    let isSameRuleError = true;

    const { region } = formData;

    const isDuplicated = dataSource.some((item: any) => {
      // 如果是 update，需要排除自身
      if (item.key === id) return false;

      return item.region === region;
    });

    // isSameRuleError = false 代表发现重复规则
    isSameRuleError = !isDuplicated;

    if (isSameRuleError) {
      setLoadingStatusArray((prev) => [...prev, "submitting"]);
      let data;

      data = await UpdateUserIp({
        id: defaultData.key,
        shop: globalStore?.shop || "",
        server: server,
        region: formData.region,
        languageCode: formData.languageCode,
        currencyCode: formData.currencyCode,
      });

      if (data.success) {
        const newData = {
          key: data.response?.id || defaultData?.key,
          region: data.response?.region,
          languageCode: data.response?.languageCode,
          currencyCode: data.response?.currencyCode,
        };
        handleUpdateDataSource(newData);
        shopify.toast.show("Saved successfully");
        setFormData({
          ...formData,
          region: "",
          languageCode: "",
          currencyCode: "",
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
      languageCode: "",
      currencyCode: "",
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
            disabled={true}
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
            onChange={(e) => handleChange({ e, item: "languageCode" })}
            options={[
              {
                label: t("Match visitor's browser"),
                value: "auto",
              },
              ...languageOptions,
            ]}
            value={formData.languageCode}
          />
        </Flex>
        <Flex align="center">
          <Text style={{ width: 100, whiteSpace: "nowrap" }}>
            {t("Currency")}:
          </Text>
          <Select
            style={{ width: "100%" }}
            onChange={(e) => handleChange({ e, item: "currencyCode" })}
            options={[
              {
                label: t("Match visitor’s currency"),
                value: "auto",
              },
              ...currencyOptions,
            ]}
            value={formData.currencyCode}
          />
        </Flex>
      </Space>
    </Modal>
  );
};

export default UpdateCustomRedirectsModal;
