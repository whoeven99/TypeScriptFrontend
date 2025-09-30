import React, { useEffect, useState } from "react";
import { Card, Rate, Input, Form, message, Typography, Button } from "antd";
import { useTranslation } from "react-i18next";
import { useFetcher } from "@remix-run/react";
import { CloseOutlined } from "@ant-design/icons";
import useReport from "scripts/eventReport";
const { Text } = Typography;

interface PreviewCardProps {
  shop: string;
}

const PreviewCard: React.FC<PreviewCardProps> = ({ shop }) => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [count, setCount] = useState(0);
  const fetcher = useFetcher<any>();
  const { report } = useReport();
  // 确保组件只在客户端渲染
  useEffect(() => {
    const rate = localStorage.getItem("rate");
    setCount(Number(rate) || 0);
    const isVisible = localStorage.getItem("isVisible");
    setIsVisible(!isVisible);
  }, []);

  const handleRate = async (value: number) => {
    setCount(value);
    localStorage.setItem("rate", JSON.stringify(value));
    // 5星评价时跳转到Shopify应用商店
    fetcher.submit(
      { log: `${shop} 评分为${value}星` },
      { method: "post", action: "/log" },
    );
    if (value === 5) {
      window.open(
        "https://apps.shopify.com/translator-by-ciwi#modal-show=WriteReviewModal",
        "_blank",
      );
    }
    report(
      {
        count: value
      },
      {
        action: "/app",
        method: "post",
        eventType: "click",
      },
      "dashboard_reviews_rate",
    );
  };

  const handleClose = () => {
    localStorage.setItem("isVisible", JSON.stringify(false));
    setIsVisible(false);
  };

  return (
    <Card
      style={{ display: isVisible ? "block" : "none" }}
      extra={
        <Button type="text" onClick={handleClose}>
          <CloseOutlined />
        </Button>
      }
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text>{t("rating.description")}</Text>
        <Rate
          defaultValue={count}
          value={count}
          onChange={(value) => handleRate(value)}
          style={{ minWidth: 132 }}
        />
      </div>
    </Card>
  );
};

export default PreviewCard;
