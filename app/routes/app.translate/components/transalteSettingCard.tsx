import { Icon, Page } from "@shopify/polaris";
import {
  Flex,
  Card,
  Checkbox,
  CheckboxChangeEvent,
  Divider,
  Space,
  Typography,
  Radio,
  Popconfirm,
  Button,
  Badge,
  Popover,
} from "antd";
import { useTranslation } from "react-i18next";
import { LanguagesDataType } from "~/routes/app.language/route";
import { PlusIcon } from "@shopify/polaris-icons";
import defaultStyles from "../../styles/defaultStyles.module.css";
import { InfoCircleOutlined } from "@ant-design/icons";
import { useNavigate } from "@remix-run/react";
import { apiKeyConfiguration } from "../route";

const { Title, Text } = Typography;

interface TransalteSettingCardProps {
  translateSettings1: string;
  setTranslateSettings1: (e: string) => void;
  customApikeyData: apiKeyConfiguration[] | undefined;
  checkApiKeyConfiguration: (
    customApikeyData: apiKeyConfiguration[],
    apiName: 0 | 1,
  ) => apiKeyConfiguration | null;
  translateSettings3: string[];
  setTranslateSettings3: (e: string[]) => void;
  translateSettings5: boolean;
  setTranslateSettings5: (e: boolean) => void;
  handleUsePrivateApi: () => void;
  isMobile: boolean;
}

const TransalteSettingCard = ({
  translateSettings1,
  setTranslateSettings1,
  customApikeyData,
  checkApiKeyConfiguration,
  translateSettings3,
  setTranslateSettings3,
  translateSettings5,
  setTranslateSettings5,
  handleUsePrivateApi,
  isMobile,
}: TransalteSettingCardProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleTranslateSettings3Change = (e: string[]) => {
    if (!e.length) {
      shopify.toast.show(t("Select at least one translation item"));
      return;
    } else {
      setTranslateSettings3(e);
    }
  };

  const handleTranslateSettings3SelectAll = (e: CheckboxChangeEvent) => {
    setTranslateSettings3(
      e.target.checked
        ? translateSettings3Options.map((item) => item.value)
        : [],
    );
  };

  const translateSettings1Options = [
    {
      label: t("ChatGPT 4.1"),
      description: t("translateSettings1.description1"),
      speed: 2,
      price: 5,
      value: "2",
    },
    {
      label: t("DeepL"),
      description: t("translateSettings1.description2"),
      speed: 2,
      price: 4,
      value: "3",
    },
    {
      label: t("DeepSeek"),
      description: t("translateSettings1.description3"),
      speed: 1,
      price: 2,
      value: "1",
    },
    {
      label: t("Google Translation"),
      description: t("translateSettings1.description4"),
      speed: 1,
      price: 4,
      value: "4",
    },
  ];

  const translateSettings3Options = [
    {
      label: t("Products"),
      value: "products",
    },
    {
      label: t("Collections"),
      value: "collection",
    },
    {
      label: t("Articles"),
      value: "article",
    },
    {
      label: t("Blog titles"),
      value: "blog_titles",
    },
    {
      label: t("Pages"),
      value: "pages",
    },
    {
      label: t("Filters"),
      value: "filters",
    },
    {
      label: t("Metaobjects"),
      value: "metaobjects",
    },
    {
      label: t("Metafield"),
      value: "metadata",
    },
    {
      label: t("Policies"),
      value: "policies",
    },
    {
      label: t("Navigation"),
      value: "navigation",
    },
    {
      label: t("Shop"),
      value: "shop",
    },
    {
      label: t("Theme"),
      value: "theme",
    },
    {
      label: t("Email"),
      value: "notifications",
    },
    {
      label: t("Delivery"),
      value: "delivery",
    },
    {
      label: t("Shipping"),
      value: "shipping",
    },
    {
      label: "Handle(URL)",
      value: "handle",
    },
  ];

  const translateSettings5Options = [
    {
      label: t("Full Translation"),
      description: t("translateSettings5.description1"),
      value: true,
    },
    {
      label: t("Update Translation"),
      description: t("translateSettings5.description2"),
      value: false,
    },
  ];

  return (
    <Card
      style={{
        width: "100%",
        minHeight: "222px",
        marginBottom: "16px",
      }}
    >
      <Space direction="vertical" size="large" style={{ display: "flex" }}>
        <Space direction="vertical" size={16} style={{ display: "flex" }}>
          <Title level={5} style={{ fontSize: "1rem", margin: "0" }}>
            {t("translateSettings3.title")}
          </Title>
          <Checkbox
            indeterminate={
              translateSettings3.length > 0 &&
              translateSettings3.length < translateSettings3Options.length
            }
            onChange={(e) => handleTranslateSettings3SelectAll(e)}
            checked={
              translateSettings3.length == translateSettings3Options.length
            }
          >
            {t("Check all")}
          </Checkbox>
          <Divider style={{ margin: "0" }} />
          <Checkbox.Group
            value={translateSettings3}
            options={translateSettings3Options}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              width: "100%",
            }}
            onChange={(e) => handleTranslateSettings3Change(e)}
          />
        </Space>
        <Space direction="vertical" size={16} style={{ display: "flex" }}>
          <Space
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Title level={5} style={{ fontSize: "1rem", margin: "0" }}>
              {t("translateSettings5.title")}
            </Title>
          </Space>
          {/* <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr", // 每行只一列，自动换行
            gap: "16px",
            width: "100%",
          }}
        > */}
          {translateSettings5Options.map((item, index) => (
            <Flex
              key={index}
              style={{
                width: "100%",
                marginRight: 0,
                padding: "8px 12px",
                border: "1px solid #f0f0f0",
                borderRadius: "4px",
                alignItems: "center",
                cursor: "pointer",
              }}
              onClick={() => setTranslateSettings5(item.value)}
            >
              <Radio
                key={index}
                value={item.value}
                checked={translateSettings5 === item.value}
              />

              <Text>{item.label}</Text>
              {!isMobile && <Text type="secondary">: {item.description}</Text>}
            </Flex>
          ))}
        </Space>
        <Space direction="vertical" size={16} style={{ display: "flex" }}>
          <Space
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Title level={5} style={{ fontSize: "1rem", margin: "0" }}>
              {t("translateSettings1.title")}
            </Title>

            <Button
              icon={<Icon source={PlusIcon} />}
              onClick={() => handleUsePrivateApi()}
            >
              {t("Use private api to translate")}
            </Button>
          </Space>
          {translateSettings1Options.map((item, index) => (
            <Flex
              key={index}
              style={{
                width: "100%",
                marginRight: 0,
                padding: "8px 12px",
                border: "1px solid #f0f0f0",
                borderRadius: "4px",
                alignItems: "center",
                cursor: "pointer",
              }}
              onClick={() => setTranslateSettings1(item.value)}
            >
              <Radio
                key={index}
                value={item.value}
                checked={translateSettings1 === item.value}
              />
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "95%",
                }}
              >
                <div
                  style={{
                    width: !isMobile ? "65%" : "",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  <Text>{item.label}</Text>
                  <Popover content={item.description}>
                    {!isMobile && (
                      <Text type="secondary">: {item.description}</Text>
                    )}{" "}
                  </Popover>
                </div>
                <Space
                  style={{
                    justifyContent: "flex-end",
                  }}
                >
                  <Text>
                    {t("Speed")}: {item.speed === 2 ? t("Medium") : t("Fast")}
                  </Text>
                </Space>
              </div>
            </Flex>
          ))}
          {customApikeyData &&
            checkApiKeyConfiguration(customApikeyData, 0) && (
              <Badge.Ribbon
                text={t("Private")}
                color="red"
                style={{ top: -2, right: -8 }}
              >
                <div
                  key={8}
                  style={{
                    display: "flex", // 关键
                    width: "100%",
                    marginRight: 0,
                    padding: "8px 12px",
                    border: "1px solid #f0f0f0",
                    borderRadius: "4px",
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                  onClick={() => setTranslateSettings1("8")}
                >
                  <Radio
                    key={8}
                    value={"8"}
                    checked={translateSettings1 === "8"}
                  />
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                    }}
                  >
                    <div
                      style={{
                        width: "50%",
                      }}
                    >
                      <Text>{t("Google Translation")}</Text>
                    </div>
                  </div>
                </div>
              </Badge.Ribbon>
            )}
          {customApikeyData &&
            checkApiKeyConfiguration(customApikeyData, 1) && (
              <Badge.Ribbon
                text={t("Private")}
                color="red"
                style={{ top: -2, right: -8 }}
              >
                <div
                  key={9}
                  style={{
                    display: "flex", // 关键
                    width: "100%",
                    marginRight: 0,
                    padding: "8px 12px",
                    border: "1px solid #f0f0f0",
                    borderRadius: "4px",
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                  onClick={() => setTranslateSettings1("9")}
                >
                  <Radio
                    key={9}
                    value={"9"}
                    checked={translateSettings1 === "9"}
                  />
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                    }}
                  >
                    <div
                      style={{
                        width: "50%",
                      }}
                    >
                      <Text>{`Open AI/ChatGPT(${checkApiKeyConfiguration(customApikeyData, 1)?.apiModel.replace("gpt", "GPT")})`}</Text>
                    </div>
                  </div>
                </div>
              </Badge.Ribbon>
            )}
        </Space>
      </Space>
    </Card>
  );
};

export default TransalteSettingCard;
