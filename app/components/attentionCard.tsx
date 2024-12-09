import React, { useState } from "react";
import { Banner, Button } from "@shopify/polaris";
import PaymentModal from "./paymentModal";

interface AttentionCardProps {
  title: string;
  content: string;
  buttonContent: string | undefined;
  show: boolean;
}

const AttentionCard: React.FC<AttentionCardProps> = ({
  title,
  content,
  buttonContent,
  show,
}) => {
  const [visible, setVisible] = useState(true);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);

  if (!visible) {
    return null; // 如果不可见，返回 null
  }

  return (
    <div>
      {!show && (
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
              Buy Credits
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
