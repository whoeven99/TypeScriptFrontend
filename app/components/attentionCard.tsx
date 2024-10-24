import React, { useState } from "react";
import { Card, Button, ConfigProvider, Space } from "antd";
import { CloseOutlined, ExclamationCircleFilled } from "@ant-design/icons";

interface AttentionCardProps {
  title: string;
  content: string;
  buttonContent: string | undefined;
}

const AttentionCard: React.FC<AttentionCardProps> = ({
  title,
  content,
  buttonContent,
}) => {
  const [visible, setVisible] = useState(true);

  if (!visible) {
    return null; // 如果不可见，返回 null
  }

  return (
    <ConfigProvider
      theme={{
        components: {
          Card: {
            /* 这里是你的组件 token */
            headerBg: "rgb(255,184,0)",
          },
        },
      }}
    >
      <Card
        title={
          <>
            <ExclamationCircleFilled />
            <span>&nbsp;</span>
            {`${title}`}
          </>
        }
        extra={
          <Button type="link" onClick={() => setVisible(false)}>
            <CloseOutlined style={{ color: "#000" }} />
          </Button>
        }
        bordered
      >
        <Space direction="vertical" size="middle" style={{ display: "flex" }}>
          <p>{content}</p>
          {buttonContent && (
            <Button type="default" >
              {buttonContent}
            </Button>
          )}
        </Space>
      </Card>
    </ConfigProvider>
  );
};

export default AttentionCard;
