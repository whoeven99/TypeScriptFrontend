import React from "react";
import { Button, Card, Space } from "antd";
import { useNavigate } from "@remix-run/react";

interface UserLanguageCardProps {
  flagUrl: string; // 国旗图片的 URL
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
    navigate("/app/manage_translation",{ state: { key: languageCode } })
  }

  return (
    <Card style={{ textAlign: "center", padding: "20px" }}>
      <Space direction="vertical" size="middle" style={{ display: "flex" }}>
        <img
          src={flagUrl}
          alt={`${languageName} flag`}
          style={{ width: "60px", height: "auto", marginBottom: "10px" }}
        />
        <h3>{languageName}</h3>
        <div>need translate: {wordsNeeded}</div>
        <Button onClick={onClick}>Go to translate</Button>
      </Space>
    </Card>
  );
};

export default UserLanguageCard;
