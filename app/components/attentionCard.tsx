import React, { useState } from "react";
import { Banner } from "@shopify/polaris";

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

  if (!visible) {
    return null; // 如果不可见，返回 null
  }

  return (
    show && (
      <Banner title={title} tone="critical" onDismiss={() => {}}>
        <p>{content}</p>
      </Banner>
    )
  );
};

export default AttentionCard;
