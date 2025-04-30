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
} from "antd";
import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useState } from "react";
import ScrollNotice from "~/components/ScrollNotice";
import { ActionFunctionArgs } from "@remix-run/node";
import { GetUserSubscriptionPlan, GetUserWords } from "~/api/serve";
import { SessionService } from "~/utils/session.server";
import { authenticate } from "~/shopify.server";
import { useFetcher } from "@remix-run/react";
import { OptionType } from "~/components/paymentModal";
import { CheckOutlined, QuestionCircleOutlined } from "@ant-design/icons";
import "./style.css";
import { mutationAppSubscriptionCreate } from "~/api/admin";

const { Title, Text, Paragraph } = Typography;

export const action = async ({ request }: ActionFunctionArgs) => {
  const sessionService = await SessionService.init(request);
  let shopSession = sessionService.getShopSession();
  if (!shopSession) {
    const adminAuthResult = await authenticate.admin(request);
    const { shop, accessToken } = adminAuthResult.session;
    shopSession = {
      shop: shop,
      accessToken: accessToken as string,
    };
    sessionService.setShopSession(shopSession);
  }
  const { shop, accessToken } = shopSession;
  try {
    const formData = await request.formData();
    const words = JSON.parse(formData.get("words") as string);
    const planInfo = JSON.parse(formData.get("planInfo") as string);
    const payForPlan = JSON.parse(formData.get("payForPlan") as string);
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
              accessToken,
              name: payForPlan.title,
              price: {
                amount: payForPlan.price,
                currencyCode: "USD",
              },
              trialDays: 0,
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
          console.error("Error planInfo action:", error);
        }
    }
    return null;
  } catch (error) {
    console.error("Error pricing action:", error);
  }
};

const Index = () => {
  const [currentCredits, setCurrentCredits] = useState(0);
  const [maxCredits, setMaxCredits] = useState(0);
  const [selectedOption, setSelectedOption] = useState<OptionType | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [updateTime, setUpdateTime] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [buyButtonLoading, setBuyButtonLoading] = useState(false);
  const isQuotaExceeded = useMemo(
    () => currentCredits >= maxCredits && maxCredits > 0,
    [currentCredits, maxCredits],
  );
  const { t } = useTranslation();
  const wordsfetcher = useFetcher<any>();
  const planfetcher = useFetcher<any>();
  const payFetcher = useFetcher<any>();
  const orderFetcher = useFetcher<any>();
  const payForPlanFetcher = useFetcher<any>();

  useEffect(() => {
    setIsLoading(false);
    wordsfetcher.submit({ words: JSON.stringify(true) }, { method: "POST" });
    planfetcher.submit({ planInfo: JSON.stringify(true) }, { method: "POST" });
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
      if (planfetcher.data.currentPeriodEnd) {
        const date = new Date(planfetcher.data.currentPeriodEnd).toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).replace(/\//g, '-');
        setUpdateTime(date);
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

  const creditOptions: OptionType[] = [
    {
      key: "option-1",
      name: "500K",
      Credits: 500000,
      price: {
        currentPrice: 1.99,
        comparedPrice: 3.99,
        currencyCode: "USD",
      },
    },
    {
      key: "option-2",
      name: "1M",
      Credits: 1000000,
      price: {
        currentPrice: 3.99,
        comparedPrice: 7.99,
        currencyCode: "USD",
      },
    },
    {
      key: "option-3",
      name: "2M",
      Credits: 2000000,
      price: {
        currentPrice: 7.99,
        comparedPrice: 15.99,
        currencyCode: "USD",
      },
    },
    {
      key: "option-4",
      name: "3M",
      Credits: 3000000,
      price: {
        currentPrice: 11.99,
        comparedPrice: 23.99,
        currencyCode: "USD",
      },
    },
    {
      key: "option-5",
      name: "5M",
      Credits: 5000000,
      price: {
        currentPrice: 19.99,
        comparedPrice: 39.99,
        currencyCode: "USD",
      },
    },
    {
      key: "option-6",
      name: "10M",
      Credits: 10000000,
      price: {
        currentPrice: 39.99,
        comparedPrice: 79.99,
        currencyCode: "USD",
      },
    },
    {
      key: "option-7",
      name: "20M",
      Credits: 20000000,
      price: {
        currentPrice: 79.99,
        comparedPrice: 159.99,
        currencyCode: "USD",
      },
    },
    {
      key: "option-8",
      name: "30M",
      Credits: 30000000,
      price: {
        currentPrice: 119.99,
        comparedPrice: 239.99,
        currencyCode: "USD",
      },
    },
  ];

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
        t("{{credits}} credits/month", { credits: "500,000" }),
        t(
          "Use private AI model interface translation (support Google Translate)",
        ),
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
        t("Automatic translation"),
        t(
          "Supports translation of metafields, liquid, HTML/URL, checkout, etc",
        ),
        t(
          "Support translation SEO: meta information and image alt translation",
        ),
        t("Support translation of judge.me and other comment content"),
        t("Unlimited language translation and currency addition"),
        t("Manual editing of translations possible"),
        t("Language/currency switcher (switch by IP)"),
        t("Translation quality assurance: support free manual repair"),
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
        t("Support translation of page builders such as pagefly"),
        t("Manual review by translation experts"),
      ],
    },
  ];

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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "baseline" }}>
                <Title level={4} style={{ marginRight: 10, marginBottom: 0 }}>
                  {t("Your translation quota")}
                </Title>
                <Popover
                  content={t("Permanent quotas · Never expire · Top up anytime.")}
                >
                  <QuestionCircleOutlined />
                </Popover>
              </div>
              {selectedPlan && <Text>
                {t("Current plan: ")}{selectedPlan === 3 ? "Starter" : selectedPlan === 4 ? "Basic" : selectedPlan === 5 ? "Pro" : selectedPlan === 6 ? "Premium" : "Free"} {t("plan")}
              </Text>}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              {maxCredits ? (
                <div
                  dangerouslySetInnerHTML={{
                    __html: t(
                      "{{currentCredits}} has been used, {{maxCredits}} available.",
                      {
                        currentCredits: currentCredits.toLocaleString(),
                        maxCredits: maxCredits.toLocaleString(),
                      },
                    ),
                  }}
                />
              ) : (
                <Skeleton
                  active
                  paragraph={{ rows: 1, style: { margin: 1 } }}
                  title={false}
                />
              )}
              {updateTime && <Text>
                {t("This bill was issued on {{date}}", { date: updateTime })}
              </Text>}
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
        <Card style={{ textAlign: "center" }} loading={isLoading}>
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
              <Title level={3} style={{ marginBottom: 0, marginRight: 10 }}>
                {t("Buy Credits")}
              </Title>
              <Text style={{ color: "red", fontWeight: "bold" }}>
                {t("Limited-time {{percent}}% off", { percent: 50 })}
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
                    <Title
                      level={3}
                      style={{ margin: 0, color: "#007F61", fontWeight: 700 }}
                    >
                      ${option.price.currentPrice.toFixed(2)}
                    </Title>
                    <Text delete type="secondary" style={{ fontSize: "14px" }}>
                      ${option.price.comparedPrice.toFixed(2)}
                    </Text>
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
            <Button
              type="primary"
              size="large"
              disabled={!selectedOption}
              loading={buyButtonLoading}
              onClick={handlePay}
            >
              {t("Buy now")}
            </Button>
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
                      <Text style={{ fontSize: "14px" }}>/月</Text>
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
                      size="middle"
                      block
                      disabled={plan.disabled}
                      style={{ marginBottom: "20px" }}
                      onClick={() => handlePayForPlan(plan)}
                      loading={buyButtonLoading}
                    >
                      {plan.buttonText}
                    </Button>

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
    </Page>
  );
};

export default Index;
