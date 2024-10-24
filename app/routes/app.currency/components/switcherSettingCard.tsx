import { Link } from "@shopify/polaris";
import { Card, Space, Button, Typography } from "antd";
import { useEffect, useState } from "react";

const { Title, Text, Paragraph } = Typography;

interface SwitcherSettingCardProps {
  settingUrl: string;
  moneyFormatHtml: string | null;
  moneyWithCurrencyFormatHtml: string | null;
}

const SwitcherSettingCard: React.FC<SwitcherSettingCardProps> = ({
  settingUrl,
  moneyFormatHtml,
  moneyWithCurrencyFormatHtml,
}) => {
  const [isVisible, setIsVisible] = useState<boolean>(true);
  useEffect(() => {
    if (moneyFormatHtml && moneyWithCurrencyFormatHtml) {
      const parser = new DOMParser();
      const moneyDoc = parser.parseFromString(moneyFormatHtml, "text/html");
      const moneyWithCurrencyDoc = parser.parseFromString(
        moneyWithCurrencyFormatHtml,
        "text/html",
      );

      const moneyElement = moneyDoc.querySelector(".zinn-money");
      const moneyWithCurrencyElement =
        moneyWithCurrencyDoc.querySelector(".zinn-money");
      if (
        moneyElement !== null &&
        moneyElement.contains(moneyElement.querySelector(".money")) &&
        moneyWithCurrencyElement !== null &&
        moneyWithCurrencyElement.contains(
          moneyWithCurrencyElement.querySelector(".money"),
        )
      )
        setIsVisible(false);
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
            <strong>HTML with currency:</strong>
            <Paragraph copyable>
              &lt;span class="zinn-money"&gt;{moneyFormatHtml}&lt;/span&gt;
            </Paragraph>
            <strong>HTML without currency:</strong>
            <Paragraph copyable>
              &lt;span class="zinn-money"&gt;{moneyWithCurrencyFormatHtml}
              &lt;/span&gt;
            </Paragraph>
          </Space>
        </Card>
      )}
    </div>
  );
};

export default SwitcherSettingCard;
