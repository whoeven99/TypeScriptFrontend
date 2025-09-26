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
import { useTranslation } from "react-i18next";
import useReport from "scripts/eventReport";
const { Text, Title } = Typography;

interface LoadingItem {
  loading: boolean;
}
interface loadingGather {
  translationScore: LoadingItem;
  unTranslated: LoadingItem;
  conversionRate: LoadingItem;
}
const AnalyticsCard = ({ hasRequiresScopes, missScopes, isLoading }: any) => {
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
    translationScore: { loading: false },
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
  const resourceModules = [
    "SHOP",
    "PAGE",
    "ONLINE_STORE_THEME",
    // "ONLINE_STORE_THEME_LOCALE_CONTENT", // 注释掉
    "PRODUCT",
    "PRODUCT_OPTION",
    "PRODUCT_OPTION_VALUE",
    "COLLECTION",
    "METAFIELD",
    "ARTICLE",
    "BLOG",
    "MENU",
    "LINK",
    "FILTER",
    "METAOBJECT",
    "ONLINE_STORE_THEME_JSON_TEMPLATE",
    "ONLINE_STORE_THEME_SECTION_GROUP",
    // "ONLINE_STORE_THEME_SETTINGS_CATEGORY",
    "ONLINE_STORE_THEME_SETTINGS_DATA_SECTIONS",
    "PACKING_SLIP_TEMPLATE",
    "DELIVERY_METHOD_DEFINITION",
    "SHOP_POLICY",
    // "EMAIL_TEMPLATE",
    // "ONLINE_STORE_THEME_APP_EMBED",
    "PAYMENT_GATEWAY",
    "SELLING_PLAN",
    "SELLING_PLAN_GROUP",
  ];
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
        const views = Number(events.page_viewed ?? 0);
        if (views > 0) {
          const clicks = Number(events.product_added_to_cart ?? 0);

          // daily rate (0..+inf)
          dailyRates.push(clicks / views);
        }
      });
      const avg =
        dailyRates.length > 0
          ? dailyRates.reduce((a, b) => a + b, 0) / dailyRates.length
          : 0;
      langAvgs.push(avg);
    });

    const final =
      langAvgs.reduce((a, b) => a + b, 0) / Math.max(1, langs.length);

    return final; // 返回 0..+inf 的小数，例如 1.25 表示 125%
  }
  const handleOk = async () => {
    try {
      setIsModalVisible(false);
      const response = await shopify.scopes.request(missScopes as string[]);
      shopify.toast.show(t("Authorization successful"));

      await createWebPixel();
    } catch (error: any) {
      shopify.toast.show(t("Authorization failed"));
    }
  };
  const handleNavigateDetail = () => {
    setImproveBtnState(true);
    navigate("/app/translate_report");
    reportClick("dashboard_optimize_translation_score");
  };
  const handleCancel = () => {
    setIsModalVisible(false);
  };

  // 新增：封装创建 Web Pixel 的函数，便于复用
  const createWebPixel = async () => {
    if (configCreateWebPixel) {
      return;
    }
    const formData = new FormData();
    formData.append("qualityEvaluation", JSON.stringify({})); // 修正拼写错误，假设是 qualityEvaluation
    graphqlFetcher.submit(formData, {
      method: "post",
      action: "/app",
    });

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
      setNavigateToRateState(false); // 出错才恢复按钮
    }
    reportClick("dashboard_conversion_detail");
  };

  // 组件加载时自动查询 Web Pixel
  useEffect(() => {
    const translateReportData = localStorage.getItem(
      "translate_report_score",
    ) as any;
    if (queryWebPixelFetcher.state === "idle" && !queryWebPixelFetcher.data) {
      queryWebPixel();
    }
    if (translateReportData) {
      setTranslateData(translateReportData);
    } else {
      // 初始化获取翻译质量的分数
      const formData = new FormData();
      formData.append("translationScore", JSON.stringify({}));
      translationScoreFetcher.submit(formData, {
        method: "post",
        action: "/app/translate_report",
      });
      setLoadingGather((prev) => ({
        ...prev,
        translationScore: {
          loading: true,
        },
      }));
    }
  }, []); // 只在 mount 时执行
  useEffect(() => {
    const untranslatedForm = new FormData();
    untranslatedForm.append(
      "unTranslated",
      JSON.stringify({ resourceModules }),
    );
    unTranslatedFetcher.submit(untranslatedForm, {
      method: "post",
      action: "/app",
    });
  }, []);
  useEffect(() => {
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
    }
  }, [configCreateWebPixel]);
  useEffect(() => {
    if (translationScoreFetcher.data && translationScoreFetcher.data.success) {
      // setLoading(false);
      setTranslateData(Math.ceil(translationScoreFetcher.data?.response * 100));
      setLoadingGather((prev) => ({
        ...prev,
        translationScore: {
          loading: false,
        },
      }));
      localStorage.setItem(
        "translate_report_score",
        JSON.stringify(Math.ceil(translationScoreFetcher.data?.response * 100)),
      );
    }
  }, [translationScoreFetcher.data]);
  useEffect(() => {
    if (unTranslatedFetcher.data && unTranslatedFetcher.data.success) {
      // setLoading(false);
      setUnTranslateWords(unTranslatedFetcher.data?.response);
      setLoadingGather((prev) => ({
        ...prev,
        unTranslated: {
          loading: false,
        },
      }));
    }
  }, [unTranslatedFetcher.data]);

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
        // shopify.toast.show("Web Pixel 激活成功");
        setNavigateToRateState(true);
        // 导航到详情页
        navigate("/app/conversion_rate");
        queryWebPixel(); // 创建后重新查询更新状态
      } else {
        queryWebPixel();
        if (graphqlFetcher.data?.response?.errorCode === 3) {
          setNavigateToRateState(true);
          navigate("/app/conversion_rate");
        }
        // shopify.toast.show("Web Pixel 激活失败");
        checkScopes();
        setNavigateToRateState(false);
      }
    }
  }, [graphqlFetcher.data]);

  // 监听查询结果，更新 configCreateWebPixel
  useEffect(() => {
    if (queryWebPixelFetcher.data) {
      if (queryWebPixelFetcher.data?.success) {
        setConfigPixel(true);
      } else {
        setConfigPixel(false);
      }
    } else {
      setTimeout(() => {
        queryWebPixel();
      }, 1000);
    }
  }, [queryWebPixelFetcher.data]);
  const checkScopes = async () => {
    const { granted } = await shopify.scopes.query();
    const missingScopes = missScopes.filter(
      (s: string) => !granted.includes(s),
    );
    setShowRequireScopeBtn(missingScopes.length === 0);
  };
  useEffect(() => {
    checkScopes();
  }, []);

  return (
    <Card style={{ width: "100%" }}>
      <Flex justify="space-between" style={{ marginBottom: "30px" }}>
        <Title
          level={4}
          style={{ display: "flex", alignItems: "center", margin: 0 }}
        >
          {t("My assets & analytics")}
        </Title>
        {isLoading ? (
          <Skeleton />
        ) : (
          <Text style={{ fontWeight: 500, fontSize: "20px" }}>
            {Schedule[plan.id - 1]}
          </Text>
        )}
      </Flex>

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
            <Text style={{ fontWeight: 500 }}>{t("Translation Score")}</Text>
            {loadingGather.translationScore.loading || isLoading ? (
              <Skeleton.Node style={{ height: 50 }} active />
            ) : (
              <Progress
                type="circle"
                percent={translateScoreData ?? 0}
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
                    <span style={{ fontSize: 12 }}>{t("score")}</span>
                  </div>
                )}
                size={60}
                strokeColor={
                  translateScoreData >= 60
                    ? translateScoreData >= 80
                      ? "#52c41a"
                      : "#faad14"
                    : "#ff4d4f"
                }
              />
            )}
            {loadingGather.translationScore.loading || isLoading ? (
              <Skeleton.Button active />
            ) : (
              <Button
                type="default"
                loading={improveBtnState}
                onClick={handleNavigateDetail}
                style={{ fontWeight: 500 }}
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
              <Text style={{ fontWeight: 500 }}>{t("Untranslated")}</Text>
              <Flex vertical align="center" justify="center" gap="small">
                {loadingGather.unTranslated.loading ? (
                  <Skeleton.Node style={{ width: 50, height: 30 }} active />
                ) : (
                  <Statistic
                    value={unTranslateWords.totalWords}
                    valueStyle={{ fontWeight: 500 }}
                  />
                )}
                <Text>{t("words")}</Text>
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
                  style={{ fontWeight: 500 }}
                >
                  {t("Translate")}
                </Button>
              )}
            </Flex>
          </Flex>
        </Col>

        <Col xs={24} sm={12} md={8}>
          <Flex
            vertical
            align="center"
            justify="space-between"
            gap="small"
            style={{ height: "100%", minWidth: 200 }}
          >
            <Text style={{ fontWeight: 500 }}>{t("CRO analytics")}</Text>

            <Flex vertical align="center" justify="center" gap="small">
              {configCreateWebPixel === null ? (
                // 配置状态未知，Skeleton
                <Skeleton.Input style={{ width: 50 }} active size="small" />
              ) : !configCreateWebPixel ? (
                // 未配置 Pixel
                <div style={{ textAlign: "center" }}>
                  <Text type="secondary">{t("Please authorize before use")}</Text>
                </div>
              ) : conversionRate === null ? (
                // 已配置 Pixel
                loadingGather.conversionRate.loading ? (
                  // 数据请求中
                  <div style={{ textAlign: "center" }}>
                    <Text type="secondary">{t("Loading...")}</Text>
                  </div>
                ) : (
                  // 请求结束但无数据
                  <div style={{ textAlign: "center" }}>
                    <Text type="secondary">{t("No data available")}</Text>
                  </div>
                )
              ) : (
                // 有数据
                <>
                  <Statistic
                    value={`+${conversionRate}%`}
                    valueStyle={{ fontWeight: 500 }}
                  />
                  <Text>{t("Compared to 7 days ago")}</Text>
                </>
              )}
            </Flex>

            {/* 按钮逻辑 */}
            {configCreateWebPixel === null ? (
              // 配置状态未知
              <Skeleton.Button active />
            ) : !configCreateWebPixel ? (
              // 未配置 Pixel
              <Button
                type="primary"
                loading={navigateToRateState}
                onClick={handleConfigScopes}
              >
                {t("Authorization")}
              </Button>
            ) : (
              // 已配置 Pixel
              <Button
                type="default"
                loading={navigateToRateState}
                onClick={handleConfigScopes}
                style={{ fontWeight: 500 }}
              >
                {t("Details")}
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
        okText={t("Confirm")}
        cancelText={t("Cancel")}
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
