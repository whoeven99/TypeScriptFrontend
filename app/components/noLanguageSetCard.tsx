import { Card, Space, Button, Typography } from "antd";
import { useNavigate } from "@remix-run/react";
import { useTranslation } from "react-i18next";

const { Title, Paragraph } = Typography;

const NoLanguageSetCard = () => {
  const navigate = useNavigate(); // 用来处理路由跳转
  const { t } = useTranslation();

  return (
    <Card
      style={{
        textAlign: "center",
        padding: "20px",
        width: "100%",
      }}
    >
      <Title level={4}>{t("No languages to translate.")}</Title>
      <Paragraph>
        {t("Your store currently has no languages requiring translation. Please try adding a language.")}
      </Paragraph>
      <Space direction="vertical" size="large">
        <Button
          type="primary"
          onClick={() => {
            navigate("/app/language");
          }}
        >
          {t("Add Language")}
        </Button>
      </Space>
    </Card>
  );
};

export default NoLanguageSetCard;
