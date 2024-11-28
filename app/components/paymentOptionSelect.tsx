import React from "react";
import { OptionType } from "./paymentModal";
import { Typography } from "antd";

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
        <span>{option.name}</span>
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
