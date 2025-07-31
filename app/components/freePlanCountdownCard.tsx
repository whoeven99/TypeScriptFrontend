import React, { useState, useEffect } from "react";
import { Card, Button } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import { useSelector } from "react-redux";
import { useNavigate } from "@remix-run/react";

const FreePlanCountdownCard = () => {
  const { plan, updateTime } = useSelector((state: any) => state.userConfig);
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [showBanner, setShowBanner] = useState(true);
  const navigate = useNavigate();

  console.log("plan", plan);
  console.log("updateTime", updateTime);

  useEffect(() => {
    if (plan !== 5 || !updateTime) {
      return;
    }

    const calculateTimeLeft = () => {
      const endTime = new Date(updateTime).getTime() + 7 * 24 * 60 * 60 * 1000; // 7天后
      const now = new Date().getTime();
      const difference = endTime - now;

      if (difference > 0) {
        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor(
          (difference % (1000 * 60 * 60)) / (1000 * 60),
        );
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({ hours, minutes, seconds });
      } else {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [plan, updateTime]);

  const handleBuyClick = () => {
    navigate("/app/pricing");
  };

  const handleClose = () => {
    setShowBanner(false);
  };

  if (plan !== 5 || !updateTime || !showBanner) {
    return null;
  }

  return (
    <Card
      style={{
        backgroundColor: "#FFF9C4",
        border: "none",
        borderRadius: "0",
        marginBottom: "16px",
      }}
      bodyStyle={{
        padding: "12px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      {/* 左侧文本 */}
      <div style={{ flex: 1 }}>
        <span style={{ color: "#000000" }}>
          <span style={{ color: "#4CAF50", fontWeight: "bold" }}>Premium</span>
          计划免费试用即将在
          <span style={{ fontWeight: "bold" }}>
            {timeLeft.hours}小时{timeLeft.minutes}分{timeLeft.seconds}秒
          </span>
          后结束
        </span>
      </div>

      {/* 右侧按钮和关闭图标 */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <Button
          size="small"
          onClick={handleBuyClick}
          style={{
            border: "1px solid #E0E0E0",
            backgroundColor: "#FFFFFF",
            color: "#000000",
            borderRadius: "4px",
            padding: "4px 12px",
            height: "28px",
            fontSize: "12px",
          }}
        >
          直接购买
        </Button>

        <Button
          type="text"
          size="small"
          icon={<CloseOutlined />}
          onClick={handleClose}
          style={{
            padding: "4px",
            height: "28px",
            width: "28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        />
      </div>
    </Card>
  );
};

export default FreePlanCountdownCard;
