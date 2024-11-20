import React, { useEffect, useState } from "react";
import { Button, Card, Space, Typography } from "antd";
import { useFetcher, useNavigate, useSubmit } from "@remix-run/react";
import { useDispatch, useSelector } from "react-redux";
import { setStatuState } from "~/store/modules/languageTableData";
import TranslatedIcon from "~/components/translateIcon";
const { Title } = Typography;

interface UserLanguageCardProps {
  flagUrl: string; // 国旗图片的 URL
  languageName: string; // 语言名称
  languageCode: string; //语言代码
  primaryLanguage: string; //用户默认语言
}

// interface FetchData {
//   totalWords: number;
// }

const UserLanguageCard: React.FC<UserLanguageCardProps> = ({
  flagUrl,
  languageName,
  languageCode,
  primaryLanguage,
}) => {
  const data = useSelector((state: any) => state.languageTableData.rows);
  const [result, setResult] = useState<
    {
      key: number;
      language: string;
      locale: string;
      primary: boolean;
      status: number;
      auto_update_translation: boolean;
      published: boolean;
      loading: boolean;
    }[]
  >([{
    key: 2,
    language: 'en',
    locale: 'en-US',
    primary: true,
    status: 0, 
    auto_update_translation: true,
    published: true,
    loading: false,
  }]);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const submit = useSubmit();
  // const fetcher = useFetcher<FetchData>();

  // useEffect(() => {
  //   const formData = new FormData();
  //   formData.append("languageCode", JSON.stringify(languageCode));
  //   fetcher.submit(formData, {
  //     method: "post",
  //     action: "/app",
  //   }); // 提交表单请求
  // }, []);

  // useEffect(() => {
  //   if (fetcher.data && typeof fetcher.data.totalWords === 'number') {
  //     setWords(fetcher.data.totalWords);
  //   } else {
  //     setWords(undefined);
  //   }
  // }, [fetcher.data]);

  useEffect(() => {
    const filteredData = data.filter(
      (item: any) => item.locale === languageCode,
    );
    setResult(filteredData);
  }, [data, languageCode]);

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
          style={{
            width: "60px",
            height: "auto",
            marginBottom: "10px",
            border: "1px solid #888", // 添加灰色边框
            borderRadius: "2px",
          }}
        />
        <Title level={4}>{languageName}</Title>
        <div className="language_statu">
          {result ? <TranslatedIcon status={result[0].status} /> : <>...</>}
        </div>
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
