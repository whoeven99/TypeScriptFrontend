import React from "react";
import { OptionType } from "./paymentModal";
import { Typography } from "antd";
import { useTranslation } from "react-i18next";
import { v4Colors } from "~/routes/app.translate-v4/v4Styles";

const { Text } = Typography;

interface PaymentOptionSelectProps {
  option: OptionType;
  selectedOption: OptionType | undefined;
  onChange: (value: OptionType) => void;
  variant?: "default" | "v4";
}

const PaymentOptionSelect: React.FC<PaymentOptionSelectProps> = ({
  option,
  selectedOption,
  onChange,
  variant = "default",
}) => {
  const { t } = useTranslation();
  const selected = selectedOption?.key === option.key;
  const isV4 = variant === "v4";

  return (
    <div>
      <div
        onClick={() => onChange(option)}
        className={isV4 ? undefined : `payment-option ${selected ? "selected" : ""}`}
        style={
          isV4
            ? {
                position: "relative",
                minWidth: 0,
                width: "100%",
                padding: "16px 16px 14px",
                borderRadius: 16,
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s ease",
                border: `1px solid ${selected ? v4Colors.primary : v4Colors.cardBorder}`,
                background: selected ? v4Colors.primarySoft : v4Colors.cardBg,
                boxShadow: selected ? "0 0 0 1px rgba(84, 103, 255, 0.08)" : "none",
              }
            : undefined
        }
      >
        <input
          type="radio"
          name="customRadio"
          value={option.price.currentPrice}
          checked={selected}
          readOnly
        />
        {isV4 ? (
          <>
            <div
              aria-hidden
              style={{
                position: "absolute",
                top: 14,
                right: 14,
                width: 18,
                height: 18,
                borderRadius: "50%",
                border: `1.5px solid ${selected ? v4Colors.primary : v4Colors.cardBorder}`,
                background: selected ? v4Colors.primary : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: v4Colors.primaryTextOnFill,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {selected ? "✓" : ""}
            </div>
            <Text
              style={{
                display: "block",
                fontSize: 12,
                lineHeight: "20px",
                color: v4Colors.textMuted,
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              {t("Credits")}
            </Text>
            <Text
              strong
              style={{
                display: "block",
                fontSize: 22,
                lineHeight: 1.1,
                color: v4Colors.text,
                letterSpacing: "-0.03em",
                marginBottom: 8,
              }}
            >
              {option.name}
            </Text>
            <Text style={{ display: "block", color: v4Colors.textMuted, marginBottom: 16 }}>
              {Number(option.Credits).toLocaleString()} {t("credits")}
            </Text>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <Text strong style={{ fontSize: 20, lineHeight: 1, color: v4Colors.text }}>
                ${option.price.currentPrice}
              </Text>
              <Text style={{ color: v4Colors.textMuted }}>{t("one-time")}</Text>
            </div>
          </>
        ) : (
          <>
            <div style={{ whiteSpace: "nowrap" }}>
              <Text>{Number(option.Credits).toLocaleString()} </Text>
              <Text>{t("Credits")}</Text>
            </div>
            <Text strong>
              ${option.price.currentPrice}
            </Text>
          </>
        )}
      </div>
      {/* <div className="price">
        <Text type="secondary" style={{ textDecoration: "line-through" }}>${option.price.comparedPrice}</Text>
      </div> */}
    </div>
  );
};

export default PaymentOptionSelect;
