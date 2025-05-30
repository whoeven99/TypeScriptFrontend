import React, { useEffect, useState } from "react";
import { Button, Card, message, Space, Typography } from "antd";
import { useFetcher, useNavigate } from "@remix-run/react";
import { useDispatch, useSelector } from "react-redux";
import { setStatusState } from "~/store/modules/languageTableData";
import TranslatedIcon from "~/components/translateIcon";
import { LanguagesDataType } from "~/routes/app.language/route";
import { useTranslation } from "react-i18next";
const { Text } = Typography;

interface UserLanguageCardProps {
  flagUrl: string[]; // 国旗图片的 URL
  languageName: string; // 语言名称
  languageLocaleName: string;
  languageCode: string; //语言代码
  primaryLanguageCode: string;
  setPreviewModalVisible: (visible: boolean) => void;
  // limited: boolean;
}

// interface FetchType {
//   totalWords: number;
// }

const UserLanguageCard: React.FC<UserLanguageCardProps> = ({
  flagUrl,
  languageName,
  languageLocaleName,
  languageCode,
  primaryLanguageCode,
  setPreviewModalVisible,
  // limited,
}) => {
  const data = useSelector((state: any) =>
    state.languageTableData.rows.find(
      (item: any) => item.locale === languageCode,
    ),
  );
  const datas = useSelector((state: any) => state.languageTableData.rows);
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const translateFetcher = useFetcher<any>();
  const statusFetcher = useFetcher<any>();
  const [showWarnModal, setShowWarnModal] = useState(false);

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
      const timeoutId = setTimeout(() => {
        statusFetcher.submit(formData, {
          method: "post",
          action: "/app",
        });
      }, 2000); // 2秒延时
      // 在组件卸载时清除定时器
      return () => clearTimeout(timeoutId);
    }
  }, [data]);

  useEffect(() => {
    if (statusFetcher.data) {
      if (statusFetcher.data?.data[0]?.status === 2) {
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
        // dispatch(updateState(statusFetcher.data.data[0].resourceType));
        // 清除超时定时器，以防组件卸载后仍然尝试执行
        return () => clearTimeout(delayTimeout);
      } else {
        dispatch(
          setStatusState({
            target: statusFetcher.data.data[0].target,
            status: statusFetcher.data.data[0].status,
          }),
        );
      }
    }
  }, [statusFetcher.data]);

  useEffect(() => {
    if (translateFetcher.data) {
      if (!translateFetcher.data?.data?.success) {
        setShowWarnModal(true);
      } else {
        shopify.toast.show(t("The translation task is in progress."));
        dispatch(
          setStatusState({
            target: translateFetcher.data?.data.target,
            status: 2,
          }),
        );
      }
    }
  }, [translateFetcher.data]);

  const handleTranslate = async () => {
    const selectedTranslatingItem = datas.find(
      (item: LanguagesDataType) => item.status === 2,
    );
    if (!selectedTranslatingItem) {
      const formData = new FormData();
      formData.append(
        "translation",
        JSON.stringify({
          primaryLanguageCode: primaryLanguageCode,
          selectedLanguage: languageCode,
        }),
      ); // 将选中的语言作为字符串发送
      translateFetcher.submit(formData, { method: "post", action: "/app" }); // 提交表单请求
      const installTime = localStorage.getItem('installTime')
      if (!installTime) {
        localStorage.setItem('installTime', new Date().toISOString());
      } else {
        const createTime = new Date(installTime);
        const currentTime = new Date();

        // 计算时间差（毫秒）
        const timeDifference = currentTime.getTime() - createTime.getTime();

        // 转换为天数（1天 = 24 * 60 * 60 * 1000 毫秒）
        const daysDifference = Math.floor(timeDifference / (24 * 60 * 60 * 1000));

        // 如果超过3天，显示评分弹窗
        if (daysDifference >= 3) {
          // 检查localStorage是否已经显示过
          const hasShownRating = localStorage.getItem('hasShownRating');
          if (!hasShownRating) {
            setPreviewModalVisible(true);
            // 标记已经显示过
            localStorage.setItem('hasShownRating', 'true');
          }
        }
      }
    } else {
      shopify.toast.show(
        t(
          "The translation task is in progress. Please try translating again later.",
        ),
      );
    }
  };

  const onClick = () => {
    navigate("/app/manage_translation", { state: { key: languageCode } });
  };

  return (
    <>
      <Card style={{ textAlign: "center", padding: "20px" }}>
        <Space direction="vertical" size="middle" style={{ display: "flex" }}>
          <div className="flag_container">
            {flagUrl.map((url, index) => (
              <div
                key={index}
                style={{
                  width: "60px",
                  height: "40.21px",
                }}>
                <img
                  key={`${index} img`}
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
              </div>
            ))}
          </div>
          <div>
            <Text
              strong
              style={{
                display: "block", // 使用 block 或 inline-block
                whiteSpace: "nowrap", // 不换行
                textAlign: "center",
                overflow: "hidden", // 超出部分隐藏
                textOverflow: "ellipsis", // 超出部分显示省略号
              }}
            >
              {languageName}
            </Text>
            <Text
              strong
              style={{
                display: "block", // 使用 block 或 inline-block
                whiteSpace: "nowrap", // 不换行
                overflow: "hidden", // 超出部分隐藏
                textOverflow: "ellipsis", // 超出部分显示省略号
              }}
            >
              {languageLocaleName}
            </Text>
          </div>
          <div className="language_statu">
            {data ? <TranslatedIcon status={data.status} /> : <Text>...</Text>}
          </div>
          <Space direction="horizontal">
            <Button
              onClick={() => handleTranslate()}
              style={{ width: "100px" }}
              type="primary"
            >
              {t("Translate")}
            </Button>
            <Button onClick={onClick}>{t("Manage")}</Button>
          </Space>
        </Space>
      </Card>
    </>
  );
};

export default UserLanguageCard;
