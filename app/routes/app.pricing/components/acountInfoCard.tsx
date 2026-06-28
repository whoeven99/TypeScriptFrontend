import { Card, Col, Row, Space, Statistic, Tag, Typography } from "antd";
import { useTranslation } from "react-i18next";
import "../style.css";

const { Title, Text } = Typography;

interface AcountInfoCardProps {
  loading: boolean;
  translation_balance: number;
}

const AcountInfoCard: React.FC<AcountInfoCardProps> = ({
  loading,
  translation_balance,
}) => {
  const { t } = useTranslation();

  return (
    <Card
      loading={loading}
      className="pricing-usage-card"
      style={{ border: "none", boxShadow: "none" }}
      styles={{
        body: {
          padding: 0,
        },
      }}
    >
      <div className="pricing-usage-card__header">
        <div>
          <Text className="pricing-usage-card__eyebrow">{t("Available quota")}</Text>
          <Title level={4} style={{ margin: "4px 0 0" }}>
            {t("Translation quota")}
          </Title>
        </div>
        <Tag bordered={false} color="blue">
          {t("Live")}
        </Tag>
      </div>
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <div className="pricing-usage-card__metric">
            <Statistic
              value={translation_balance}
              formatter={(value) => Number(value || 0).toLocaleString()}
              suffix={t("Credits")}
            />
          </div>
        </Col>
      </Row>
    </Card>
  );
};

export default AcountInfoCard;
