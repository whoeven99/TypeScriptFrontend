import { CloseOutlined } from "@ant-design/icons";
import { Link } from "@shopify/polaris";
import { Card, Space, Button, Typography, Skeleton } from "antd";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const { Title, Text, Paragraph } = Typography;

interface SwitcherSettingCardProps {
  isEnable: boolean;
  shop: string;
  ciwiSwitcherId: string;
  settingUrl: string;
  moneyWithCurrencyFormatHtml: string | null; //HTML with currency:
  moneyFormatHtml: string | null; //HTML without currency:
  defaultCurrencyCode: string;
}

const SwitcherSettingCard: React.FC<SwitcherSettingCardProps> = ({
  isEnable,
  shop,
  ciwiSwitcherId,
  settingUrl,
  moneyWithCurrencyFormatHtml,
  moneyFormatHtml,
  defaultCurrencyCode,
}) => {
  const blockUrl = `https://${shop}/admin/themes/current/editor?context=apps&addAppBlockId=${ciwiSwitcherId}/switcher&target=sectionGroup:footer`;
  const supportUrl =
    "https://ciwi.bogdatech.com/help/frequently-asked-question/how-to-enable-the-language-currency-exchange-switcher/";
  const [isVisible, setIsVisible] = useState<boolean | undefined>(undefined);
  const [withMoneyValue, setWithMoneyValue] = useState<string>("");
  const [withoutMoneyValue, setWithoutMoneyValue] = useState<string>("");
  const [step1Visible, setStep1Visible] = useState<boolean>(true);
  const [step2Visible, setStep2Visible] = useState<boolean>(true);
  const { t } = useTranslation();

  useEffect(() => {
    if (moneyWithCurrencyFormatHtml && moneyFormatHtml) {
      const parser = new DOMParser();
      const moneyWithMoneyDoc = parser.parseFromString(
        moneyWithCurrencyFormatHtml,
        "text/html",
      );
      const moneyWithoutMoneyDoc = parser.parseFromString(
        moneyFormatHtml,
        "text/html",
      );

      const moneyWithMoneyElement =
        moneyWithMoneyDoc.querySelector(".ciwi-money");
      const moneyWithoutMoneyElement =
        moneyWithoutMoneyDoc.querySelector(".ciwi-money");

      if (moneyWithMoneyElement && moneyWithoutMoneyElement) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }

      const spansWithMoney = moneyWithMoneyDoc.querySelectorAll("span");

      if (spansWithMoney.length) {
        spansWithMoney.forEach((span) => {
          if (span.textContent && span.textContent.trim()) {
            setWithMoneyValue(span.textContent.trim());
          }
        });
      } else {
        setWithMoneyValue(moneyWithCurrencyFormatHtml);
      }

      const spansWithoutMoney = moneyWithoutMoneyDoc.querySelectorAll("span");

      if (spansWithoutMoney.length) {
        spansWithoutMoney.forEach((span) => {
          if (span.textContent && span.textContent.trim()) {
            setWithoutMoneyValue(span.textContent.trim());
          }
        });
      } else {
        setWithoutMoneyValue(moneyFormatHtml);
      }
    }
  }, [moneyWithCurrencyFormatHtml, moneyFormatHtml]);

  return (
    <Space direction="vertical" size="small" style={{ display: "flex" }}>
      {step1Visible &&
        (isVisible !== undefined ? (
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
                {isVisible ? (
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
                ) : (
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
                )}
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
                  isVisible ? (
                    <Paragraph
                      copyable={{
                        text: `<span class="ciwi-money">${withoutMoneyValue} ${defaultCurrencyCode}</span>`,
                      }}
                    >
                      &lt;span class="ciwi-money"&gt;{withoutMoneyValue}{" "}
                      {defaultCurrencyCode}
                      &lt;/span&gt;
                    </Paragraph>
                  ) : (
                    <Paragraph
                      copyable={{
                        text: `<span class="ciwi-money">${withMoneyValue}</span>`,
                      }}
                    >
                      &lt;span class="ciwi-money"&gt;{withMoneyValue}
                      &lt;/span&gt;
                    </Paragraph>
                  )
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
        ) : (
          <Skeleton.Button active style={{ height: 300 }} block />
        ))}
      {step2Visible &&
        (isVisible !== undefined ? (
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
                {isEnable ? (
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
                ) : (
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
                )}
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
        ) : (
          <Skeleton.Button active style={{ height: 200 }} block />
        ))}
    </Space>
  );
};

export default SwitcherSettingCard;
