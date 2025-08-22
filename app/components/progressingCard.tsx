import React, { useEffect, useState } from "react";
import { Button, Card, Progress, Skeleton, Space, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { useFetcher, useNavigate } from "@remix-run/react";
import { PhoneOutlined } from "@ant-design/icons";
import { handleContactSupport } from "~/routes/app._index/route";
import { GetProgressData, GetUserValue } from "~/api/JavaServer";

const { Text, Title } = Typography;

interface ProgressingCardProps {
  shop: string;
  server: string;
}

const ProgressingCard: React.FC<ProgressingCardProps> = ({ shop, server }) => {
  // const [data, setData] = useState<any>(null);
  const [item, setItem] = useState("");
  // const [itemsCount, setItemsCount] = useState<{
  //     totalNumber: number;
  //     translatedNumber: number;
  // }>({
  //     totalNumber: 0,
  //     translatedNumber: 0,
  // });
  const [value, setValue] = useState<string>("");
  const [source, setSource] = useState<string>("");
  const [target, setTarget] = useState<string[]>([]);
  const [index, setIndex] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);
  const [progressNumber, setProgressNumber] = useState<{
    hasTranslated: number;
    totalNumber: number;
  }>({
    hasTranslated: 0,
    totalNumber: 0,
  });
  const [status, setStatus] = useState<number>(0);
  const [translateStatus, setTranslateStatus] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fetcher = useFetcher<any>();
  const statusFetcher = useFetcher<any>();
  // const itemsFetcher = useFetcher<any>();
  const translateFetcher = useFetcher<any>();
  const stopTranslateFetcher = useFetcher<any>();

  useEffect(() => {
    fetcher.submit(
      {
        nearTransaltedData: JSON.stringify(true),
      },
      {
        method: "post",
        action: "/app",
      },
    );
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (translateFetcher.data) {
      if (translateFetcher.data?.success) {
        setStatus(2);
      }
    }
  }, [translateFetcher.data]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    // 当状态为 2 时，开始轮询
    if (status === 2) {
      const pollStatus = () => {
        // 状态查询请求
        const statusformData = new FormData();
        statusformData.append(
          "statusData",
          JSON.stringify({
            source: source,
            target: [target[index]],
          }),
        );

        statusFetcher.submit(statusformData, {
          method: "post",
          action: "/app",
        });

        async function getProgressData() {
          const progressData = await GetProgressData({
            shopName: shop,
            server,
            target: target[index],
          });

          if (
            !progressData?.response?.TotalQuantity &&
            !progressData?.response?.RemainingQuantity
          ) {
            return;
          }

          const progress = (
            ((progressData?.response?.TotalQuantity -
              progressData?.response?.RemainingQuantity) /
              progressData?.response?.TotalQuantity) *
            100
          ).toFixed(2);
          setProgressNumber({
            hasTranslated:
              progressData?.response?.TotalQuantity -
              progressData?.response?.RemainingQuantity,
            totalNumber: progressData?.response?.TotalQuantity,
          });

          if (typeof progress == "string" || typeof progress == "number") {
            setProgress(parseFloat(progress));
          }
        }

        async function getUserValue() {
          const userValue = await GetUserValue({ shop: shop, server });
          setValue(userValue?.response?.value || "");
          setTranslateStatus(userValue?.response?.status || 2);
        }

        getProgressData();
        getUserValue();

        // setValue(userValue.data.userValue);

        // 设置下一次轮询
        timeoutId = setTimeout(pollStatus, 3000);
      };

      // 开始首次轮询
      pollStatus();

      // 清理函数
      return () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };
    } else if (target[index + 1]) {
      setIndex(index + 1);
      const pollStatus = () => {
        // 状态查询请求
        const statusformData = new FormData();
        statusformData.append(
          "statusData",
          JSON.stringify({
            source: source,
            target: [target[index + 1]],
          }),
        );

        statusFetcher.submit(statusformData, {
          method: "post",
          action: "/app",
        });

        async function getProgressData() {
          const progressData = await GetProgressData({
            shopName: shop,
            server,
            target: target[index],
          });

          if (
            !progressData?.response?.TotalQuantity &&
            !progressData?.response?.RemainingQuantity
          ) {
            return;
          }

          const progress = (
            ((progressData?.response?.TotalQuantity -
              progressData?.response?.RemainingQuantity) /
              progressData?.response?.TotalQuantity) *
            100
          ).toFixed(2);

          setProgressNumber({
            hasTranslated:
              progressData?.response?.TotalQuantity -
                progressData?.response?.RemainingQuantity >=
              0
                ? progressData?.response?.TotalQuantity -
                  progressData?.response?.RemainingQuantity
                : 0,
            totalNumber:
              progressData?.response?.TotalQuantity >= 0
                ? progressData?.response?.TotalQuantity
                : 0,
          });

          if (typeof progress == "string" || typeof progress == "number") {
            setProgress(parseFloat(progress));
          }
        }

        async function getUserValue() {
          const userValue = await GetUserValue({ shop: shop, server });
          setValue(userValue?.response?.value || "");
          setTranslateStatus(userValue?.response?.status || 2);
        }

        getProgressData();
        getUserValue();

        // setValue(userValue.data.userValue);

        // 设置下一次轮询
        timeoutId = setTimeout(pollStatus, 3000);
      };

      // 开始首次轮询
      pollStatus();

      // 清理函数
      return () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };
    }
  }, [status, item]); // 添加 item 到依赖数组

  useEffect(() => {
    if (fetcher.data?.translatingLanguage) {
      setSource(fetcher.data?.translatingLanguage[0]?.source);
      setTarget(
        fetcher.data?.translatingLanguage.map((item: any) => item.target),
      );
      setStatus(fetcher.data?.translatingLanguage[0]?.status);
      setIndex(0);
      setLoading(false);
    }
  }, [fetcher.data]);

  useEffect(() => {
    if (statusFetcher.data?.data) {
      const statusValue =
        statusFetcher.data?.data?.translatesDOResult[0].status;
      setStatus(statusValue);
      if (statusValue === 2) {
        switch (true) {
          case statusFetcher.data?.data?.translatesDOResult[0].resourceType ==
            "SHOP":
            setItem("Shop");
            break;

          case statusFetcher.data?.data?.translatesDOResult[0].resourceType ==
            "PAGE":
            setItem("Pages");
            break;

          case statusFetcher.data?.data?.translatesDOResult[0].resourceType ==
            "ONLINE_STORE_THEME":
            setItem("Theme");
            break;

          case statusFetcher.data?.data?.translatesDOResult[0].resourceType ==
            "PRODUCT":
            setItem("Products");
            break;

          case statusFetcher.data?.data?.translatesDOResult[0].resourceType ==
            "PRODUCT_OPTION":
            setItem("Products");
            break;

          case statusFetcher.data?.data?.translatesDOResult[0].resourceType ==
            "PRODUCT_OPTION_VALUE":
            setItem("Products");
            break;

          case statusFetcher.data?.data?.translatesDOResult[0].resourceType ==
            "COLLECTION":
            setItem("Collection");
            break;

          case statusFetcher.data?.data?.translatesDOResult[0].resourceType ==
            "METAFIELD":
            setItem("Store metadata");
            break;

          case statusFetcher.data?.data?.translatesDOResult[0].resourceType ==
            "ARTICLE":
            setItem("Article");
            break;

          case statusFetcher.data?.data?.translatesDOResult[0].resourceType ==
            "BLOG":
            setItem("Blog titles");
            break;

          case statusFetcher.data?.data?.translatesDOResult[0].resourceType ==
            "MENU":
            setItem("Navigation");
            break;

          case statusFetcher.data?.data?.translatesDOResult[0].resourceType ==
            "LINK":
            setItem("Navigation");
            break;

          case statusFetcher.data?.data?.translatesDOResult[0].resourceType ==
            "FILTER":
            setItem("Filters");
            break;

          case statusFetcher.data?.data?.translatesDOResult[0].resourceType ==
            "METAOBJECT":
            setItem("Metaobjects");
            break;

          case statusFetcher.data?.data?.translatesDOResult[0].resourceType ==
            "ONLINE_STORE_THEME_JSON_TEMPLATE":
            setItem("Theme");
            break;

          case statusFetcher.data?.data?.translatesDOResult[0].resourceType ==
            "ONLINE_STORE_THEME_SECTION_GROUP":
            setItem("Theme");
            break;

          case statusFetcher.data?.data?.translatesDOResult[0].resourceType ==
            "ONLINE_STORE_THEME_SETTINGS_CATEGORY":
            setItem("Theme");
            break;

          case statusFetcher.data?.data?.translatesDOResult[0].resourceType ==
            "ONLINE_STORE_THEME_SETTINGS_DATA_SECTIONS":
            setItem("Theme");
            break;

          case statusFetcher.data?.data?.translatesDOResult[0].resourceType ==
            "PACKING_SLIP_TEMPLATE":
            setItem("Shipping");
            break;

          case statusFetcher.data?.data?.translatesDOResult[0].resourceType ==
            "DELIVERY_METHOD_DEFINITION":
            setItem("Delivery");
            break;

          case statusFetcher.data?.data?.translatesDOResult[0].resourceType ==
            "SHOP_POLICY":
            setItem("Policies");
            break;

          case statusFetcher.data?.data?.translatesDOResult[0].resourceType ==
            "EMAIL_TEMPLATE":
            setItem("Shipping");
            break;

          case statusFetcher.data?.data?.translatesDOResult[0].resourceType ==
            "ONLINE_STORE_THEME_APP_EMBED":
            setItem("Theme");
            break;

          case statusFetcher.data?.data?.translatesDOResult[0].resourceType ==
            "PAYMENT_GATEWAY":
            setItem("Metaobjects");
            break;

          case statusFetcher.data?.data?.translatesDOResult[0].resourceType ==
            "SELLING_PLAN":
            setItem("Metaobjects");
            break;

          case statusFetcher.data?.data?.translatesDOResult[0].resourceType ==
            "SELLING_PLAN_GROUP":
            setItem("Shop");
            break;

          default:
            setItem("");
            break;
        }
      }
    }
  }, [statusFetcher.data]);

  useEffect(() => {
    if (stopTranslateFetcher.data?.data?.success) {
      setStatus(7);
      // setResourceType("");
      setTranslateStatus(1);
    }
  }, [stopTranslateFetcher.data]);

  // useEffect(() => {
  //     if (typeof itemsFetcher.data?.data[0]?.totalNumber === 'number' && typeof itemsFetcher.data?.data[0]?.translatedNumber === 'number') {
  //         setItemsCount({
  //             totalNumber: itemsFetcher.data?.data[0]?.totalNumber || 0,
  //             translatedNumber: itemsFetcher.data?.data[0]?.translatedNumber || 0,
  //         });
  //     }
  // }, [itemsFetcher.data]);

  // useEffect(() => {
  //   if (resourceType) {
  //     const progress = calculateProgressByType(resourceType);
  //     setProgress(progress);
  //   }
  // }, [resourceType]);

  const handleStopTranslate = () => {
    stopTranslateFetcher.submit(
      {
        stopTranslate: JSON.stringify({ source, target: target[index] }),
      },
      {
        method: "post",
        action: "/app",
      },
    );
  };

  const handleReTranslate = () => {
    translateFetcher.submit(
      {
        translation: JSON.stringify({
          primaryLanguage: source,
          selectedLanguage: target,
          translateSettings1: "1",
          translateSettings2: ["1"],
          translateSettings3: [
            "products",
            "collection",
            "article",
            "blog_titles",
            "pages",
            "filters",
            "metaobjects",
            "metadata",
            "navigation",
            "shop",
            "theme",
            "delivery",
            "shipping",
          ],
          customKey: "",
          translateSettings5: false,
        }),
      },
      {
        method: "post",
        action: "/app/language",
      },
    );
  };

  return (
    <Card>
      <Title level={4}>{t("progressing.title")}</Title>
      {loading ? (
        <Skeleton.Button active style={{ height: "130px" }} block />
      ) : (
        <Space direction="vertical" style={{ width: "100%" }}>
          {status !== 0 ? (
            <Card>
              {/* <Space style={{ width: '100%', }} size="small"> */}
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
                        {target[index]}
                      </Text>
                    </div>

                    <div
                      style={{
                        maxWidth: isMobile
                          ? "50%"
                          : status === 1
                            ? "100%"
                            : "80%", // 限制最大宽度
                        textAlign: "start",
                        display: "flex",
                      }}
                    >
                      {status === 1 && <Text>{t("progressing.finished")}</Text>}
                      {status === 2 &&
                        (translateStatus === 1 ? (
                          <Text>{t("progressing.init")}</Text>
                        ) : (
                          <div style={{ width: "100%" }}>
                            <Text
                              style={{
                                width: "100%",
                                whiteSpace: "nowrap",
                                display: "block",
                              }}
                            >
                              {translateStatus === 2
                                ? t("progressing.progressingWithSpace", {
                                    item: t(item),
                                    hasTranslated:
                                      progressNumber.hasTranslated > 0
                                        ? progressNumber.hasTranslated
                                        : 0,
                                    totalNumber:
                                      progressNumber.totalNumber > 0
                                        ? progressNumber.totalNumber
                                        : 0,
                                  })
                                : t("progressing.progressingWriting", {
                                    item: t(item),
                                    hasTranslated: progressNumber.hasTranslated,
                                    totalNumber: progressNumber.totalNumber,
                                  })}
                            </Text>
                            {translateStatus === 2 && (
                              <div style={{ width: "100%" }}>
                                <Text
                                  style={{
                                    display: "flex",
                                    width: "100%",
                                    overflow: "hidden",
                                    color: "#007F61",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  <span style={{ flexShrink: 0 }}>[</span>
                                  <span
                                    style={{
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {value}
                                  </span>
                                  <span style={{ flexShrink: 0 }}>]</span>
                                </Text>
                              </div>
                            )}
                          </div>
                        ))}
                      {status === 3 && (
                        <Text>⚠️{t("progressing.contact")}</Text>
                      )}
                      {status === 4 && (
                        <Text>{t("progressing.somethingWentWrong")}</Text>
                      )}
                      {status === 5 && (
                        <Text>{t("progressing.privateApiKeyAmountLimit")}</Text>
                      )}
                      {status === 6 && (
                        <Text>🎉{t("progressing.hasPayed")}</Text>
                      )}
                      {status === 7 && (
                        <Text>{t("progressing.reTranslateText")}</Text>
                      )}
                    </div>

                    {/* 右侧部分 */}
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
                        status === 1
                          ? 100
                          : translateStatus === 1 && status === 2
                            ? 0
                            : progress
                      }
                      status={
                        status === 1
                          ? "success"
                          : status === 2
                            ? "active"
                            : "normal"
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
                  {status === 1 && (
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
                        onClick={() =>
                          navigate("/app/manage_translation", {
                            state: {
                              key: target[index],
                            },
                          })
                        }
                      >
                        {t("progressing.review")}
                      </Button>
                      <Button
                        block
                        type="primary"
                        onClick={() =>
                          navigate("/app/language", {
                            state: { publishLanguageCode: target[index] },
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
                  {status === 2 && (
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
                        onClick={() =>
                          navigate("/app/manage_translation", {
                            state: {
                              key: target[index],
                            },
                          })
                        }
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
                      <Button
                        block
                        icon={<PhoneOutlined />}
                        onClick={handleContactSupport}
                      >
                        {t("progressing.contactButton")}
                      </Button>
                    </div>
                  )}
                  {status === 6 && (
                    <Button
                      block
                      onClick={handleReTranslate}
                      loading={translateFetcher.state === "submitting"}
                      style={{ marginTop: "auto" }}
                    >
                      {t("progressing.continueTranslate")}
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
                      <Button block onClick={() => navigate("/app/translate")}>
                        {t("progressing.reTranslate")}
                      </Button>
                      <Button
                        block
                        onClick={() =>
                          navigate("/app/manage_translation", {
                            state: {
                              key: target[index],
                            },
                          })
                        }
                      >
                        {t("progressing.review")}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              {/* </Space> */}
            </Card>
          ) : (
            <Card>
              <Text
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  minHeight: "52px",
                }}
              >
                {t("progressing.noTranslate")}
              </Text>
            </Card>
          )}
        </Space>
      )}
    </Card>
  );
};

export default ProgressingCard;
