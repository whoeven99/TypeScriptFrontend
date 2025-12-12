import { PhoneOutlined } from "@ant-design/icons";
import { Progress, Button } from "antd";
import { handleContactSupport } from "../route";
import { Typography } from "antd";
import { useTranslation } from "react-i18next";
import {
  FetcherWithComponents,
  useFetcher,
  useNavigate,
} from "@remix-run/react";
import useReport from "scripts/eventReport";
import { useMemo, useRef, useState } from "react";
import { globalStore } from "~/globalStore";
import { ContinueTranslating } from "~/api/JavaServer";

const { Text } = Typography;

interface ProgressBlockProps {
  taskId: number;
  isMobile: boolean; // 是否为移动端
  source: string; // 原语言
  target: string; // 目标语言
  status: number; // 状态
  translateStatus: string; // 翻译状态
  progressData: {
    RemainingQuantity: number;
    TotalQuantity: number;
  }; // 翻译进度
  value: string; // 翻译值
  module: string; // 翻译项
  languageFetcher: FetcherWithComponents<any>;
  stopTranslateFetcher: FetcherWithComponents<any>;
}

const ProgressBlock: React.FC<ProgressBlockProps> = ({
  taskId,
  isMobile,
  source,
  target,
  status,
  translateStatus,
  progressData,
  module,
  languageFetcher,
  stopTranslateFetcher,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { reportClick, report } = useReport();

  const continueTranslateLock = useRef(false);

  const progress = useMemo(
    () =>
      (
        ((progressData?.TotalQuantity - progressData?.RemainingQuantity) /
          progressData?.TotalQuantity) *
        100
      ).toFixed(3),
    [progressData],
  );

  // const stopButtonLoading = useMemo(() => {
  //   return !!localStorage.getItem("ciwiTransTaskIsStopping");
  // }, [localStorage.getItem("ciwiTransTaskIsStopping")]);

  const [ciwiTransTaskIsContinueArray, setCiwiTransTaskIsContinueArray] =
    useState<number[]>(() => {
      const raw = localStorage.getItem("ciwiTransTaskIsContinue");
      return raw ? JSON.parse(raw) : [];
    });

  const handleContinueTranslate = async () => {
    if (continueTranslateLock.current) return;
    continueTranslateLock.current = true;

    setTimeout(() => {
      continueTranslateLock.current = false;
    }, 1500);

    if (!ciwiTransTaskIsContinueArray.includes(taskId)) {
      const newArr = [...ciwiTransTaskIsContinueArray, taskId];
      setCiwiTransTaskIsContinueArray(newArr);
      localStorage.setItem("ciwiTransTaskIsContinue", JSON.stringify(newArr));
    }

    const continueTranslating = await ContinueTranslating({
      shop: globalStore?.shop || "",
      server: globalStore?.server || "",
      taskId,
    });

    if (continueTranslating?.success) {
      languageFetcher.submit(
        { nearTransaltedData: JSON.stringify(true) },
        { method: "post", action: "/app" },
      );
    } else {
      setCiwiTransTaskIsContinueArray([]);
      localStorage.setItem("ciwiTransTaskIsContinue", JSON.stringify([]));
    }
  };

  const handleReTranslate = async () => {
    navigate("/app/translate");
    reportClick("dashboard_translation_task_retranslate");
  };

  const handleStopTranslate = () => {
    stopTranslateFetcher.submit(
      {
        stopTranslate: JSON.stringify({
          source: source,
          target: target,
        }),
      },
      {
        method: "post",
        action: "/app",
      },
    );
    report(
      {
        stopTranslate: JSON.stringify({
          source: source,
          target: target,
        }),
      },
      { method: "post", action: "/app", eventType: "click" },
      "dashboard_translation_task_stop",
    );
    // localStorage.setItem("ciwiTransTaskIsStopping", "1");
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        flexDirection: isMobile ? "column" : "row",
        width: "100%", // 确保占满容器宽度
        textAlign: "center",
        gap: 10,
        minHeight: "75px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "stretch", // 改为 stretch 让子元素拉伸到相同高度
          width: isMobile ? "100%" : "80%", // 确保占满容器宽度
          textAlign: "center",
          flexDirection: "column",
          // 移除固定高度，让它根据内容自动调整
        }}
      >
        <div
          style={{
            display: "flex",
            width: "100%", // 确保占满容器宽度
            flex: 1, // 让这个区域占据剩余空间
            gap: 30,
          }}
        >
          {/* 左侧部分 */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
            }}
          >
            <Text
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: "#007F61",
                lineHeight: "30px",
                whiteSpace: "nowrap",
              }}
            >
              {target}
            </Text>
          </div>

          <div
            style={{
              display: "flex",
              textAlign: "start",
              maxWidth: isMobile ? "50%" : status === 1 ? "100%" : "80%", // 限制最大宽度
            }}
          >
            {status === 1 && (
              <Text>
                {t(translateStatus, {
                  item: t(module),
                  hasTranslated:
                    progressData.TotalQuantity -
                      progressData.RemainingQuantity >
                    0
                      ? progressData.TotalQuantity -
                        progressData.RemainingQuantity
                      : 0,
                  totalNumber:
                    progressData.TotalQuantity > 0
                      ? progressData.TotalQuantity
                      : 0,
                })}
              </Text>
            )}
            {status === 2 && (
              <Text>
                {t(translateStatus, {
                  item: t(module),
                  hasTranslated:
                    progressData.TotalQuantity -
                      progressData.RemainingQuantity >
                    0
                      ? progressData.TotalQuantity -
                        progressData.RemainingQuantity
                      : 0,
                  totalNumber:
                    progressData.TotalQuantity > 0
                      ? progressData.TotalQuantity
                      : 0,
                })}
              </Text>
            )}
            {status === 3 && <Text>⚠️{t("progressing.contact")}</Text>}
            {status === 4 && <Text>{t("progressing.somethingWentWrong")}</Text>}
            {status === 5 && (
              <Text>{t("progressing.privateApiKeyAmountLimit")}</Text>
            )}
            {status === 6 && <Text>🎉{t("progressing.hasPayed")}</Text>}
            {status === 7 && <Text>{t("progressing.reTranslateText")}</Text>}
          </div>
        </div>
        <div
          style={{
            width: "100%",
            marginTop: "auto", // 将进度条推到底部
            display: isMobile ? "none" : "block",
          }}
        >
          <Progress
            percent={
              translateStatus === "translation_process_init" && status === 2
                ? 0
                : parseFloat(progress)
            }
            status={
              status === 1 ? "success" : status === 2 ? "active" : "normal"
            }
            percentPosition={{ align: "end", type: "inner" }}
            size={["100%", 20]}
            strokeColor="#007F61"
          />
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "stretch", // 改为 stretch 让子元素拉伸到相同高度
          width: isMobile ? "100%" : "20%",
          // 移除固定高度，让它根据按钮内容自动调整
        }}
      >
        {status === 1 && translateStatus == "translation_process_saved" && (
          <div
            style={{
              width: "100%", // 限制最大宽度
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <Button
              block
              onClick={() => {
                navigate(`/app/manage_translation?language=${target}`);
                reportClick("dashboard_translation_task_review");
              }}
            >
              {t("progressing.review")}
            </Button>
            <Button
              block
              type="primary"
              onClick={() =>
                navigate("/app/language", {
                  state: { publishLanguageCode: target },
                })
              }
              style={{
                marginTop: "auto",
              }}
            >
              {t("progressing.publish")}
            </Button>
          </div>
        )}
        {status === 2 &&
          translateStatus == "translation_process_translating" && (
            <Button
              block
              onClick={handleStopTranslate}
              loading={stopTranslateFetcher.state === "submitting"}
              style={{ marginTop: "auto" }}
            >
              {t("progressing.stopTranslate")}
            </Button>
          )}
        {status === 3 && (
          <div
            style={{
              width: "100%", // 限制最大宽度
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <Button
              block
              onClick={() => {
                navigate(`/app/manage_translation?language=${target}`);
                reportClick("dashboard_translation_task_review");
              }}
            >
              {t("progressing.review")}
            </Button>
            <Button
              block
              type="primary"
              onClick={() => navigate("/app/pricing")}
            >
              {t("progressing.buyCredits")}
            </Button>
            <Button
              block
              icon={<PhoneOutlined />}
              onClick={handleContactSupport}
            >
              {t("progressing.contactButton")}
            </Button>
          </div>
        )}
        {status === 4 && (
          <Button
            block
            type="primary"
            icon={<PhoneOutlined />}
            onClick={handleContactSupport}
            style={{ marginTop: "auto" }}
          >
            {t("progressing.contactButton")}
          </Button>
        )}
        {status === 5 && (
          <div
            style={{
              width: "100%", // 限制最大宽度
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <Button
              block
              type="primary"
              onClick={() => navigate("/app/apikeySetting")}
            >
              {t("progressing.apikeySetting")}
            </Button>
            <Button block onClick={handleReTranslate}>
              {t("progressing.reTranslate")}
            </Button>
          </div>
        )}
        {status === 6 && (
          <Button
            block
            onClick={handleReTranslate}
            style={{ marginTop: "auto" }}
          >
            {t("progressing.reTranslate")}
          </Button>
        )}
        {status === 7 && (
          <div
            style={{
              width: "100%", // 限制最大宽度
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <Button
              block
              onClick={handleContinueTranslate}
              loading={ciwiTransTaskIsContinueArray.includes(taskId)}
            >
              {t("progressing.reTranslate")}
            </Button>
            <Button
              block
              onClick={() => {
                navigate(`/app/manage_translation?language=${target}`);
                reportClick("dashboard_translation_task_review");
              }}
            >
              {t("progressing.review")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressBlock;
