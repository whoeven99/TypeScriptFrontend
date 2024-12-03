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
  const [isWithMoneyVisible, setIsWithMoneyVisible] = useState<boolean>(true);
  const [isWithoutMoneyVisible, setIsWithoutMoneyVisible] =
    useState<boolean>(true);

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

      if (moneyWithMoneyElement !== null) {
        setIsWithMoneyVisible(false);
      }

      if (moneyWithoutMoneyElement !== null) {
        setIsWithoutMoneyVisible(false);
      }

      if (moneyWithMoneyElement && moneyWithoutMoneyElement)
        setIsVisible(false);
    }
  }, [moneyWithCurrencyFormatHtml, moneyFormatHtml]);

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
                    text: `<span class="ciwi-money">${moneyWithCurrencyFormatHtml}</span>`,
                  }}
                >
                  &lt;span class="ciwi-money"&gt;{moneyWithCurrencyFormatHtml}
                  &lt;/span&gt;
                </Paragraph>
              </div>
            )}
            {isWithoutMoneyVisible && (
              <div>
                <strong>HTML without currency:</strong>
                <Paragraph
                  copyable={{
                    text: `<span class="ciwi-money">${moneyFormatHtml}</span>`,
                  }}
                >
                  &lt;span class="ciwi-money"&gt;{moneyFormatHtml}
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
