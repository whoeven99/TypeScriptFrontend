import { Button, Card, Statistic, Typography } from "antd";
import { useTranslation } from "react-i18next";
import "../style.css";

const { Title, Text } = Typography;

interface AcountInfoCardProps {
  loading: boolean;
  translation_balance: number;
  onBuyCredits: () => void;
  planLabel?: string;
  updateTime?: string | null;
}

const AcountInfoCard: React.FC<AcountInfoCardProps> = ({
  loading,
  translation_balance,
  onBuyCredits,
  planLabel,
  updateTime,
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
          <Title level={4} style={{ margin: 0 }}>
            {t("Billing overview")}
          </Title>
          <Text type="secondary">
            {planLabel ? `${planLabel} · ` : ""}
            {t("See your available credits and decide whether to upgrade or buy extra volume.")}
          </Text>
        </div>
        <Button type="primary" onClick={onBuyCredits}>
          {t("Buy Credit")}
        </Button>
      </div>
      <div className="pricing-usage-card__metric">
        <Statistic
          value={translation_balance}
          formatter={(value) => Number(value || 0).toLocaleString()}
          suffix={t("Credits")}
        />
        {updateTime ? (
          <Text type="secondary">
            {t("Next plan update: {{date}}", { date: updateTime })}
          </Text>
        ) : null}
      </div>
    </Card>
  );
};

export default AcountInfoCard;
