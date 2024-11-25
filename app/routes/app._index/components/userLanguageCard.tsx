import React, { useEffect, useState } from "react";
import { Button, Card, message, Space, Typography } from "antd";
import { useFetcher, useNavigate, useSubmit } from "@remix-run/react";
import { useDispatch, useSelector } from "react-redux";
import { setStatuState } from "~/store/modules/languageTableData";
import TranslatedIcon from "~/components/translateIcon";
const { Title } = Typography;

interface UserLanguageCardProps {
  flagUrl: string[]; // 国旗图片的 URL
  languageName: string; // 语言名称
  languageCode: string; //语言代码
  primaryLanguage: string; //用户默认语言
}

// interface FetchType {
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
  >([
    {
      key: 2,
      language: "en",
      locale: "en-US",
      primary: true,
      status: 0,
      auto_update_translation: true,
      published: true,
      loading: false,
    },
  ]);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const translateFetcher = useFetcher<any>();
  // const fetcher = useFetcher<FetchType>();

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

  useEffect(() => {
    if (translateFetcher.data && translateFetcher.data.statu) {    
      if (translateFetcher.data.statu.success) {
        message.success("The translation task is in progress.");
        dispatch(
          setStatuState({
            target: translateFetcher.data.statu.target,
            status: 2,
          }),
        );
      } else {
        message.error(translateFetcher.data.statu.errorMsg);
        setStatuState({
          target: translateFetcher.data.statu.target,
          status: 2,
        });
      }
    }
  }, [translateFetcher.data]);

  const handleTranslate = async (key: number) => {
    const formData = new FormData();
    formData.append(
      "translation",
      JSON.stringify({
        primaryLanguage: primaryLanguage,
        selectedLanguage: languageCode,
      }),
    ); // 将选中的语言作为字符串发送
    translateFetcher.submit(formData, { method: "post", action: "/app" }); // 提交表单请求
  };

  const onClick = () => {
    navigate("/app/manage_translation", { state: { key: languageCode } });
  };

  return (
    <Card style={{ textAlign: "center", padding: "20px" }}>
      <Space direction="vertical" size="middle" style={{ display: "flex" }}>
        <div className="flag-container">
          {flagUrl.map((url, index) => (
            <img
              key={index}
              src={url}
              alt={`${languageName} flag`}
              style={{
                width: "60px",
                height: "auto",
                marginBottom: "10px",
                border: "1px solid #888", // 添加灰色边框
                borderRadius: "2px",
              }}
            />
          ))}
        </div>

        <Title level={4}>{languageName}</Title>
        <div className="language_statu">
          {result ? <TranslatedIcon status={result[0].status} /> : <>...</>}
        </div>
        <Space direction="horizontal">
          <Button
            onClick={() => handleTranslate(result[0].key)}
            style={{ width: "100px" }}
            type="primary"
          >
            Translate
          </Button>
          <Button onClick={onClick}>Manage</Button>
        </Space>
      </Space>
    </Card>
  );
};

export default UserLanguageCard;
