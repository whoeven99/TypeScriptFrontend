import { CheckOutlined } from "@ant-design/icons";
import { Button, Card, ConfigProvider, Space, Typography } from "antd";
import { useTranslation } from "react-i18next";
import "../styles.css";

const { Title, Text } = Typography;

interface PlanCardProps {
  title: string;
  price: number;
  descriptions: string[];
  selected: boolean;
  recommended: string;
}

const PlanCard: React.FC<PlanCardProps> = ({
  title,
  price,
  descriptions,
  selected,
  recommended,
}) => {
  const { t } = useTranslation();

  return (
    <ConfigProvider
      theme={{
        components: {
          Card: {
            headerBg: recommended,
          },
        },
      }}
    >
      <Card
        title={recommended ? <span style={{ color: '#ffffff' }}>Recommend</span> : ""}
        style={{ height: "800px" }}
        className={!recommended ? "not_recommended_plan" : ""}
      >
        <Space direction="vertical" size="middle" style={{ display: "flex" }}>
          <Title level={3}>{title}</Title>
          <div className="planCard_pricetext">
            <Text strong style={{ fontSize: "32px" }}>
              ${price}
            </Text>
            <Text>/</Text>
            <Text>{t("month")}</Text>
          </div>
          <Button
            disabled={selected}
            type={recommended ? "primary" : "default"}
          >
            {selected ? t("Current plan") : t("Try 3-day free")}
          </Button>
          <Space direction="vertical" size="small" style={{ display: "flex" }}>
            {descriptions.map((description: any, index: number) => (
              <div className="planCard_description">
                <CheckOutlined style={{ color: "rgb(43, 103, 255)" }} />{" "}
                <Text> {description}</Text>
              </div>
            ))}
          </Space>
        </Space>
      </Card>
    </ConfigProvider>
  );
};

export default PlanCard;
