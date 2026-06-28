import { Button, Skeleton, Statistic, Typography } from "antd";
import { useTranslation } from "react-i18next";
import "../style.css";

const { Text } = Typography;

interface AcountInfoCardProps {
  loading: boolean;
  translation_balance: number;
  onBuyCredits: () => void;
}

const AcountInfoCard: React.FC<AcountInfoCardProps> = ({
  loading,
  translation_balance,
  onBuyCredits,
}) => {
  const { t } = useTranslation();

  return (
    <div className="pricing-usage-card">
      <div className="pricing-usage-card__metric">
        {loading ? (
          <Skeleton active paragraph={{ rows: 1, width: ["40%"] }} title={false} />
        ) : (
          <div className="pricing-usage-card__metric-main">
            <Statistic
              value={translation_balance}
              formatter={(value) => Number(value || 0).toLocaleString()}
              suffix={t("Credits")}
            />
            <Button onClick={onBuyCredits}>{t("Buy credits")}</Button>
          </div>
        )}
        {!loading ? (
          <>
            <Text type="secondary">{t("Available credits")}</Text>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default AcountInfoCard;
