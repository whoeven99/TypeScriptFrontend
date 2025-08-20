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
  Flex,
  Switch,
  Table,
  Collapse,
  Modal,
  CollapseProps,
} from "antd";
import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useState } from "react";
import ScrollNotice from "~/components/ScrollNotice";
import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import {
  GetLatestActiveSubscribeId,
  GetUserSubscriptionPlan,
  GetUserWords,
  IsOpenFreePlan,
} from "~/api/JavaServer";
import { authenticate } from "~/shopify.server";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { OptionType } from "~/components/paymentModal";
import { CheckOutlined, QuestionCircleOutlined } from "@ant-design/icons";
import "./style.css";
import { mutationAppSubscriptionCreate } from "~/api/admin";
import { useDispatch, useSelector } from "react-redux";
import { setUserConfig } from "~/store/modules/userConfig";

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
  const { admin } = adminAuthResult;

  const formData = await request.formData();
  const payForPlan = JSON.parse(formData.get("payForPlan") as string);
  const cancelId = JSON.parse(formData.get("cancelId") as string);
  switch (true) {
    case !!payForPlan:
      try {
        const data = await GetUserSubscriptionPlan({
          shop,
          server: process.env.SERVER_URL as string,
        });
        if (data === payForPlan.title) {
          return data;
        } else {
          const returnUrl = new URL(
            `https://admin.shopify.com/store/${shop.split(".")[0]}/apps/${process.env.HANDLE}/app/pricing`,
          );
          const res = await mutationAppSubscriptionCreate({
            shop,
            accessToken: accessToken as string,
            name: payForPlan.title,
            yearly: payForPlan.yearly,
            price: {
              amount: payForPlan.yearly
                ? payForPlan.yearlyPrice
                : payForPlan.monthlyPrice,
              currencyCode: "USD",
            },
            trialDays: payForPlan.trialDays,
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
                amount: payForPlan.yearly
                  ? payForPlan.yearlyPrice
                  : payForPlan.monthlyPrice,
                currencyCode: "USD",
              },
            },
          };
        }
        // }
      } catch (error) {
        console.error("Error payForPlan action:", error);
      }
    case !!cancelId:
      try {
        const response = await admin.graphql(
          `#graphql
          mutation AppSubscriptionCancel($id: ID!, $prorate: Boolean) {
            appSubscriptionCancel(id: $id, prorate: $prorate) {
              userErrors {
                field
                message
              }
              appSubscription {
                id
                status
              }
            }
          }`,
          {
            variables: {
              id: cancelId,
            },
          },
        );

        const data = await response.json();
        console.log(`${shop} AppSubscriptionCancel: `, data);
        return data;
      } catch (error) {
        console.error("Error cancelId action:", error);
      }
  }
  return null;
};

const Index = () => {
  const { shop, server } = useLoaderData<typeof loader>();
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
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
  const [currentCredits, setCurrentCredits] = useState(0);
  const [maxCredits, setMaxCredits] = useState(0);
  const [yearly, setYearly] = useState(true);
  const [selectedOptionKey, setSelectedOption] = useState<string>("option-1");
  const [updateTime, setUpdateTime] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [addCreditsModalOpen, setAddCreditsModalOpen] = useState(false);
  const [cancelPlanWarnModal, setCancelPlanWarnModal] = useState(false);
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
  const planCancelFetcher = useFetcher<any>();
  const payFetcher = useFetcher<any>();
  const orderFetcher = useFetcher<any>();
  const payForPlanFetcher = useFetcher<any>();
  // const freeTrialFetcher = useFetcher<any>();

  useEffect(() => {
    // wordsfetcher.submit({ words: JSON.stringify(true) }, { method: "POST" });
    if (!userConfig.plan || !userConfig.updateTime) {
      // planfetcher.submit(
      //   { planInfo: JSON.stringify(true) },
      //   { method: "POST" },
      // );
      const getPlan = async () => {
        const data = await GetUserSubscriptionPlan({
          shop,
          server: server as string,
        });
        setSelectedPlan(data.userSubscriptionPlan);
        dispatch(setUserConfig({ plan: data.userSubscriptionPlan }));
        if (data.currentPeriodEnd) {
          const date = new Date(data.currentPeriodEnd)
            .toLocaleDateString("zh-CN", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            })
            .replace(/\//g, "-");
          setUpdateTime(date);
          dispatch(setUserConfig({ updateTime: date }));
        }
      };
      getPlan();
      const getWords = async () => {
        const data = await GetUserWords({
          shop,
          server: server as string,
        });
        setCurrentCredits(data.chars);
        setMaxCredits(data.totalChars);
      };
      getWords();
    } else {
      setSelectedPlan(userConfig.plan);
      setUpdateTime(userConfig.updateTime);
    }
    const checkFreeUsed = async () => {
      try {
        const response = await IsOpenFreePlan({
          shop,
          server: server as string,
        });

        setHasOpenFreePlan(response.response || false);
      } catch (error) {
        console.error("Error getPlan:", error);
      }
    };
    checkFreeUsed();
    setIsLoading(false);
  }, []);

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
    if (planCancelFetcher.data) {
      setSelectedPlan(2);
      dispatch(setUserConfig({ plan: "2" }));
      setUpdateTime("");
      dispatch(setUserConfig({ updateTime: "" }));
      setCancelPlanWarnModal(false);
    }
  }, [planCancelFetcher.data]);

  const plans = useMemo(
    () => [
      {
        title: "Basic",
        monthlyPrice: 7.99,
        yearlyPrice: 6.39,
        subtitle: t("pricing.for_small_teams"),
        buttonText:
          selectedPlan === 4
            ? t("pricing.current_plan")
            : t("pricing.get_start"),
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
        monthlyPrice: 19.99,
        yearlyPrice: 15.99,
        subtitle: t("pricing.for_growing"),
        buttonText:
          selectedPlan === 5
            ? t("pricing.current_plan")
            : t("pricing.get_start"),
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
        monthlyPrice: 39.99,
        yearlyPrice: 31.99,
        subtitle: t("pricing.for_large_teams"),
        buttonText:
          selectedPlan === 6
            ? t("pricing.current_plan")
            : t("pricing.get_start"),
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
    ],
    [selectedPlan],
  );

  const tableData = useMemo(
    () => [
      {
        key: 0,
        features: t("Monthly Payment"),
        free: "0",
        basic: "7.99",
        pro: "19.99",
        premium: "39.99",
        type: "text",
      },
      {
        key: 1,
        features: t("Annual payment discount"),
        free: "",
        basic: "20%",
        pro: "20%",
        premium: "20%",
        type: "text",
      },
      {
        key: 2,
        features: t("Monthly payment after discount"),
        free: "",
        basic: "6.39",
        pro: "15.99",
        premium: "31.99",
        type: "text",
      },
      {
        key: 3,
        features: t("Annual payment after discount"),
        free: "",
        basic: "76.68",
        pro: "191.88",
        premium: "383.88",
        type: "text",
      },
      {
        key: 4,
        features: t("Monthly points gift"),
        free: "0",
        basic: t("{{credits}} credits/month", { credits: "1,500,000" }),
        pro: t("{{credits}} credits/month", { credits: "3,000,000" }),
        premium: t("{{credits}} credits/month", { credits: "8,000,000" }),
        type: "text",
      },
      {
        key: 5,
        features: t("Glossary"),
        free: "",
        basic: "10",
        pro: "50",
        premium: "100",
        type: "text",
      },
      {
        key: 6,
        features: t("Points purchase discount"),
        free: "0%",
        basic: "10%",
        pro: "25%",
        premium: "50%",
        type: "text",
      },
      {
        key: 7,
        features: t("Automatic translation updates"),
        free: "",
        basic: t("support"),
        pro: t("support"),
        premium: t("support"),
        type: "text",
      },
      {
        key: 8,
        features: t("Manual Editor"),
        free: t("support"),
        basic: t("support"),
        pro: t("support"),
        premium: t("support"),
        type: "text",
      },
      {
        key: 9,
        features: t("Automatic IP switching"),
        free: "",
        basic: t("support"),
        pro: t("support"),
        premium: t("support"),
        type: "text",
      },
      {
        key: 10,
        features: t("IP call limit"),
        free: "",
        basic: "10,000",
        pro: "25,000",
        premium: "50,000",
        type: "text",
      },
      {
        key: 11,
        features: t("Third-party app translation"),
        free: "",
        basic: t("support"),
        pro: t("support"),
        premium: t("support"),
        type: "text",
      },
      {
        key: 12,
        features: t("Image Translation"),
        free: "",
        basic: t("support"),
        pro: t("support"),
        premium: t("support"),
        type: "text",
      },
      {
        key: 13,
        features: t("Private API support"),
        free: t("support"),
        basic: t("support"),
        pro: t("support"),
        premium: t("support"),
        type: "text",
      },
      {
        key: 14,
        features: t("Private API call limits"),
        free: "30,000",
        basic: "300,000",
        pro: "800,000",
        premium: "3,000,000",
        type: "text",
      },
      {
        key: 15,
        features: t("Manual support"),
        free: "",
        basic: t("support"),
        pro: t("support"),
        premium: t("1v1 support"),
        type: "text",
      },
    ],
    [],
  );

  const collapseData: CollapseProps["items"] = useMemo(
    () => [
      {
        key: 0,
        label: t("How does the 5-day free trial work?"),
        children: t(
          "Choosing Pro or Unlimited gives you 5 days of full access to all features, along with 200,000 trial credits. Cancel anytime before the trial ends to avoid billing.",
        ),
      },
      {
        key: 1,
        label: t("Can I get a discount on my plan?"),
        children: t(
          "Yes. You'll save 20% when you choose yearly billing. Discount applies automatically at checkout.",
        ),
      },
      {
        key: 2,
        label: t("Can I get a refund?"),
        children: t(
          "No. We do not offer refunds. You can cancel anytime to stop future billing, and your plan will remain active until the end of the billing period.",
        ),
      },
      {
        key: 3,
        label: t("What happens when I run out of credits?"),
        children: t(
          "You'll need to purchase extra credits to keep creating content. You won't lose access to features, only to credit-based actions.",
        ),
      },
      {
        key: 4,
        label: t("Do unused credits carry over?"),
        children: t(
          "Plan credits reset at the end of each billing cycle. But if you cancel or downgrade, any unused credits stay active for 3 more months.",
        ),
      },
      {
        key: 5,
        label: t("Do extra credits affect my plan or features?"),
        children: t(
          "No. Plan credits come with your subscription and reset monthly. Extra credits are only used when plan credits run out, and they never expire. They don't unlock new features or raise limits.",
        ),
      },
      {
        key: 6,
        label: t("What happens if I upgrade my plan?"),
        children: t(
          "You get your new plan's credits and features right away. Any remaining credits from your previous plan won't carry over.",
        ),
      },
      {
        key: 7,
        label: t("Will I lose credits if I cancel or downgrade?"),
        children: t(
          "No. Your unused credits stay available for 3 months. But you'll only have access to the features included in your new (lower) plan.",
        ),
      },
      {
        key: 8,
        label: t("How many credits do actions use?"),
        children: t(
          "We calculate usage at 1 credit per word. However, if AI model is used, the consumption of prompt tokens also needs to be included—each request requires approximately an additional 80 credits. If you would like to know the estimated cost of a translation task, please feel free to contact customer support.",
        ),
      },
    ],
    [],
  );

  const columns = [
    {
      title: t("Features"),
      dataIndex: "features",
      key: "features",
    },
    {
      title: "Free",
      dataIndex: "free",
      key: "free",
      render: (_: any, record: any) => {
        switch (true) {
          case record.type === "credits":
            return <Text>{record.free}</Text>;
          case record.type === "boolean":
            return <Text>{record.free ? "√" : "×"}</Text>;
          default:
            return <Text>{record.free}</Text>;
        }
      },
    },
    {
      title: "Basic",
      dataIndex: "basic",
      key: "basic",
      render: (_: any, record: any) => {
        switch (true) {
          case record.type === "credits":
            return <Text>{record.basic}</Text>;
          case record.type === "boolean":
            return <Text>{record.basic ? "√" : "×"}</Text>;
          default:
            return <Text>{record.basic}</Text>;
        }
      },
    },
    {
      title: "Pro",
      dataIndex: "pro",
      key: "pro",
      render: (_: any, record: any) => {
        switch (true) {
          case record.type === "credits":
            return <Text>{record.pro}</Text>;
          case record.type === "boolean":
            return <Text>{record.pro ? "√" : "×"}</Text>;
          default:
            return <Text>{record.pro}</Text>;
        }
      },
    },
    {
      title: "Premium",
      dataIndex: "premium",
      key: "premium",
      render: (_: any, record: any) => {
        switch (true) {
          case record.type === "credits":
            return <Text>{record.premium}</Text>;
          case record.type === "boolean":
            return <Text>{record.premium ? "√" : "×"}</Text>;
          default:
            return <Text>{record.premium}</Text>;
        }
      },
    },
  ];

  const handlePay = () => {
    setBuyButtonLoading(true);
    const selectedOption = creditOptions.find(
      (item) => item.key === selectedOptionKey,
    );

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

  const handleCancelPlan = async () => {
    const data = await GetLatestActiveSubscribeId({
      shop,
      server: server as string,
    });
    console.log("GetLatestActiveSubscribeId: ", data);
    if (data.success) {
      planCancelFetcher.submit(
        {
          cancelId: JSON.stringify(data.response),
        },
        { method: "POST" },
      );
    }
  };

  const handlePayForPlan = ({
    plan,
    trialDays,
  }: {
    plan: any;
    trialDays: number;
  }) => {
    setBuyButtonLoading(true);
    payForPlanFetcher.submit(
      { payForPlan: JSON.stringify({ ...plan, yearly, trialDays }) },
      { method: "POST" },
    );
  };

  // const handleFreeTrial = async () => {
  //   // setFreeTrialButtonLoading(true);
  //   freeTrialFetcher.submit(
  //     { freeTrial: JSON.stringify(true) },
  //     { method: "POST" },
  //   );
  //   // const data = await StartFreePlan({ shop, server: server as string });
  //   // console.log("freeTrial: ", data);
  //   // return data;
  // };

  return (
    <Page>
      <TitleBar title={t("Pricing")} />
      <ScrollNotice
        text={t(
          "Welcome to our app! If you have any questions, feel free to email us at support@ciwi.ai, and we will respond as soon as possible.",
        )}
      />
      <Space direction="vertical" size="large" style={{ display: "flex" }}>
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
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <Title level={4} style={{ marginBottom: 0 }}>
                  {t("Your translation quota")}
                </Title>
                <Popover
                  content={t(
                    "Permanent quotas · Never expire · Top up anytime.",
                  )}
                >
                  <QuestionCircleOutlined />
                </Popover>
                <Button
                  type="primary"
                  onClick={() => setAddCreditsModalOpen(true)}
                >
                  {t("Add credits")}
                </Button>
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
        <Space
          direction="vertical"
          size="small"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Title level={3} style={{ fontWeight: 700 }}>
            {t("Choose the right plan for you")}
          </Title>
          <Flex align="center" justify="space-between">
            <Space align="center" size="small">
              <Switch checked={yearly} onChange={() => setYearly(!yearly)} />
              <Text>{t("Yearly")}</Text>
            </Space>
            <div className="yearly_save">
              <Text strong>{t("Save 20%")}</Text>
            </div>
          </Flex>
          {!hasOpenFreePlan && (
            <Card styles={{ body: { padding: 12 } }}>
              <Flex align="center" justify="space-between" gap={10}>
                <Text>{t("Start your trial and unlock")}</Text>
                <div className="free_trial">
                  <Text strong>
                    {t("{{amount}} free credits", { amount: "200,000" })}
                  </Text>
                </div>
              </Flex>
            </Card>
          )}
        </Space>
        <Row gutter={[16, 16]}>
          <Col
            key={t("Free")}
            xs={24}
            sm={24}
            md={12}
            lg={6}
            style={{
              display: "flex",
              width: "100%",
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
                borderColor:
                  selectedPlan === 1 || selectedPlan === 2
                    ? "#007F61"
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
              <Title level={5}>Free</Title>
              <div style={{ margin: "12px 0" }}>
                <Text style={{ fontSize: "28px", fontWeight: "bold" }}>$0</Text>
                <Text style={{ fontSize: "14px" }}>{t("/month")}</Text>
              </div>
              <Paragraph type="secondary" style={{ fontSize: "13px" }}>
                {t("pricing.for_individuals")}
              </Paragraph>
              <Button
                type="default"
                block
                disabled={selectedPlan === 1 || selectedPlan === 2}
                style={{ marginBottom: hasOpenFreePlan ? "20px" : "70px" }}
                onClick={() => setCancelPlanWarnModal(true)}
                loading={buyButtonLoading}
              >
                {selectedPlan === 1 || selectedPlan === 2
                  ? t("pricing.current_plan")
                  : t("pricing.get_start")}
              </Button>
              <div style={{ flex: 1 }}>
                <div
                  key={0}
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
                  <Text style={{ fontSize: "13px" }}>
                    {t("starter_features1")}
                  </Text>
                </div>
                <div
                  key={1}
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
                  <Text style={{ fontSize: "13px" }}>
                    {t("starter_features2")}
                  </Text>
                </div>
                <div
                  key={2}
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
                  <Text style={{ fontSize: "13px" }}>
                    {t("starter_features3")}
                  </Text>
                </div>
              </div>
            </Card>
          </Col>
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
                      : plan.isRecommended && selectedPlan <= 2 && selectedPlan
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
                      ${yearly ? plan.yearlyPrice : plan.monthlyPrice}
                    </Text>
                    <Text style={{ fontSize: "14px" }}>{t("/month")}</Text>
                  </div>
                  <Paragraph type="secondary" style={{ fontSize: "13px" }}>
                    {plan.subtitle}
                  </Paragraph>
                  <Button
                    type="default"
                    block
                    disabled={plan.disabled}
                    style={{ marginBottom: "20px" }}
                    onClick={() => handlePayForPlan({ plan, trialDays: 0 })}
                    loading={buyButtonLoading}
                  >
                    {plan.buttonText}
                  </Button>
                  {!hasOpenFreePlan && (
                    <Button
                      type="primary"
                      block
                      disabled={plan.disabled}
                      style={{ marginBottom: "20px" }}
                      onClick={() => handlePayForPlan({ plan, trialDays: 5 })}
                      loading={buyButtonLoading}
                    >
                      {t("Free trial")}
                    </Button>
                  )}

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
        <Space
          direction="vertical"
          size="small"
          style={{
            display: "flex",
          }}
        >
          <Title
            level={3}
            style={{
              fontWeight: 700,
              textAlign: "center",
            }}
          >
            {t("Compare plans")}
          </Title>
          <Table
            dataSource={tableData}
            columns={columns}
            pagination={false}
            // style={{
            //   width: "100%",
            // }}
          />
        </Space>
        <Row>
          <Col span={6}>
            <Space direction="vertical" size="small">
              <Title level={3} style={{ fontWeight: 700 }}>
                {t("FAQs")}
              </Title>
              <Text type="secondary">
                {t("Everything you need to know about pricing and billing.")}
              </Text>
            </Space>
          </Col>
          <Col span={18}>
            <Collapse items={collapseData} />
          </Col>
        </Row>
      </Space>
      <Modal
        title={t("Buy Credits")}
        open={addCreditsModalOpen}
        width={900}
        centered
        onCancel={() => setAddCreditsModalOpen(false)}
        footer={null}
      >
        <Space direction="vertical" size="small" style={{ width: "100%" }}>
          <div
            style={{
              textAlign: "left",
              display: "flex",
              alignItems: "flex-end",
              marginBottom: 10,
            }}
          >
            {/* <Title level={4} style={{ marginBottom: 0, marginRight: 10 }}>
              {t("Buy Credits")}
            </Title> */}
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
                      JSON.stringify(selectedOptionKey) ===
                      JSON.stringify(option.key)
                        ? "#007F61"
                        : undefined,
                    borderWidth:
                      JSON.stringify(selectedOptionKey) ===
                      JSON.stringify(option.key)
                        ? "2px"
                        : "1px",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "150px",
                  }}
                  onClick={() => setSelectedOption(option.key)}
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
          <Flex align="center" justify="center">
            <Space direction="vertical" align="center">
              <Text type="secondary" style={{ margin: "16px 0 8px 0" }}>
                {t("Total pay")}: $
                {selectedOptionKey
                  ? creditOptions
                      .find((item) => item.key === selectedOptionKey)
                      ?.price.currentPrice.toFixed(2)
                  : "0.00"}
              </Text>
              <Button
                type="primary"
                size="large"
                disabled={!selectedOptionKey}
                loading={buyButtonLoading}
                onClick={handlePay}
              >
                {t("Buy now")}
              </Button>
            </Space>
          </Flex>
        </Space>
      </Modal>
      <Modal
        title={t("Cancel paid plan?")}
        open={cancelPlanWarnModal}
        centered
        onCancel={() => setCancelPlanWarnModal(false)}
        footer={
          <Flex align="end" justify="end" gap={10}>
            <Button
              loading={planCancelFetcher.state == "submitting"}
              onClick={handleCancelPlan}
            >
              {t("Switch to free plan")}
            </Button>
            <Button
              type="primary"
              onClick={() => setCancelPlanWarnModal(false)}
            >
              {t("Keep paid plan")}
            </Button>
          </Flex>
        }
      >
        <Text>
          {t(
            "Moving to the free plan will turn off key features. Are you sure you want to switch?",
          )}
        </Text>
      </Modal>
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
