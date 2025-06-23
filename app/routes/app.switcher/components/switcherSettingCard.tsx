import { CloseOutlined } from "@ant-design/icons";
import { Link } from "@shopify/polaris";
import { Card, Space, Button, Typography, Skeleton, ConfigProvider, Divider } from "antd";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const { Text, Paragraph, Title } = Typography;

interface SwitcherSettingCardProps {
  step1Visible: boolean | undefined;
  step2Visible: boolean | undefined;
  setStep1Visible: (visible: boolean) => void;
  setStep2Visible: (visible: boolean) => void;
  loading: boolean;
  shop: string;
  ciwiSwitcherId: string;
  withMoneyValue: string;
  withoutMoneyValue: string;
  defaultCurrencyCode: string;
}

const SwitcherSettingCard: React.FC<SwitcherSettingCardProps> = ({
  step1Visible,
  step2Visible,
  loading,
  shop,
  ciwiSwitcherId,
  withMoneyValue,
  withoutMoneyValue,
}) => {
  const [visible, setVisible] = useState(false);
  const blockUrl = `https://${shop}/admin/themes/current/editor?context=apps&activateAppId=${ciwiSwitcherId}/switcher`;
  const supportUrl =
    "https://ciwi.bogdatech.com/help/frequently-asked-question/how-to-enable-the-app-from-shopify-theme-customization-to-apply-the-language-currency-exchange-switcher/";
  const settingUrl = `https://admin.shopify.com/store/${shop.split(".")[0]}/settings/general`;

  const { t } = useTranslation();

  useEffect(() => {
    if (step1Visible || step2Visible) {
      setVisible(true);
    }
  }, [step1Visible, step2Visible]);

  return (
    <Card
      style={{ display: visible ? "block" : "none" }}
      title={t("Switcher Configuration Guide")}
      extra={
        <Button type="text" onClick={() => setVisible(false)}>
          <CloseOutlined />
        </Button>
      }
      loading={loading}
    >
      <Title level={5}>{t("Step 1: Set up Currency Format")}</Title>
      <Space
        direction="vertical"
        size="small"
        style={{ display: "flex" }}
      >
        <div className="card-header">
          {step1Visible ?
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
            :
            <Text
              strong
              style={{
                backgroundColor: "rgb(224,247,224)",
                color: "rgb(76,175,80)",
                padding: "2px 10px",
                borderRadius: "20px",
              }}
            >
              {t("Completed")}
            </Text>
          }
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
      <Divider />
      <Title level={5}>{t("Step 2: Enable switcher")}</Title>
      <Space
        direction="vertical"
        size="small"
        style={{ display: "flex" }}
      >
        <div className="card-header">
          {step2Visible ?
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
            :
            <Text
              strong
              style={{
                backgroundColor: "rgb(224,247,224)",
                color: "rgb(76,175,80)",
                padding: "2px 10px",
                borderRadius: "20px",
              }}
            >
              {t("Completed")}
            </Text>
          }
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
  );
};

export default SwitcherSettingCard;