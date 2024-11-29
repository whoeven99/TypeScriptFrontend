import React, { useEffect } from "react";
import { Button, Card, message, Space, Typography } from "antd";
import { useFetcher, useNavigate } from "@remix-run/react";
import { useDispatch, useSelector } from "react-redux";
import { setStatuState } from "~/store/modules/languageTableData";
import TranslatedIcon from "~/components/translateIcon";
const { Title } = Typography;

interface UserLanguageCardProps {
  flagUrl: string[]; // 国旗图片的 URL
  languageName: string; // 语言名称
  languageCode: string; //语言代码
  primaryLanguage: string; //用户默认语言
  primaryLanguageCode: string;
}

// interface FetchType {
//   totalWords: number;
// }

const UserLanguageCard: React.FC<UserLanguageCardProps> = ({
  flagUrl,
  languageName,
  languageCode,
  primaryLanguage,
  primaryLanguageCode,
}) => {
  const data = useSelector((state: any) =>
    state.languageTableData.rows.find(
      (item: any) => item.locale === languageCode,
    ),
  );

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const translateFetcher = useFetcher<any>();
  // const fetcher = useFetcher<FetchType>();
  const statusFetcher = useFetcher<any>();

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
    if (data && data.status === 2) {
      const formData = new FormData();
      formData.append(
        "statusData",
        JSON.stringify({
          source: primaryLanguageCode,
          target: [data.locale],
        }),
      );
      statusFetcher.submit(formData, {
        method: "post",
        action: "/app",
      });
    }
  }, []);

  useEffect(() => {
    if (statusFetcher.data) {
      if (statusFetcher.data.data[0].status === 2) {
        // 加入10秒的延时
        const delayTimeout = setTimeout(() => {
          const formData = new FormData();
          formData.append(
            "statusData",
            JSON.stringify({
              source: primaryLanguageCode,
              target: [statusFetcher.data.data[0].target],
            }),
          );

          statusFetcher.submit(formData, {
            method: "post",
            action: "/app",
          });
        }, 10000); // 10秒延时（10000毫秒）

        // 清除超时定时器，以防组件卸载后仍然尝试执行
        return () => clearTimeout(delayTimeout);
      } else {
        dispatch(
          setStatuState({
            target: statusFetcher.data.data[0].target,
            status: statusFetcher.data.data[0].status,
          }),
        );
      }
    }
  }, [statusFetcher.data]);

  useEffect(() => {
    if (translateFetcher.data && translateFetcher.data.data) {
      if (translateFetcher.data.data.success) {
      } else {
        message.error(translateFetcher.data.data.errorMsg);
        dispatch(
          setStatuState({
            target: translateFetcher.data.data.target,
            status: 3,
          }),
        );
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
    dispatch(
      setStatuState({
        target: data.locale,
        status: 2,
      }),
    );
  };

  const onClick = () => {
    navigate("/app/manage_translation", { state: { key: languageCode } });
  };

  return (
    <Card style={{ textAlign: "center", padding: "20px" }}>
      <Space direction="vertical" size="middle" style={{ display: "flex" }}>
        <div className="flag_container">
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
          {data ? <TranslatedIcon status={data?.status} /> : <>...</>}
        </div>
        <Space direction="horizontal">
          <Button
            onClick={() => handleTranslate(data?.key)}
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
