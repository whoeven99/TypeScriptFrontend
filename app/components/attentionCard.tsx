import React, { useState } from "react";
import { Banner, Button } from "@shopify/polaris";
import PaymentModal from "./paymentModal";
import { useTranslation } from "react-i18next";

interface AttentionCardProps {
  title: string;
  content: string;
  show: boolean;
}

const AttentionCard: React.FC<AttentionCardProps> = ({
  title,
  content,
  show,
}) => {
  const [visible, setVisible] = useState(true);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const { t } = useTranslation();

  if (!visible) {
    return null; // 如果不可见，返回 null
  }

  return (
    <div>
      {show && (
        <Banner
          title={title}
          tone="critical"
          onDismiss={() => {
            setVisible(false);
          }}
        >
          <div className="banner_content">
            <p>{content}</p>
            <Button onClick={() => setPaymentModalVisible(true)}>
              {t("Buy Credits")}
            </Button>
          </div>
        </Banner>
      )}
      <PaymentModal
        visible={paymentModalVisible}
        setVisible={setPaymentModalVisible}
      />
    </div>
  );
};

export default AttentionCard;
