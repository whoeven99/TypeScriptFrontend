import { CloseOutlined } from "@ant-design/icons";
import { Link } from "@shopify/polaris";
import {
  Card,
  Space,
  Button,
  Typography,
  Skeleton,
  ConfigProvider,
} from "antd";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const { Title, Text, Paragraph } = Typography;

interface SwitcherSettingCardProps {
  step1Visible: boolean | undefined;
  step2Visible: boolean | undefined;
  setStep1Visible: (visible: boolean) => void;
  setStep2Visible: (visible: boolean) => void;
  loading: boolean;
  shop: string;
  ciwiSwitcherId: string;
  settingUrl: string;
  withMoneyValue: string;
  withoutMoneyValue: string;
  defaultCurrencyCode: string;
}

const SwitcherSettingCard: React.FC<SwitcherSettingCardProps> = ({
  step1Visible,
  step2Visible,
  setStep1Visible,
  setStep2Visible,
  loading,
  shop,
  ciwiSwitcherId,
  settingUrl,
  withMoneyValue,
  withoutMoneyValue,
}) => {
  const blockUrl = `https://${shop}/admin/themes/current/editor?context=apps&activateAppId=${ciwiSwitcherId}/ciwi_I18n_Switcher`;
  const supportUrl =
    "https://ciwi.bogdatech.com/help/frequently-asked-question/how-to-enable-the-app-from-shopify-theme-customization-to-apply-the-language-currency-exchange-switcher/";

  const { t } = useTranslation();

  return (
    <ConfigProvider
      theme={{
        components: {
          Card: {
            /* 这里是你的组件 token */
            headerBg: "rgb(136,216,255)",
          },
        },
      }}
    >
      <Space direction="vertical" size="small" style={{ display: "flex" }}>
        {step1Visible &&
          (loading ? (
            <Skeleton.Button active style={{ height: 300 }} block />
          ) : (
            <Card
              title={t("Step 1: Set up Currency Format")}
              extra={
                <Button type="text" onClick={() => setStep1Visible(false)}>
                  <CloseOutlined />
                </Button>
              }
            >
              <Space
                direction="vertical"
                size="small"
                style={{ display: "flex" }}
              >
                <div className="card-header">
                  <Text
                    strong
                    style={{
                      backgroundColor: "rgb(254,211,209)",
                      color: "rgb(142, 31, 11)",
                      padding: "2px 10px",
                      borderRadius: "20px",
                    }}
                  >
                    {t("Uncompleted")}
                  </Text>
                  <Link url={settingUrl} target="_blank">
                    <Button type="primary" className="currency-action">
                      {t("Setup")}
                    </Button>
                  </Link>
                </div>
                <Text>
                  {t(
                    "To display currency switcher, please follow the instructions below:",
                  )}
                </Text>
                <div>
                  <Text>{t("1. Go to")}</Text>
                  <Link url={settingUrl} target="_blank">
                    {t("Settings >> General")}
                  </Link>
                </div>
                <Text>
                  {t("2. Under the")}
                  <strong>{t("'Store defaults'")}</strong>
                  {t(
                    "section, click Change currency formatting, then change with the code below:",
                  )}
                </Text>

                <div>
                  <strong>HTML with currency:</strong>
                  {withMoneyValue ? (
                    // <Paragraph
                    //   copyable={{
                    //     text: `<span class="ciwi-money">${withoutMoneyValue} ${defaultCurrencyCode}</span>`,
                    //   }}
                    // >
                    //   &lt;span class="ciwi-money"&gt;{withoutMoneyValue}{" "}
                    //   {defaultCurrencyCode}
                    //   &lt;/span&gt;
                    // </Paragraph>
                    <Paragraph
                      copyable={{
                        text: `<span class="ciwi-money">${withMoneyValue}</span>`,
                      }}
                    >
                      &lt;span class="ciwi-money"&gt;{withMoneyValue}
                      &lt;/span&gt;
                    </Paragraph>
                  ) : (
                    <Skeleton active paragraph={{ rows: 0 }} />
                  )}
                </div>

                <div>
                  <strong>HTML without currency:</strong>
                  {withoutMoneyValue ? (
                    <Paragraph
                      copyable={{
                        text: `<span class="ciwi-money">${withoutMoneyValue}</span>`,
                      }}
                    >
                      &lt;span class="ciwi-money"&gt;{withoutMoneyValue}
                      &lt;/span&gt;
                    </Paragraph>
                  ) : (
                    <Skeleton active paragraph={{ rows: 0 }} />
                  )}
                </div>
              </Space>
            </Card>
          ))}
        {step2Visible &&
          (loading ? (
            <Skeleton.Button active style={{ height: 300 }} block />
          ) : (
            <Card
              title={t("Step 2: Enable switcher")}
              extra={
                <Button type="text" onClick={() => setStep2Visible(false)}>
                  <CloseOutlined />
                </Button>
              }
            >
              <Space
                direction="vertical"
                size="small"
                style={{ display: "flex" }}
              >
                <div className="card-header">
                  <Text
                    strong
                    style={{
                      backgroundColor: "rgb(254,211,209)",
                      color: "rgb(142, 31, 11)",
                      padding: "2px 10px",
                      borderRadius: "20px",
                    }}
                  >
                    {t("Uncompleted")}
                  </Text>
                </div>
                <Text>
                  {t("Please")}
                  <Link url={blockUrl} target="_blank">
                    {t("Click here")}
                  </Link>
                  {t(
                    "to go to Shopify theme editor >> enable Ciwi_Switcher >> click the Save button in the right corner.",
                  )}
                </Text>
                <Text>
                  {t("Please refer to this")}
                  <Link url={supportUrl} target="_blank">
                    {t("step-by-step guide")}
                  </Link>
                </Text>
              </Space>
            </Card>
          ))}
      </Space>
    </ConfigProvider>
  );
};

export default SwitcherSettingCard;
