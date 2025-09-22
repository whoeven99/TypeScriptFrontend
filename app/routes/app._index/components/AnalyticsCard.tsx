import React, { useEffect, useState } from "react";
import { useFetcher } from "@remix-run/react";
import {
  Card,
  Button,
  Statistic,
  Row,
  Col,
  Progress,
  Flex,
  Typography,
  Modal,
  Skeleton,
} from "antd";
import { useNavigate } from "@remix-run/react";
import { useSelector } from "react-redux";
import { BlockStack } from "@shopify/polaris";
import { useTranslation } from "react-i18next";
import useReport from "scripts/eventReport";
const { Text } = Typography;

interface LoadingItem {
  loading: boolean;
}
interface loadingGather {
  translationScore: LoadingItem;
  unTranslated: LoadingItem;
  conversionRate: LoadingItem;
}
type PixelStatus = "loading" | "configured" | "notConfigured";
const AnalyticsCard = ({
  analyticsData,
  shop,
  hasRequiresScopes,
  missScopes,
  isLoading,
}: any) => {
  const { reportClick } = useReport();
  const navigate = useNavigate(); // 统一使用小写 navigate（React Router 规范）
  const { t } = useTranslation();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const graphqlFetcher = useFetcher<any>();
  const queryWebPixelFetcher = useFetcher<any>();
  const [configCreateWebPixel, setConfigPixel] = useState<boolean | null>(null);
  const [showRequireScopeBtn, setShowRequireScopeBtn] =
    useState(!hasRequiresScopes);
  const showModal = () => {
    setIsModalVisible(true);
  };
  const [loadingGather, setLoadingGather] = useState<loadingGather>({
    translationScore: { loading: true },
    unTranslated: { loading: true },
    conversionRate: { loading: true },
  });
  const { plan } = useSelector((state: any) => state.userConfig);
  const Schedule = [
    "Free Plan",
    "Free Plan",
    "Free Flan",
    "Basic Plan",
    "Pro Plan",
    "Premium Plan",
  ];
  const translationScoreFetcher = useFetcher<any>();
  const unTranslatedFetcher = useFetcher<any>();
  const conversionCateFetcher = useFetcher<any>();
  const [translateScoreData, setTranslateData] = useState<any>();
  const [unTranslateWords, setUnTranslateWords] = useState<any>();
  const [conversionRate, setConversionRate] = useState<any>(null);
  const [navigateToRateState, setNavigateToRateState] = useState(false);
  const [improveBtnState, setImproveBtnState] = useState(false);
  const [pixelStatus, setPixelStatus] = useState<PixelStatus>("loading");
  function calculateConversionRate(
    resp: Record<string, Record<string, Record<string, any>>>,
  ): number {
    if (!resp || typeof resp !== "object") return 0;

    const langs = Object.keys(resp);
    if (langs.length === 0) return 0;

    const langAvgs: number[] = [];

    langs.forEach((lang) => {
      const days = resp[lang] ?? {};
      const dailyRates: number[] = [];

      Object.keys(days).forEach((day) => {
        const events = days[day] ?? {};

        // 把可能的字符串数字也转成 number，避免类型问题
        const views = Number(events.page_viewed ?? 0);

        if (views > 0) {
          const clicks = Number(events.product_added_to_cart ?? 0);

          // daily rate (0..+inf)
          dailyRates.push(clicks / views);
        }
      });

      // 如果该语言没有任何有曝光的天，按 0 处理（符合“除以语言总数”的要求）
      const avg =
        dailyRates.length > 0
          ? dailyRates.reduce((a, b) => a + b, 0) / dailyRates.length
          : 0;

      // debug 打印（开发时可打开）
      // console.log(
      //   `[conversion] lang=${lang} dailyRates=`,
      //   dailyRates,
      //   "avg=",
      //   avg,
      // );

      langAvgs.push(avg);
    });

    // 最终 = 各语言平均之和 / 语言总数
    const final =
      langAvgs.reduce((a, b) => a + b, 0) / Math.max(1, langs.length);

    return final; // 返回 0..+inf 的小数，例如 1.25 表示 125%
  }
  const handleOk = async () => {
    try {
      setIsModalVisible(false);
      const response = await shopify.scopes.request(missScopes as string[]);
      shopify.toast.show("授权成功");

      // 创建 Web Pixel
      console.log("开始创建 web pixel");

      await createWebPixel();
    } catch (error: any) {
      shopify.toast.show("授权失败");
    }
  };
  const handleNavigateDetail = () => {
    setImproveBtnState(true);
    navigate("/app/translate_report", {
      state: { analyticsData },
    });
    reportClick("dashboard_optimize_translation_score");
  };
  const handleCancel = () => {
    setIsModalVisible(false);
  };

  // 新增：封装创建 Web Pixel 的函数，便于复用
  const createWebPixel = async () => {
    if (configCreateWebPixel) {
      return; // 已创建，跳过
    }
    console.log("执行 createWebPixel");

    const formData = new FormData();
    formData.append("qualityEvaluation", JSON.stringify({})); // 修正拼写错误，假设是 qualityEvaluation
    graphqlFetcher.submit(formData, {
      method: "post",
      action: "/app",
    });
    console.log("提交创建请求，等待完成");

    // 等待提交完成（useFetcher 是异步的，这里用 Promise 包装等待 idle）
    await new Promise((resolve) => {
      const checkIdle = setInterval(() => {
        if (graphqlFetcher.state === "idle") {
          clearInterval(checkIdle);
          resolve(null);
        }
      }, 100);
    });
    // 创建后立即重新查询更新状态
    queryWebPixel();
  };

  // 新增：封装查询 Web Pixel 的函数
  const queryWebPixel = () => {
    const formData = new FormData();
    formData.append("findWebPixelId", JSON.stringify({}));
    queryWebPixelFetcher.submit(formData, {
      method: "post",
      action: "/app",
    });
  };

  const handleConfigScopes = async () => {
    setNavigateToRateState(true);
    console.log("showRequireScopeBtn: ", showRequireScopeBtn);
    console.log("configCreateWebPixel: ", configCreateWebPixel);

    try {
      if (!showRequireScopeBtn) {
        showModal();
        setNavigateToRateState(false);
        return;
      }

      if (!configCreateWebPixel) {
        await createWebPixel(); // 保持 loading，直到创建完成
      }
      if (!configCreateWebPixel) {
        return;
      }

      navigate("/app/conversion_rate");
    } catch (e) {
      shopify.toast.show("操作失败");
      setNavigateToRateState(false); // 出错才恢复按钮
    }
    reportClick("dashboard_conversion_detail");
  };

  // 组件加载时自动查询 Web Pixel
  useEffect(() => {
    if (queryWebPixelFetcher.state === "idle" && !queryWebPixelFetcher.data) {
      console.log("开始执行web pixel查询");
      queryWebPixel();
    }
  }, []); // 只在 mount 时执行
  useEffect(() => {
    // 初始化获取翻译质量的分数
    const formData = new FormData();
    formData.append("translationScore", JSON.stringify({}));
    translationScoreFetcher.submit(formData, {
      method: "post",
      action: "/app",
    });
    const untranslatedForm = new FormData();
    untranslatedForm.append("unTranslated", JSON.stringify({}));
    unTranslatedFetcher.submit(untranslatedForm, {
      method: "post",
      action: "/app",
    });

    // const conversionForm = new FormData();
    // conversionForm.append("conversionRate", JSON.stringify({}));
    // conversionCateFetcher.submit(conversionForm, {
    //   method: "post",
    //   action: "/app",
    // });
    // console.log("开始请求转换率");
    // if (configCreateWebPixel) {
    //   const conversionForm = new FormData();
    //   conversionForm.append("polarisVizFetcher", JSON.stringify({ days: 7 }));
    //   conversionCateFetcher.submit(conversionForm, {
    //     method: "post",
    //     action: "/app/conversion_rate",
    //   });
    // } else {
    //   setLoadingGather((prev) => ({
    //     ...prev,
    //     conversionRate: {
    //       loading: false,
    //     },
    //   }));
    //   console.log("未配置 pixel，跳过转换率请求");
    // }
  }, []);
  useEffect(() => {
    console.log("configCreateWebPixel changed:", configCreateWebPixel);
    
    if (configCreateWebPixel) {
      // 开始请求前显示 loading（避免闪烁）
      setLoadingGather((prev) => ({
        ...prev,
        conversionRate: { loading: true },
      }));

      const conversionForm = new FormData();
      conversionForm.append("polarisVizFetcher", JSON.stringify({ days: 7 }));
      conversionCateFetcher.submit(conversionForm, {
        method: "post",
        action: "/app/conversion_rate",
      });
    } else {
      // 没配置 Pixel：关掉 loading，但不要显示 "+0%"
      setLoadingGather((prev) => ({
        ...prev,
        conversionRate: { loading: false },
      }));
      // setConversionRate(undefined); // 表示“未配置 / 无数据”
      console.log("未配置 pixel，等待授权/创建后再请求");
    }
  }, [configCreateWebPixel]);
  useEffect(() => {
    if (translationScoreFetcher.data && translationScoreFetcher.data.success) {
      // setLoading(false);
      console.log("translationScoreFetcher: ", translationScoreFetcher.data);
      setTranslateData(translationScoreFetcher.data?.response.data);
      setLoadingGather((prev) => ({
        ...prev,
        translationScore: {
          loading: false,
        },
      }));
    }
  }, [translationScoreFetcher.data]);
  useEffect(() => {
    if (unTranslatedFetcher.data) {
      // setLoading(false);
      console.log("unTranslatedFetcher: ", unTranslatedFetcher.data);
      setUnTranslateWords(unTranslatedFetcher.data?.response);
      setLoadingGather((prev) => ({
        ...prev,
        unTranslated: {
          loading: false,
        },
      }));
    }
  }, [unTranslatedFetcher.data]);
  // useEffect(() => {
  //   if (conversionCateFetcher.data && conversionCateFetcher.data.success) {
  //     // setLoading(false);
  //     console.log("conversionCateFetcher: ", conversionCateFetcher.data);
  //     let resp = conversionCateFetcher.data.response;
  //     // 如果后端给的是 string，就转成对象
  //     if (typeof resp === "string") {
  //       try {
  //         resp = JSON.parse(resp);
  //       } catch (e) {
  //         console.error("解析 conversionRate 响应失败:", e, resp);
  //         return;
  //       }
  //     }
  //     const finalRateDecimal = calculateConversionRate(resp);
  //     const finalRatePercent = Number((finalRateDecimal * 100).toFixed(2));
  //     console.log("转换率结果:", finalRatePercent);

  //     // 存百分比（例如 1 → "100%"）
  //     setConversionRate(finalRatePercent);
  //   } else {
  //     setConversionRate(null);
  //   }

  //   // setConversionRate(conversionCateFetcher.data?.response);
  //   setLoadingGather((prev) => ({
  //     ...prev,
  //     conversionRate: {
  //       loading: false,
  //     },
  //   }));
  // }, [conversionCateFetcher.data]);
  useEffect(() => {
    if (!conversionCateFetcher.data) return;

    try {
      if (conversionCateFetcher.data.success) {
        let resp = conversionCateFetcher.data.response;
        if (typeof resp === "string") {
          resp = JSON.parse(resp);
        }
        const finalRateDecimal = calculateConversionRate(resp);
        const finalRatePercent = Number((finalRateDecimal * 100).toFixed(2));
        setConversionRate(finalRatePercent);
      }
    } catch (e) {
      console.error("解析 conversionRate 响应失败:", e);
      // setConversionRate(null);
    } finally {
      console.log('web pixel 最终执行了');
      
      setLoadingGather((prev) => ({
        ...prev,
        conversionRate: { loading: false },
      }));
    }
  }, [conversionCateFetcher.data]);
  // 监听 graphqlFetcher.data（创建响应），如果需要处理错误或其他逻辑
  useEffect(() => {
    if (graphqlFetcher.data) {
      if (graphqlFetcher.data?.success) {
        // 可在此处理创建成功逻辑，如 toast
        shopify.toast.show("Web Pixel 激活成功");
        console.log(graphqlFetcher.data);
        // 导航到详情页
        navigate("/app/conversion_rate");
        queryWebPixel(); // 创建后重新查询更新状态
      } else {
        shopify.toast.show("Web Pixel 激活失败");
        setNavigateToRateState(false);
      }
    }
  }, [graphqlFetcher.data]);

  // 监听查询结果，更新 configCreateWebPixel
  useEffect(() => {
    if (queryWebPixelFetcher.data) {
      if (queryWebPixelFetcher.data?.success) {
        setConfigPixel(true);
        setPixelStatus("configured");
        console.log("查询成功");
        console.log(queryWebPixelFetcher.data);
      } else {
        setConfigPixel(false);
        setPixelStatus("notConfigured");
        console.log("查询失败");
      }
    }
  }, [queryWebPixelFetcher.data]);
  useEffect(() => {
    const checkScopes = async () => {
      const { granted } = await shopify.scopes.query();
      console.log("exit", granted);
      const missingScopes = missScopes.filter(
        (s: string) => !granted.includes(s),
      );
      setShowRequireScopeBtn(missingScopes.length === 0);
      console.log(showRequireScopeBtn);
    };
    checkScopes();
  }, []);

  return (
    <Card
      title="My assets & analytics"
      extra={<span>{Schedule[plan.id - 1]}</span>}
      style={{ width: "100%" }}
    >
      <Row gutter={[16, 16]}>
        <Col
          xs={24} // 移动端：独占一行
          sm={12} // 平板：两列
          md={8} // 桌面：三列
        >
          {/* Translation Score */}
          <Flex
            vertical
            justify="space-between"
            align="center"
            style={{ height: "100%", minWidth: 200 }}
          >
            <Text>{t("Translation score")}</Text>
            {loadingGather.translationScore.loading ? (
              <Skeleton.Node style={{ height: 50 }} active />
            ) : (
              <Progress
                type="circle"
                percent={translateScoreData?.totalScore}
                format={(percent) => (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      lineHeight: 1.2,
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 600 }}>
                      {percent}
                    </span>
                    <span style={{ fontSize: 12 }}>score</span>
                  </div>
                )}
                size={60}
              />
            )}
            {/* <Progress
                type="circle"
                percent={translateScoreData?.score}
                format={(percent) =>
                  loadingGather.translationScore.loading ? (
                    <Skeleton.Node style={{ width: 30,height:30 }} active />
                  ) : (
                    `${percent} Score`
                  )
                }
                size={60}
              /> */}
            {loadingGather.translationScore.loading ? (
              <Skeleton.Button active />
            ) : (
              <Button
                type="default"
                loading={improveBtnState}
                onClick={handleNavigateDetail}
              >
                {t("Improve")}
              </Button>
            )}
          </Flex>
        </Col>

        <Col xs={24} sm={12} md={8}>
          {/* Untranslated */}
          <Flex
            vertical
            align="center"
            style={{ height: "100%", minWidth: 200 }}
          >
            <Flex
              vertical
              align="center"
              justify="space-between"
              gap="small"
              style={{ flex: 1 }}
            >
              <Text>{t("Untranslated")}</Text>
              <Flex vertical align="center" justify="center" gap="small">
                {loadingGather.unTranslated.loading ? (
                  <Skeleton.Node style={{ width: 50, height: 30 }} active />
                ) : (
                  <Statistic
                    value={unTranslateWords.words}
                    valueStyle={{ fontWeight: 500 }}
                  />
                )}
                <Text>words</Text>
              </Flex>
              {loadingGather.unTranslated.loading ? (
                <Skeleton.Button active />
              ) : (
                <Button
                  type="default"
                  onClick={() => {
                    navigate("/app/language");
                    reportClick("dashboard_go_translation");
                  }}
                >
                  {t("Translate")}
                </Button>
              )}
            </Flex>
          </Flex>
        </Col>

        {/* <Col xs={24} sm={12} md={8}>
          <Flex
            vertical
            align="center"
            justify="center"
            gap="small"
            style={{ height: "100%", minWidth: 200 }}
          >
            <Text>{t("CRO analytics")}</Text>
            <Flex vertical align="center" justify="center" gap="small">
              {loadingGather.conversionRate.loading ? (
                <Skeleton.Input style={{ width: 50 }} active size="small" />
              ) : (
                <Statistic
                  value={conversionRate != null ? `+${conversionRate}%` : "+0%"}
                  valueStyle={{ fontWeight: 500 }}
                />
              )}
              <Text>Compared to 7 days ago</Text>
            </Flex>
            {loadingGather.conversionRate.loading ? (
              <Skeleton.Button active />
            ) : (
              <Button
                type="default"
                loading={navigateToRateState}
                onClick={handleConfigScopes}
              >
                {t("Details")}
              </Button>
            )}
          </Flex>
        </Col> */}
        <Col xs={24} sm={12} md={8}>
          {/* CRO Analytics */}
          <Flex
            vertical
            align="center"
            justify="space-between"
            gap="small"
            style={{ height: "100%", minWidth: 200 }}
          >
            <Text>{t("CRO analytics")}</Text>
            <Flex vertical align="center" justify="center" gap="small">
              {loadingGather.conversionRate.loading ||
              configCreateWebPixel === null ? (
                <Skeleton.Input style={{ width: 50 }} active size="small" />
              ) : !configCreateWebPixel ? (
                // 没配置 Pixel
                <div style={{ textAlign: "center" }}>
                  <Text type="secondary">{t("Pixel not configured")}</Text>
                </div>
              ) : conversionRate === null ? (
                // 已配置，但暂时没数据
                <div style={{ textAlign: "center" }}>
                  <Text type="secondary">{t("No data available")}</Text>
                </div>
              ) : (
                <>
                  <Statistic
                    value={`+${conversionRate}%`}
                    valueStyle={{ fontWeight: 500 }}
                  />
                  <Text>Compared to 7 days ago</Text>
                </>
              )}
            </Flex>

            {/* 按钮：未配置显示 Configure，已配置显示 Details */}
            {loadingGather.conversionRate.loading ||
            configCreateWebPixel === null ? (
              <Skeleton.Button active />
            ) : configCreateWebPixel ? (
              <Button
                type="default"
                loading={navigateToRateState}
                onClick={handleConfigScopes}
              >
                {t("Details")}
              </Button>
            ) : (
              <Button
                type="primary"
                loading={navigateToRateState}
                onClick={handleConfigScopes}
              >
                {t("Configure")}
              </Button>
            )}
          </Flex>
        </Col>
      </Row>

      <Modal
        title={t("Permissions Required")}
        open={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        centered
        okText="确认"
        cancelText="取消"
      >
        <p>
          {t(
            "To provide you with a better experience, this app requires the following permissions:",
          )}
        </p>
        {/* 建议在这里动态列出 missScopes */}
        <ul>
          {missScopes?.map((scope: string) => <li key={scope}>{scope}</li>)}
        </ul>
        <p>{t("Please enable these permissions in your settings.")}</p>
      </Modal>
    </Card>
  );
};

export default AnalyticsCard;
