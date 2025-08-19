import { TitleBar } from "@shopify/app-bridge-react";
import { Page } from "@shopify/polaris";
import {
  Space,
  Row,
  Col,
  Card,
  Progress,
  Button,
  Typography,
  Alert,
  Skeleton,
  Popover,
  Badge,
  Modal,
} from "antd";
import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useState } from "react";
import ScrollNotice from "~/components/ScrollNotice";
import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import {
  GetUserSubscriptionPlan,
  GetUserWords,
  StartFreePlan,
} from "~/api/JavaServer";
import { authenticate } from "~/shopify.server";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { OptionType } from "~/components/paymentModal";
import { CheckOutlined, QuestionCircleOutlined } from "@ant-design/icons";
import "./style.css";
import { mutationAppSubscriptionCreate } from "~/api/admin";
import { useDispatch, useSelector } from "react-redux";
import { setUserConfig } from "~/store/modules/userConfig";
import axios from "axios";

const { Title, Text, Paragraph } = Typography;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop } = adminAuthResult.session;
  console.log(`${shop} load pricing`);
  return {
    shop,
    server: process.env.SERVER_URL,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;

  const formData = await request.formData();
  const words = JSON.parse(formData.get("words") as string);
  const planInfo = JSON.parse(formData.get("planInfo") as string);
  const payForPlan = JSON.parse(formData.get("payForPlan") as string);
  const freeTrial = JSON.parse(formData.get("freeTrial") as string);
  switch (true) {
    case !!words:
      try {
        const data = await GetUserWords({
          shop,
        });
        return data;
      } catch (error) {
        console.error("Error loading action:", error);
        return null;
      }
    case !!planInfo:
      try {
        const data = await GetUserSubscriptionPlan({
          shop,
        });
        return data;
      } catch (error) {
        console.error("Error planInfo action:", error);
        return "1";
      }
    case !!payForPlan:
      try {
        const data = await GetUserSubscriptionPlan({
          shop,
        });
        if (data === payForPlan.title) {
          return data;
        } else {
          const returnUrl = new URL(
            `https://admin.shopify.com/store/${shop.split(".")[0]}/apps/ciwi-translator/app`,
          );
          const res = await mutationAppSubscriptionCreate({
            shop,
            accessToken: accessToken as string,
            name: payForPlan.title,
            price: {
              amount: payForPlan.price,
              currencyCode: "USD",
            },
            trialDays: 5,
            returnUrl,
            test:
              process.env.NODE_ENV === "development" ||
              process.env.NODE_ENV === "test",
          });
          return {
            ...res,
            appSubscription: {
              ...res.appSubscription,
              price: {
                amount: payForPlan.price,
                currencyCode: "USD",
              },
            },
          };
        }
      } catch (error) {
        console.error("Error payForPlan action:", error);
      }
    case !!freeTrial:
      try {
        const data = await StartFreePlan({ shop });
        console.log("freeTrial: ", data);
        return data;
      } catch (error) {
        console.error("Error freeTrial action:", error);
        return {
          success: false,
          errorCode: 0,
          errorMsg: "Error freeTrial",
          response: null,
        };
      }
  }
  return null;
};

const Index = () => {
  const { shop, server } = useLoaderData<typeof loader>();
  const [currentCredits, setCurrentCredits] = useState(0);
  const [maxCredits, setMaxCredits] = useState(0);
  const [selectedOption, setSelectedOption] = useState<OptionType | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [updateTime, setUpdateTime] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [buyButtonLoading, setBuyButtonLoading] = useState(false);
  // const [freeTrialModalOpen, setFreeTrialModalOpen] = useState(false);
  // const [freeTrialButtonLoading, setFreeTrialButtonLoading] = useState(false);
  // const [creditsCalculatorOpen, setCreditsCalculatorOpen] = useState(false);
  const [hasOpenFreePlan, setHasOpenFreePlan] = useState(true);
  const isQuotaExceeded = useMemo(
    () => currentCredits >= maxCredits && maxCredits > 0,
    [currentCredits, maxCredits],
  );
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const userConfig = useSelector((state: any) => state.userConfig);
  const wordsfetcher = useFetcher<any>();
  const planfetcher = useFetcher<any>();
  const payFetcher = useFetcher<any>();
  const orderFetcher = useFetcher<any>();
  const payForPlanFetcher = useFetcher<any>();
  const freeTrialFetcher = useFetcher<any>();

  useEffect(() => {
    wordsfetcher.submit({ words: JSON.stringify(true) }, { method: "POST" });
    if (!userConfig.plan || !userConfig.updateTime) {
      planfetcher.submit(
        { planInfo: JSON.stringify(true) },
        { method: "POST" },
      );
    } else {
      setSelectedPlan(userConfig.plan);
      setUpdateTime(userConfig.updateTime);
    }
    setIsLoading(false);
    const getPlan = async () => {
      try {
        const response = await axios.post(
          `${server}/userTrials/isOpenFreePlan?shopName=${shop}`,
        );
        setHasOpenFreePlan(response.data.response || false);
      } catch (error) {
        console.error("Error getPlan:", error);
      }
    };
    getPlan();
  }, []);

  useEffect(() => {
    if (wordsfetcher.data) {
      setCurrentCredits(wordsfetcher.data.chars);
      setMaxCredits(wordsfetcher.data.totalChars);
    }
  }, [wordsfetcher.data]);

  useEffect(() => {
    if (planfetcher.data) {
      setSelectedPlan(planfetcher.data.userSubscriptionPlan);
      dispatch(setUserConfig({ plan: planfetcher.data.userSubscriptionPlan }));
      if (planfetcher.data.currentPeriodEnd) {
        const date = new Date(planfetcher.data.currentPeriodEnd)
          .toLocaleDateString("zh-CN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          })
          .replace(/\//g, "-");
        setUpdateTime(date);
        dispatch(setUserConfig({ updateTime: date }));
      }
    }
  }, [planfetcher.data]);

  useEffect(() => {
    if (payFetcher.data || payForPlanFetcher.data) {
      if (
        (payFetcher.data?.data?.data?.appPurchaseOneTimeCreate
          ?.appPurchaseOneTime &&
          payFetcher.data?.data?.data?.appPurchaseOneTimeCreate
            ?.confirmationUrl) ||
        (payForPlanFetcher.data?.appSubscription &&
          payForPlanFetcher.data?.confirmationUrl)
      ) {
        const order =
          payFetcher.data?.data?.data?.appPurchaseOneTimeCreate
            ?.appPurchaseOneTime || payForPlanFetcher.data?.appSubscription;
        const confirmationUrl =
          payFetcher.data?.data?.data?.appPurchaseOneTimeCreate
            ?.confirmationUrl || payForPlanFetcher.data?.confirmationUrl;
        const orderInfo = {
          id: order.id,
          amount: order.price.amount,
          name: order.name,
          createdAt: order.createdAt,
          status: order.status,
          confirmationUrl: confirmationUrl,
        };
        const formData = new FormData();
        formData.append("orderInfo", JSON.stringify(orderInfo));
        orderFetcher.submit(formData, {
          method: "post",
          action: "/app",
        });
        open(confirmationUrl, "_top");
      }
      if (
        payFetcher.data?.data?.data?.appPurchaseOneTimeCreate?.userErrors
          ?.length ||
        payForPlanFetcher.data?.userErrors?.length
      ) {
        setBuyButtonLoading(false);
      }
    }
  }, [payFetcher.data, payForPlanFetcher.data]);

  useEffect(() => {
    if (freeTrialFetcher.data) {
      if (freeTrialFetcher.data.success) {
        // setFreeTrialModalOpen(false);
        // setFreeTrialButtonLoading(false);
        setSelectedPlan(7);
        dispatch(
          setUserConfig({
            plan: "7",
            updateTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
              .toLocaleDateString("zh-CN", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              })
              .replace(/\//g, "-"),
          }),
        );
        setUpdateTime(
          new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
            .toLocaleDateString("zh-CN", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            })
            .replace(/\//g, "-"),
        );
        setHasOpenFreePlan(true);
        shopify.toast.show("Free trial started successfully");
      } else {
        shopify.toast.show("Free trial failed");
        // setFreeTrialButtonLoading(false);
      }
    }
  }, [freeTrialFetcher.data]);

  const creditOptions: OptionType[] = useMemo(
    () => [
      {
        key: "option-1",
        name: "500K",
        Credits: 500000,
        price: {
          currentPrice:
            selectedPlan === 6
              ? 1.99
              : selectedPlan === 5
                ? 2.99
                : selectedPlan === 4
                  ? 3.59
                  : 3.99,
          comparedPrice: 3.99,
          currencyCode: "USD",
        },
      },
      {
        key: "option-2",
        name: "1M",
        Credits: 1000000,
        price: {
          currentPrice:
            selectedPlan === 6
              ? 3.99
              : selectedPlan === 5
                ? 5.99
                : selectedPlan === 4
                  ? 7.19
                  : 7.99,
          comparedPrice: 7.99,
          currencyCode: "USD",
        },
      },
      {
        key: "option-3",
        name: "2M",
        Credits: 2000000,
        price: {
          currentPrice:
            selectedPlan === 6
              ? 7.99
              : selectedPlan === 5
                ? 11.99
                : selectedPlan === 4
                  ? 14.39
                  : 15.99,
          comparedPrice: 15.99,
          currencyCode: "USD",
        },
      },
      {
        key: "option-4",
        name: "3M",
        Credits: 3000000,
        price: {
          currentPrice:
            selectedPlan === 6
              ? 11.99
              : selectedPlan === 5
                ? 17.99
                : selectedPlan === 4
                  ? 21.79
                  : 23.99,
          comparedPrice: 23.99,
          currencyCode: "USD",
        },
      },
      {
        key: "option-5",
        name: "5M",
        Credits: 5000000,
        price: {
          currentPrice:
            selectedPlan === 6
              ? 19.99
              : selectedPlan === 5
                ? 29.99
                : selectedPlan === 4
                  ? 35.99
                  : 39.99,
          comparedPrice: 39.99,
          currencyCode: "USD",
        },
      },
      {
        key: "option-6",
        name: "10M",
        Credits: 10000000,
        price: {
          currentPrice:
            selectedPlan === 6
              ? 39.99
              : selectedPlan === 5
                ? 59.99
                : selectedPlan === 4
                  ? 71.99
                  : 79.99,
          comparedPrice: 79.99,
          currencyCode: "USD",
        },
      },
      {
        key: "option-7",
        name: "20M",
        Credits: 20000000,
        price: {
          currentPrice:
            selectedPlan === 6
              ? 79.99
              : selectedPlan === 5
                ? 119.99
                : selectedPlan === 4
                  ? 143.99
                  : 159.99,
          comparedPrice: 159.99,
          currencyCode: "USD",
        },
      },
      {
        key: "option-8",
        name: "30M",
        Credits: 30000000,
        price: {
          currentPrice:
            selectedPlan === 6
              ? 119.99
              : selectedPlan === 5
                ? 179.99
                : selectedPlan === 4
                  ? 215.99
                  : 239.99,
          comparedPrice: 239.99,
          currencyCode: "USD",
        },
      },
    ],
    [selectedPlan],
  );

  const plans = [
    {
      title: "Starter",
      price: "1.99",
      subtitle: t("pricing.for_individuals"),
      buttonText:
        selectedPlan === 3 ? t("pricing.current_plan") : t("pricing.get_start"),
      buttonType: "default",
      disabled: selectedPlan === 3,
      features: [
        t("starter_features1"),
        t("starter_features2"),
        t("starter_features3"),
      ],
    },
    {
      title: "Basic",
      price: "7.99",
      subtitle: t("pricing.for_small_teams"),
      buttonText:
        selectedPlan === 4 ? t("pricing.current_plan") : t("pricing.get_start"),
      buttonType: "default",
      disabled: selectedPlan === 4,
      features: [
        t("{{credits}} credits/month", { credits: "1,500,000" }),
        t("Glossary ({{count}} entries)", { count: 10 }),
        t("basic_features1"),
        t("basic_features2"),
        t("basic_features3"),
        t("basic_features4"),
        t("basic_features5"),
        t("basic_features6"),
        t("basic_features7"),
        t("basic_features8"),
        t("basic_features9"),
      ],
    },
    {
      title: "Pro",
      price: "19.99",
      subtitle: t("pricing.for_growing"),
      buttonText:
        selectedPlan === 5 ? t("pricing.current_plan") : t("pricing.get_start"),
      buttonType: "default",
      disabled: selectedPlan === 5,
      features: [
        t("all in Basic Plan"),
        t("{{credits}} credits/month", { credits: "3,000,000" }),
        t("Glossary ({{count}} entries)", { count: 50 }),
        t("pro_features1"),
        t("pro_features2"),
        t("pro_features3"),
        t("pro_features4"),
        t("pro_features5"),
        t("pro_features6"),
        t("pro_features7"),
        t("pro_features8"),
      ],
    },
    {
      title: "Premium",
      price: "39.99",
      subtitle: t("pricing.for_large_teams"),
      buttonText:
        selectedPlan === 6 ? t("pricing.current_plan") : t("pricing.get_start"),
      disabled: selectedPlan === 6,
      isRecommended: true,
      features: [
        t("all in Pro Plan"),
        t("{{credits}} credits/month", { credits: "8,000,000" }),
        t("Glossary ({{count}} entries)", { count: 100 }),
        t("premium_features1"),
        t("premium_features2"),
        t("premium_features3"),
        t("premium_features4"),
        t("premium_features5"),
        t("premium_features6"),
        t("premium_features7"),
        t("premium_features8"),
        t("premium_features9"),
      ],
    },
  ];

  // const modelOptions = [
  //   {
  //     label: "OpenAI/GPT-4",
  //     value: "1",
  //   },
  //   {
  //     label: "Google/Gemini-1.5",
  //     value: "2",
  //   },
  //   {
  //     label: "DeepL/DeepL-translator",
  //     value: "3",
  //   },
  //   {
  //     label: "Qwen/Qwen-Max",
  //     value: "4",
  //   },
  //   {
  //     label: "DeepSeek-ai/DeepSeek-V3",
  //     value: "5",
  //   },
  //   {
  //     label: "Meta/Llama-3",
  //     value: "6",
  //   },
  //   {
  //     label: "Google/Google translate",
  //     value: "7",
  //   },
  // ];

  // const translateItemOptions = [
  //   {
  //     label: t("Products"),
  //     value: "products",
  //   },
  //   {
  //     label: t("Collections"),
  //     value: "collection",
  //   },
  //   {
  //     label: t("Articles"),
  //     value: "article",
  //   },
  //   {
  //     label: t("Blog titles"),
  //     value: "blog_titles",
  //   },
  //   {
  //     label: t("Pages"),
  //     value: "pages",
  //   },
  //   {
  //     label: t("Filters"),
  //     value: "filters",
  //   },
  //   {
  //     label: t("Metaobjects"),
  //     value: "metaobjects",
  //   },
  //   {
  //     label: t("Store metadata"),
  //     value: "metadata",
  //   },
  //   {
  //     label: t("Email"),
  //     value: "notifications",
  //   },
  //   {
  //     label: t("Navigation"),
  //     value: "navigation",
  //   },
  //   {
  //     label: t("Shop"),
  //     value: "shop",
  //   },
  //   {
  //     label: t("Theme"),
  //     value: "theme",
  //   },
  //   {
  //     label: t("Delivery"),
  //     value: "delivery",
  //   },
  //   {
  //     label: t("Shipping"),
  //     value: "shipping",
  //   },
  // ];

  const handlePay = () => {
    setBuyButtonLoading(true);
    const payInfo = {
      name: selectedOption?.name,
      price: {
        amount: selectedOption?.price.currentPrice,
        currencyCode: selectedOption?.price.currencyCode,
      },
    };
    const formData = new FormData();
    formData.append("payInfo", JSON.stringify(payInfo));
    payFetcher.submit(formData, {
      method: "post",
      action: "/app",
    });
  };

  const handlePayForPlan = (plan: any) => {
    setBuyButtonLoading(true);
    payForPlanFetcher.submit(
      { payForPlan: JSON.stringify(plan) },
      { method: "POST" },
    );
  };

  const handleFreeTrial = async () => {
    // setFreeTrialButtonLoading(true);
    freeTrialFetcher.submit(
      { freeTrial: JSON.stringify(true) },
      { method: "POST" },
    );
    // const data = await StartFreePlan({ shop, server: server as string });
    // console.log("freeTrial: ", data);
    // return data;
  };

  return (
    <Page>
      <TitleBar title={t("Pricing")} />
      <ScrollNotice
        text={t(
          "Welcome to our app! If you have any questions, feel free to email us at support@ciwi.ai, and we will respond as soon as possible.",
        )}
      />
      <Space direction="vertical" size="middle" style={{ display: "flex" }}>
        {/* 积分余额显示 */}
        <Card loading={isLoading}>
          <Space direction="vertical" size="small" style={{ width: "100%" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline" }}>
                <Title level={4} style={{ marginRight: 10, marginBottom: 0 }}>
                  {t("Your translation quota")}
                </Title>
                <Popover
                  content={t(
                    "Permanent quotas · Never expire · Top up anytime.",
                  )}
                >
                  <QuestionCircleOutlined />
                </Popover>
              </div>
              {selectedPlan && (
                <div>
                  <Text>{t("Current plan: ")}</Text>
                  <Text style={{ color: "#007F61", fontWeight: "bold" }}>
                    {selectedPlan === 3
                      ? "Starter"
                      : selectedPlan === 4
                        ? "Basic"
                        : selectedPlan === 5
                          ? "Pro"
                          : selectedPlan === 6
                            ? "Premium"
                            : selectedPlan === 7
                              ? "Free Trial"
                              : "Free"}{" "}
                    {t("plan")}
                  </Text>
                </div>
              )}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              {maxCredits ? (
                <div
                  dangerouslySetInnerHTML={{
                    __html: t(
                      "{{currentCredits}} has been used, total credits: {{maxCredits}}.",
                      {
                        currentCredits: currentCredits.toLocaleString(),
                        maxCredits: maxCredits.toLocaleString(),
                      },
                    ),
                  }}
                />
              ) : (
                <Skeleton active paragraph={{ rows: 1 }} title={false} />
              )}
              {updateTime && maxCredits && (
                <Text>
                  {t("This bill was issued on {{date}}", { date: updateTime })}
                </Text>
              )}
            </div>
            <Progress
              percent={Math.round((currentCredits / maxCredits) * 100)}
              size={["100%", 15]}
              strokeColor="#007F61"
              showInfo={false}
            />
          </Space>
        </Card>
        {isQuotaExceeded && (
          <Alert
            message={t("The quota has been used up")}
            description={t("Buy extra credits now to continue using")}
            type="warning"
            showIcon
          />
        )}
        {!hasOpenFreePlan && (
          <Card styles={{ body: { padding: "12px" } }}>
            <Space
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text>
                {t(
                  "Congratulations! You’ve received a 5-day free trial with full access to all features",
                )}
              </Text>
              <Button
                type="primary"
                onClick={handleFreeTrial}
                loading={freeTrialFetcher.state === "submitting"}
              >
                {t("Free trial")}
              </Button>
            </Space>
          </Card>
        )}
        <Card
          style={{ textAlign: "center" }}
          loading={isLoading || selectedPlan === null}
        >
          {/* 价格选项 */}
          <Space direction="vertical" size="small" style={{ width: "100%" }}>
            <div
              style={{
                textAlign: "left",
                display: "flex",
                alignItems: "flex-end",
                marginBottom: 10,
              }}
            >
              <Title level={4} style={{ marginBottom: 0, marginRight: 10 }}>
                {t("Buy Credits")}
              </Title>
              <Text style={{ fontWeight: "bold" }}>
                {selectedPlan === 6
                  ? t("discountText.premium")
                  : selectedPlan === 5
                    ? t("discountText.pro")
                    : selectedPlan === 4
                      ? t("discountText.basic")
                      : t("discountText.free")}
              </Text>
            </div>
            <Row gutter={[16, 16]}>
              {creditOptions.map((option) => (
                <Col key={option.key} xs={12} sm={12} md={6} lg={6} xl={6}>
                  <Card
                    hoverable
                    style={{
                      textAlign: "center",
                      borderColor:
                        JSON.stringify(selectedOption) ===
                        JSON.stringify(option)
                          ? "#007F61"
                          : undefined,
                      borderWidth:
                        JSON.stringify(selectedOption) ===
                        JSON.stringify(option)
                          ? "2px"
                          : "1px",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "center",
                      height: "150px",
                    }}
                    onClick={() => setSelectedOption(option)}
                  >
                    <Text
                      style={{
                        fontSize: "16px",
                        fontWeight: 500,
                        display: "block",
                        marginBottom: "8px",
                      }}
                    >
                      {option.Credits.toLocaleString()} {t("Credits")}
                    </Text>
                    {selectedPlan === 6 ||
                    selectedPlan === 5 ||
                    selectedPlan === 4 ? (
                      <>
                        <Title
                          level={3}
                          style={{
                            margin: 0,
                            color: "#007F61",
                            fontWeight: 700,
                          }}
                        >
                          ${option.price.currentPrice.toFixed(2)}
                        </Title>
                        <Text
                          delete
                          type="secondary"
                          style={{ fontSize: "14px" }}
                        >
                          ${option.price.comparedPrice.toFixed(2)}
                        </Text>
                      </>
                    ) : (
                      <Title
                        level={3}
                        style={{ margin: 0, color: "#007F61", fontWeight: 700 }}
                      >
                        ${option.price.currentPrice.toFixed(2)}
                      </Title>
                    )}
                  </Card>
                </Col>
              ))}
            </Row>
            {/* 购买区域 */}
            <Text type="secondary" style={{ margin: "16px 0 8px 0" }}>
              {t("Total pay")}: $
              {selectedOption
                ? selectedOption.price.currentPrice.toFixed(2)
                : "0.00"}
            </Text>
            {/* <Space>
              <Button
                size="large"
                onClick={() => setCreditsCalculatorOpen(true)}
              >
                {t("Credits Calculator")}
              </Button> */}
            <Button
              type="primary"
              size="large"
              disabled={!selectedOption}
              loading={buyButtonLoading}
              onClick={handlePay}
            >
              {t("Buy now")}
            </Button>
            {/* </Space> */}
          </Space>
        </Card>
        <div style={{ maxWidth: "1500px", margin: "0 auto" }}>
          <Row gutter={[16, 16]}>
            {plans.map((plan, index) => (
              <Col
                key={plan.title}
                xs={24}
                sm={24}
                md={12}
                lg={6}
                style={{
                  display: "flex",
                  width: "100%",
                }}
              >
                <Badge.Ribbon
                  text={t("pricing.recommended")}
                  color="#1890ff"
                  style={{
                    display:
                      plan.isRecommended && selectedPlan <= 2 && selectedPlan
                        ? "block"
                        : "none",
                    right: -8,
                  }}
                >
                  <Card
                    hoverable
                    style={{
                      flex: 1,
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      position: "relative",
                      borderColor: plan.disabled
                        ? "#007F61"
                        : plan.isRecommended &&
                            selectedPlan <= 2 &&
                            selectedPlan
                          ? "#1890ff"
                          : undefined,
                      minWidth: "220px",
                    }}
                    styles={{
                      body: {
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        padding: "16px",
                      },
                    }}
                    loading={!selectedPlan}
                  >
                    <Title level={5}>{plan.title}</Title>
                    <div style={{ margin: "12px 0" }}>
                      <Text style={{ fontSize: "28px", fontWeight: "bold" }}>
                        ${plan.price}
                      </Text>
                      <Text style={{ fontSize: "14px" }}>{t("/month")}</Text>
                    </div>
                    <Paragraph type="secondary" style={{ fontSize: "13px" }}>
                      {plan.subtitle}
                    </Paragraph>

                    <Button
                      type={
                        plan.isRecommended && selectedPlan <= 2 && selectedPlan
                          ? "primary"
                          : "default"
                      }
                      block
                      disabled={plan.disabled}
                      style={{ marginBottom: "20px" }}
                      onClick={() => handlePayForPlan(plan)}
                      loading={buyButtonLoading}
                    >
                      {plan.buttonText}
                    </Button>

                    {/* {
                      plan.title === "Premium" && !hasOpenFreePlan && (
                        <Button
                          type="primary"
                          block
                          style={{ marginBottom: "20px" }}
                          onClick={() => setFreeTrialModalOpen(true)}
                          disabled={buyButtonLoading}
                        >
                          {t("Free trial")}
                        </Button>
                      )
                    } */}

                    <div style={{ flex: 1 }}>
                      {plan.features.map((feature, idx) => (
                        <div
                          key={idx}
                          style={{
                            marginBottom: "8px",
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "6px",
                          }}
                        >
                          <CheckOutlined
                            style={{
                              color: "#52c41a",
                              fontSize: "12px",
                            }}
                          />
                          <Text style={{ fontSize: "13px" }}>{feature}</Text>
                        </div>
                      ))}
                    </div>
                  </Card>
                </Badge.Ribbon>
              </Col>
            ))}
          </Row>
        </div>
      </Space>
      {/* <Modal
        title={t("Try Premium Plan")}
        open={freeTrialModalOpen}
        style={{ top: "40%" }}
        footer={
          <Space>
            <Button onClick={() => setFreeTrialModalOpen(false)}>
              {t("Cancel")}
            </Button>
            <Button type="primary" loading={freeTrialButtonLoading} onClick={handleFreeTrial}>
              {t("Confirm")}
            </Button>
          </Space>
        }
      >
        <Text>
          {t("Click to Confirm and try all the features of Premium Plan for free for 5 days except credit discount, which will be automatically locked after 5 days")}
        </Text>
      </Modal> */}
      {/* <Modal open={creditsCalculatorOpen} onCancel={() => setCreditsCalculatorOpen(false)}>
        <Title level={4}>{t("Credits Calculator")}</Title>
        <Form>
          <Form.Item label={t("Target Language")} name="targetLanguage">
            <Select>
              {modelOptions.map((option) => (
                <Select.Option key={option.value} value={option.value}>{option.label}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label={t("Translate Model")} name="model">
            <Select>
              {modelOptions.map((option) => (
                <Select.Option key={option.value} value={option.value}>{option.label}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label={t("Translate Items")} name="translateItem">
            <Checkbox.Group>
              {translateItemOptions.map((option) => (
                <Checkbox key={option.value} value={option.value}>{option.label}</Checkbox>
              ))}
            </Checkbox.Group>
          </Form.Item>
        </Form>
      </Modal> */}
    </Page>
  );
};

export default Index;
