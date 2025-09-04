import React, { Suspense } from "react";
import { Card, Button, Typography, Skeleton, Space, Popover } from "antd";
import { useTranslation } from "react-i18next";
import { PhoneOutlined, WechatOutlined } from "@ant-design/icons";
import useReport from "scripts/eventReport";
const { Text } = Typography;

interface ContactCardProps {
  isChinese: boolean;
  onClick: () => void;
}

const ContactCard: React.FC<ContactCardProps> = ({ isChinese, onClick }) => {
  const { t } = useTranslation();
  const { report } = useReport();
  const handleContactSupportReport = ()=>{
    report(
      {},
      {
        action: "/app",
        method: "post",
        eventType: "click",
      },
      "dashboard_contact_us",
    );
  }
  return (
    <Card
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
      styles={{
        body: {
          display: "flex",
          flexDirection: "column",
          flex: 1,
        },
      }}
    >
      <Space
        direction="vertical"
        size="middle"
        style={{
          display: "flex",
          justifyContent: "space-between",
          flex: 1,
        }}
      >
        <Text strong style={{ marginBottom: "8px" }}>
          {t("contact.title")}
        </Text>
        <Text>{t("contact.description")}</Text>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          {isChinese ? (
            <Popover
              content={
                <img
                  src="/images/wechat.webp"
                  alt="Wechat"
                  width={200}
                  height={270}
                />
              }
              trigger="click"
            >
              <Button>{t("contact.contactButton")}</Button>
            </Popover>
          ) : (
            <Button onClick={onClick}>{t("contact.contactButton")}</Button>
          )}
        </div>
      </Space>
    </Card>
  );
};

export default ContactCard;
