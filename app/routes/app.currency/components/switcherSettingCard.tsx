import { Link } from "@shopify/polaris";
import { Card, Space, Button, Typography } from "antd";
import { useEffect, useState } from "react";

const { Title, Text, Paragraph } = Typography;

interface SwitcherSettingCardProps {
  settingUrl: string;
  moneyWithCurrencyFormatHtml: string | null; //HTML with currency:
  moneyFormatHtml: string | null; //HTML without currency:
}

const SwitcherSettingCard: React.FC<SwitcherSettingCardProps> = ({
  settingUrl,
  moneyWithCurrencyFormatHtml,
  moneyFormatHtml,
}) => {
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [isWithMoneyVisible, setIsWithMoneyVisible] = useState<boolean>();
  const [isWithoutMoneyVisible, setIsWithoutMoneyVisible] =
    useState<boolean>();

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
        moneyWithMoneyDoc.querySelector(".zinn-money");
      const moneyWithoutMoneyElement =
        moneyWithoutMoneyDoc.querySelector(".zinn-money");

      if (
        moneyWithMoneyElement !== null &&
        moneyWithMoneyElement.contains(
          moneyWithMoneyElement.querySelector(".money"),
        )
      ) {
        setIsWithMoneyVisible(false);
      }else{
        setIsWithMoneyVisible(true);
      }

      if (
        moneyWithoutMoneyElement !== null &&
        moneyWithoutMoneyElement.contains(
          moneyWithoutMoneyElement.querySelector(".money"),
        )
      ) {
        setIsWithoutMoneyVisible(false);
      }else{
        setIsWithoutMoneyVisible(true);
      }

      if (!isWithMoneyVisible && !isWithoutMoneyVisible) setIsVisible(false);
      console.log(isWithMoneyVisible, isWithoutMoneyVisible);
    }
  }, [moneyFormatHtml, moneyWithCurrencyFormatHtml]);

  return (
    <div>
      {isVisible && (
        <Card>
          <Space direction="vertical" size="small" style={{ display: "flex" }}>
            <div className="card-header">
              <Title style={{ fontSize: "1.25rem", display: "inline" }}>
                Set up Currency Format
              </Title>

              <Link url={settingUrl} target="_blank">
                <Button type="primary" className="currency-action">
                  Setup
                </Button>
              </Link>
            </div>
            <Text>
              To display currency switcher, please follow the instructions
              below:
            </Text>
            <div>
              <Text>1. Go to </Text>
              <Link url={settingUrl} target="_blank">
                Settings {">>"} General
              </Link>
            </div>
            <Text>
              2. Under the <strong>’Store defaults‘</strong> section, click
              Change currency formatting, then change with the code below:
            </Text>
            {isWithMoneyVisible && (
              <div>
                <strong>HTML with currency:</strong>
                <Paragraph
                  copyable={{
                    text: `<span class="zinn-money">${moneyWithCurrencyFormatHtml}</span>`,
                  }}
                >
                  &lt;span class="zinn-money"&gt;{moneyWithCurrencyFormatHtml}
                  &lt;/span&gt;
                </Paragraph>
              </div>
            )}
            {isWithoutMoneyVisible && (
              <div>
                <strong>HTML without currency:</strong>
                <Paragraph
                  copyable={{
                    text: `<span class="zinn-money">${moneyFormatHtml}</span>`,
                  }}
                >
                  &lt;span class="zinn-money"&gt;{moneyFormatHtml}
                  &lt;/span&gt;
                </Paragraph>
              </div>
            )}
          </Space>
        </Card>
      )}
    </div>
  );
};

export default SwitcherSettingCard;
