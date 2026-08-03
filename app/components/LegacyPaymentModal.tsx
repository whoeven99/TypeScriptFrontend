import { Divider, Modal, Space, Typography } from "antd";
import { useTranslation } from "react-i18next";
import PaymentOptionSelect from "./paymentOptionSelect";
import type { OptionType } from "./paymentModal.shared";
import Button from "~/ui/components/AppButton";
import { handleContactSupport } from "~/utils/supportChat";

const { Title, Text } = Typography;

type Props = {
  visible: boolean;
  onCancel: () => void;
  options: OptionType[];
  selectedKey: string;
  selectedOption: OptionType | undefined;
  buyButtonLoading: boolean;
  onSelectOption: (option: OptionType) => void;
  onBuy: () => void;
};

export function LegacyPaymentModal({
  visible,
  onCancel,
  options,
  selectedKey,
  selectedOption,
  buyButtonLoading,
  onSelectOption,
  onBuy,
}: Props) {
  const { t } = useTranslation();

  return (
    <Modal
      open={visible}
      onCancel={onCancel}
      width={1000}
      footer={[
        <div
          key="footer-container"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div key="support-section">
            <Text strong key="cost-question">
              {t("Cost questions: ")}
            </Text>
            <Button
              key="contact-support"
              type="link"
              onClick={handleContactSupport}
              style={{ marginLeft: "-15px" }}
            >
              {t("Contact support")}
            </Button>
          </div>
          <Button
            key="buy-now"
            type="primary"
            onClick={onBuy}
            disabled={buyButtonLoading || !selectedKey}
            loading={buyButtonLoading}
            style={{
              height: "auto",
              paddingTop: "4px",
              paddingBottom: "4px",
            }}
          >
            <div
              key="button-content"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Text key="price" strong style={{ color: "inherit" }}>
                ${selectedOption?.price.currentPrice ?? 0}
              </Text>
              <Text key="buy-text" style={{ color: "inherit" }}>
                {t("Buy now")}
              </Text>
            </div>
          </Button>
        </div>,
      ]}
    >
      <Title level={4} style={{ textAlign: "center", marginTop: "20px" }}>
        {t("Not enough translation credits. Purchase more to continue")}
      </Title>

      <Divider />
      <Title level={5}>{t("Buy credits")}</Title>
      <div className="options_wrapper">
        <Space direction="vertical">
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "16px",
              width: "100%",
            }}
          >
            {options.map((option) => (
              <div
                key={option.name}
                style={{
                  flex: "0 1 auto",
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <PaymentOptionSelect
                  option={option}
                  selectedOption={selectedOption}
                  onChange={onSelectOption}
                />
              </div>
            ))}
          </div>
        </Space>
      </div>
      <Divider />
      <div className="total_payment">
        <Text style={{ marginRight: "5px" }}>{t("Total Payment:")}</Text>
        <Text strong>
          $
          {selectedOption?.price.currentPrice
            ? selectedOption.price.currentPrice
            : 0}
        </Text>
      </div>
    </Modal>
  );
}
