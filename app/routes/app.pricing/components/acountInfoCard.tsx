import { Card, Col, Row, Space, Statistic, Tag, Typography } from "antd";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import "../style.css";

const { Title, Text } = Typography;

interface AcountInfoCardProps {
  loading: boolean;
  translation_balance: number;
  ip_balance: number;
}

const AcountInfoCard: React.FC<AcountInfoCardProps> = ({
  loading,
  translation_balance,
  ip_balance,
}) => {
  const { t } = useTranslation();

  const componentData = useMemo(
    () => ({
      translation_balance: translation_balance,
      ip_balance: ip_balance,
    }),
    [translation_balance, ip_balance],
  );

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
      <Space direction="vertical" size="middle" style={{ display: "flex" }}>
        <div className="pricing-usage-card__header">
          <div>
            <Text className="pricing-usage-card__eyebrow">
              {t("Available quota")}
            </Text>
            <Title level={4} style={{ margin: "4px 0 0" }}>
              {t("Use what's left now, then top up only when needed")}
            </Title>
          </div>
          <Tag bordered={false} color="blue">
            {t("Live usage")}
          </Tag>
        </div>
        <Space size={[8, 8]} wrap>
          <Tag bordered={false} className="pricing-usage-card__tag">
            {t("Translation credits never expire")}
          </Tag>
          <Tag bordered={false} className="pricing-usage-card__tag">
            {t("Monthly plan credits can accumulate")}
          </Tag>
          <Tag bordered={false} className="pricing-usage-card__tag">
            {t("Credit transfer is supported")}
          </Tag>
        </Space>
      </Space>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <div className="pricing-usage-card__metric">
            <Text type="secondary">{t("Translation quota")}</Text>
            <Statistic
              value={componentData.translation_balance}
              formatter={(value) => Number(value || 0).toLocaleString()}
              suffix={t("Credits")}
            />
            <Text type="secondary">
              {t("Available for translation tasks, content refreshes, and future updates.")}
            </Text>
          </div>
        </Col>
        <Col xs={24} md={12}>
          <div className="pricing-usage-card__metric">
            <Text type="secondary">{t("IP geo quota")}</Text>
            <Statistic
              value={componentData.ip_balance}
              formatter={(value) => Number(value || 0).toLocaleString()}
              suffix={t("requests")}
            />
            <Text type="secondary">
              {t("Reserved for IP-based workflows and store-level geo requests.")}
            </Text>
          </div>
        </Col>
      </Row>
    </Card>
  );
};

export default AcountInfoCard;
