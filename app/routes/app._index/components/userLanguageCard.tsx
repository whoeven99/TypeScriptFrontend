import React from "react";
import { Button, Card, Space, Typography } from "antd";
import { useNavigate, useSubmit } from "@remix-run/react";
import { useDispatch, useSelector } from "react-redux";
import { setStatuState } from "~/store/modules/languageTableData";
import { CheckCircleTwoTone, LoadingOutlined } from "@ant-design/icons";
const { Title } = Typography;

interface UserLanguageCardProps {
  flagUrl: string; // 国旗图片的 URL
  languageName: string; // 语言名称
  languageCode: string; //语言代码
  wordsNeeded: number; // 需要翻译的字数
  primaryLanguage: string; //用户默认语言
}

const UserLanguageCard: React.FC<UserLanguageCardProps> = ({
  flagUrl,
  languageName,
  languageCode,
  wordsNeeded,
  primaryLanguage,
}) => {
  const data = useSelector((state: any) => state.languageTableData.rows);
  const result = data.filter((item: any) => item.locale === languageCode);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const submit = useSubmit();

  const handleTranslate = async (key: number) => {
    const formData = new FormData();
    formData.append(
      "translation",
      JSON.stringify({
        primaryLanguage: primaryLanguage,
        selectedLanguage: languageCode,
      }),
    ); // 将选中的语言作为字符串发送
    submit(formData, { method: "post", action: "/app" }); // 提交表单请求
    dispatch(setStatuState({ key, status: 2 }));
  };

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

        {result[0].status === 2 ? (
          <LoadingOutlined />
        ) : result[0].status ? (
          <CheckCircleTwoTone twoToneColor="rgb(0,255,0)" />
        ) : (
          <p>
            need to translate: <br /> {wordsNeeded} characters
          </p>
        )}
        <Space direction="horizontal">
          <Button onClick={() => handleTranslate(result[0].key)} type="primary">
            Translate
          </Button>
          <Button onClick={onClick}>Manage</Button>
        </Space>
      </Space>
    </Card>
  );
};

export default UserLanguageCard;
