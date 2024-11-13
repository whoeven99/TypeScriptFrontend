import React from "react";
import { Button, Card, Space, Typography } from "antd";
import { useNavigate } from "@remix-run/react";
const { Title } = Typography;

interface UserLanguageCardProps {
  flagUrl: string[]; // 国旗图片的 URL
  languageName: string; // 语言名称
  languageCode: string; //语言代码
  wordsNeeded: number; // 需要翻译的字数
}

const UserLanguageCard: React.FC<UserLanguageCardProps> = ({
  flagUrl,
  languageName,
  languageCode,
  wordsNeeded,
}) => {
  const navigate = useNavigate();

  const onClick = () => {
    navigate("/app/manage_translation", { state: { key: languageCode } });
  };

  return (
    <Card style={{ textAlign: "center", padding: "20px" }}>
      <Space direction="vertical" size="middle" style={{ display: "flex" }}>
        {flagUrl.map((url: string) => (
          <img
            src={url}
            alt={`${languageName} flag`}
            style={{ width: "60px", height: "auto", marginBottom: "10px" }}
          />
        ))}
        <Title level={4}>{languageName}</Title>
        <div>It takes about {wordsNeeded} characters</div>
        <Space direction="horizontal">
          <Button onClick={onClick} type="primary">
            translate
          </Button>
          <Button onClick={onClick}>manage</Button>
        </Space>
      </Space>
    </Card>
  );
};

export default UserLanguageCard;
