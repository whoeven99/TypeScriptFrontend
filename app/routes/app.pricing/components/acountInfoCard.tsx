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
  totalCredits?: number;
  usedCredits?: number;
  onUpgradePlan?: () => void;
}

const AcountInfoCard: React.FC<AcountInfoCardProps> = ({
  loading,
  translation_balance,
  onBuyCredits,
  planLabel,
  updateTime,
  totalCredits,
  usedCredits,
  onUpgradePlan,
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
      <div
        style={{
          marginTop: 16,
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 12,
        }}
      >
        <MetricBlock label={t("Current plan")} value={planLabel ?? "—"} />
        <MetricBlock
          label={t("Used")}
          value={typeof usedCredits === "number" ? Number(usedCredits).toLocaleString() : "—"}
        />
        <MetricBlock
          label={t("Monthly total")}
          value={typeof totalCredits === "number" ? Number(totalCredits).toLocaleString() : "—"}
        />
      </div>
      <div
        style={{
          marginTop: 16,
          padding: "12px 14px",
          borderRadius: 12,
          background: "rgba(255,255,255,0.72)",
          border: "1px solid var(--app-color-border-secondary)",
          color: "var(--p-color-text-secondary)",
          fontSize: 13,
          lineHeight: "20px",
        }}
      >
        {translation_balance <= 0
          ? t("You are out of credits. Buying extra credits will restore translation immediately.")
          : t(
              "If you translate continuously across multiple markets every month, upgrading the plan is usually more predictable than repeated top-ups.",
            )}
      </div>
      {onUpgradePlan ? (
        <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button onClick={onUpgradePlan}>{t("Upgrade plan")}</Button>
        </div>
      ) : null}
    </Card>
  );
};

export default AcountInfoCard;

function MetricBlock({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: "12px 12px 10px",
        borderRadius: 12,
        background: "rgba(255,255,255,0.78)",
        border: "1px solid var(--app-color-border-secondary)",
      }}
    >
      <div
        style={{
          fontSize: 12,
          lineHeight: "16px",
          color: "var(--p-color-text-tertiary)",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 18,
          lineHeight: "22px",
          fontWeight: 700,
          color: "var(--p-color-text)",
          letterSpacing: "-0.02em",
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}
