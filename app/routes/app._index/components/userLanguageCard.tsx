import React from "react";
import { Button, Card, Space, Typography } from "antd";
import { useNavigate, useSubmit } from "@remix-run/react";
const { Title } = Typography;

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
  const submit = useSubmit()

  // const handleTranslate = async (key: number) => {
    
    
  //       const formData = new FormData();
  //       formData.append(
  //         "translation",
  //         JSON.stringify({
  //           primaryLanguage: primaryLanguage,
  //           selectedLanguage: selectedLanguage,
  //         }),
  //       ); // 将选中的语言作为字符串发送
  //       submit(formData, { method: "post", action: "/app/language" }); // 提交表单请求
  //       dispatch(setStatuState({ key, status: 2 }));
     
  // };

  const onClick = () => {
    navigate("/app/manage_translation", { state: { key: languageCode } });
  };

  return (
    <Card style={{ textAlign: "center", padding: "20px" }}>
      <Space direction="vertical" size="middle" style={{ display: "flex" }}>
        <img
          src={flagUrl}
          alt={`${languageName} flag`}
          style={{ width: "60px", height: "auto", marginBottom: "10px" }}
        />
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
