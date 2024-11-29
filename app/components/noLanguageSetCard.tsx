import { Card, Space, Button, Typography } from "antd";
import { useNavigate } from "@remix-run/react";

const { Title, Paragraph } = Typography;

const NoLanguageSetCard = () => {
  const navigate = useNavigate(); // 用来处理路由跳转

  return (
    <Card style={{ width: 400, textAlign: "center" }} bordered={false}>
      <Title level={4}>No languages to translate.</Title>
      <Paragraph>
        Your store currently has no languages requiring translation. Please try
        adding a language.
      </Paragraph>
      <Space direction="vertical" size="large">
        <Button
          type="primary"
          onClick={() => {
            navigate("/app/language");
          }}
        >
          Add Language
        </Button>
      </Space>
    </Card>
  );
};

export default NoLanguageSetCard;
