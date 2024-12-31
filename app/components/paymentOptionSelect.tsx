import React from "react";
import { OptionType } from "./paymentModal";
import { Typography } from "antd";
import { useTranslation } from "react-i18next";

const { Text } = Typography;

interface PaymentOptionSelectProps {
  option: OptionType;
  selectedOption: OptionType | undefined;
  onChange: (value: OptionType) => void;
}

const PaymentOptionSelect: React.FC<PaymentOptionSelectProps> = ({
  option,
  selectedOption,
  onChange,
}) => {
  const { t } = useTranslation();

  return (
    <div>
      <div
        onClick={() => onChange(option)} // 点击时选中该选项
        className={`payment-option ${JSON.stringify(selectedOption) === JSON.stringify(option) ? "selected" : ""}`}
      >
        <input
          type="radio"
          name="customRadio"
          value={option.price.currentPrice}
          checked={JSON.stringify(selectedOption) === JSON.stringify(option)}
          readOnly
        />
        <Text style={{ display: 'block' }}>{Number(option.Credits).toLocaleString()}</Text>
        <Text>{t("Credits")}</Text>
      </div>
      <div className="price">
        <Text strong style={{ marginRight: "5px", color: "#E74C3C" }}>
          ${option.price.currentPrice}
        </Text>
        <Text type="secondary" style={{ textDecoration: "line-through" }}>${option.price.comparedPrice}</Text>
      </div>
    </div>
  );
};

export default PaymentOptionSelect;
