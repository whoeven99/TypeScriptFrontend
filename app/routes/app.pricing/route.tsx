import { TitleBar } from "@shopify/app-bridge-react";
import { Page } from "@shopify/polaris";
import {
  Space,
  Row,
  Col,
  Card,
  Button,
  Typography,
  Alert,
  Skeleton,
  Flex,
  Switch,
  Table,
  Collapse,
  Modal,
  CollapseProps,
} from "antd";
import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useState } from "react";
import { ActionFunctionArgs } from "@remix-run/node";
import {
  GetLatestActiveSubscribeId,
  InsertOrUpdateOrder,
  QueryUserIpCount,
} from "~/api/JavaServer";
import { authenticate } from "~/shopify.server";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { OptionType } from "~/components/paymentModal";
import { CheckOutlined } from "@ant-design/icons";
import "./style.css";
import {
  mutationAppPurchaseOneTimeCreate,
  mutationAppSubscriptionCreate,
} from "~/api/admin";
import { useDispatch, useSelector } from "react-redux";
import { handleContactSupport } from "../app._index/route";
import {
  setIpBalance,
  setPlan,
  setUpdateTime,
} from "~/store/modules/userConfig";
import useReport from "scripts/eventReport";
import HasPayForFreePlanModal from "./components/hasPayForFreePlanModal";
import { globalStore } from "~/globalStore";
import AcountInfoCard from "./components/acountInfoCard";
import AppPageHeader from "~/ui/components/AppPageHeader";
import AppSectionCard from "~/ui/components/AppSectionCard";
import AppStatusBadge from "~/ui/components/AppStatusBadge";

const { Title, Text } = Typography;

//计划名与其对应价格Map
const priceTable: Record<
  string,
  { base: number; Premium: number; Pro: number; Basic: number }
> = {
  "500K": { base: 3.99, Premium: 1.99, Pro: 2.99, Basic: 3.59 },
  "1M": { base: 7.99, Premium: 3.99, Pro: 5.99, Basic: 7.19 },
  "2M": { base: 15.99, Premium: 7.99, Pro: 11.99, Basic: 14.39 },
  "3M": { base: 23.99, Premium: 11.99, Pro: 17.99, Basic: 21.79 },
  "5M": { base: 39.99, Premium: 19.99, Pro: 29.99, Basic: 35.99 },
  "10M": { base: 79.99, Premium: 39.99, Pro: 59.99, Basic: 71.99 },
  "20M": { base: 159.99, Premium: 79.99, Pro: 119.99, Basic: 143.99 },
  "30M": { base: 239.99, Premium: 119.99, Pro: 179.99, Basic: 215.99 },
};

export const loader = async () => {
  return {
    server: process.env.SERVER_URL,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  const { admin } = adminAuthResult;

  const formData = await request.formData();
  const payInfo = JSON.parse(formData.get("payInfo") as string);
  const payForPlan = JSON.parse(formData.get("payForPlan") as string);
  const cancelId = JSON.parse(formData.get("cancelId") as string);
  switch (true) {
    case !!payInfo:
      try {
        const returnUrl = new URL(
          `https://admin.shopify.com/store/${shop.split(".")[0]}/apps/${process.env.HANDLE}/app/pricing`,
        );
        const res = await mutationAppPurchaseOneTimeCreate({
          shop,
          accessToken: accessToken as string,
          name: payInfo.name,
          price: payInfo.price,
          returnUrl,
          test:
            process.env.NODE_ENV === "development" ||
            process.env.NODE_ENV === "test",
        });

        if (res) {
          const order = res?.data?.appPurchaseOneTimeCreate?.appPurchaseOneTime;
          const confirmationUrl =
            res?.data?.appPurchaseOneTimeCreate?.confirmationUrl;

          const orderData = await InsertOrUpdateOrder({
            shop,
            id: order?.id,
            amount: order?.price?.amount,
            name: order?.name,
            createdAt: order?.createdAt,
            status: order?.status,
            confirmationUrl: confirmationUrl,
          });

          return {
            ...orderData,
            response: {
              confirmationUrl,
            },
          };
        }

        return {
          success: false,
          errorCode: 10001,
          errorMsg: "SERVER_ERROR",
          response: null,
        };
      } catch (error) {
        console.error("Error payInfo pricing action: ", error);
        return {
          success: false,
          errorCode: 10001,
          errorMsg: "SERVER_ERROR",
          response: null,
        };
      }

    case !!payForPlan:
      try {
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
              ? payForPlan.yearlyPrice * 12
              : payForPlan.monthlyPrice,
            currencyCode: "USD",
          },
          trialDays: payForPlan.trialDays,
          returnUrl,
          test:
            process.env.NODE_ENV === "development" ||
            process.env.NODE_ENV === "test",
        });

        if (res) {
          const order = res?.data?.appSubscriptionCreate?.appSubscription;
          const confirmationUrl =
            res?.data?.appSubscriptionCreate?.confirmationUrl;

          const orderData = await InsertOrUpdateOrder({
            shop,
            id: order?.id,
            amount: payForPlan.yearly
              ? payForPlan.yearlyPrice
              : payForPlan.monthlyPrice,
            name: order?.name,
            createdAt: order?.createdAt,
            status: order?.status,
            confirmationUrl: confirmationUrl,
          });

          return {
            ...orderData,
            response: {
              confirmationUrl,
            },
          };
        }

        return {
          success: false,
          errorCode: 10001,
          errorMsg: "SERVER_ERROR",
          response: null,
        };
      } catch (error) {
        console.error("Error payForPlan pricing action:", error);
        return {
          success: false,
          errorCode: 10001,
          errorMsg: "SERVER_ERROR",
          response: null,
        };
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
        console.log(`应用日志: ${shop} 取消计划: `, data);
        return data;
      } catch (error) {
        console.error("Error cancelId action:", error);
        return null;
      }
  }
  return null;
};

const Index = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const { plan, updateTime, chars, totalChars, isNew } = useSelector(
    (state: any) => state.userConfig,
  );

  const { reportClick, report } = useReport();

  const { server } = useLoaderData<typeof loader>();

  //价格选项数组
  const creditOptions: OptionType[] = useMemo(
    () => [
      {
        key: "option-1",
        name: "500K",
        Credits: 500000,
        price: eNumPlanType({
          planType: plan?.type,
          optionName: "500K",
          isInTrial: plan?.isInFreePlanTime,
        }),
      },
      {
        key: "option-2",
        name: "1M",
        Credits: 1000000,
        price: eNumPlanType({
          planType: plan?.type,
          optionName: "1M",
          isInTrial: plan?.isInFreePlanTime,
        }),
      },
      {
        key: "option-3",
        name: "2M",
        Credits: 2000000,
        price: eNumPlanType({
          planType: plan?.type,
          optionName: "2M",
          isInTrial: plan?.isInFreePlanTime,
        }),
      },
      {
        key: "option-4",
        name: "3M",
        Credits: 3000000,
        price: eNumPlanType({
          planType: plan?.type,
          optionName: "3M",
          isInTrial: plan?.isInFreePlanTime,
        }),
      },
      {
        key: "option-5",
        name: "5M",
        Credits: 5000000,
        price: eNumPlanType({
          planType: plan?.type,
          optionName: "5M",
          isInTrial: plan?.isInFreePlanTime,
        }),
      },
      {
        key: "option-6",
        name: "10M",
        Credits: 10000000,
        price: eNumPlanType({
          planType: plan?.type,
          optionName: "10M",
          isInTrial: plan?.isInFreePlanTime,
        }),
      },
      {
        key: "option-7",
        name: "20M",
        Credits: 20000000,
        price: eNumPlanType({
          planType: plan?.type,
          optionName: "20M",
          isInTrial: plan?.isInFreePlanTime,
        }),
      },
      {
        key: "option-8",
        name: "30M",
        Credits: 30000000,
        price: eNumPlanType({
          planType: plan?.type,
          optionName: "30M",
          isInTrial: plan?.isInFreePlanTime,
        }),
      },
    ],
    [plan],
  );

  //当前选择价格
  const [selectedOptionKey, setSelectedOption] = useState<string>("option-1");

  //是否为年费计划
  const [yearly, setYearly] = useState(false);

  //各种加载状态
  const [isLoading, setIsLoading] = useState(true);
  const [buyButtonLoading, setBuyButtonLoading] = useState<boolean>(false);
  const [payForPlanButtonLoading, setPayForPlanButtonLoading] =
    useState<string>("");

  //各个表单开启状态
  const [addCreditsModalOpen, setAddCreditsModalOpen] = useState(false);
  const [cancelPlanWarnModal, setCancelPlanWarnModal] = useState(false);

  const [selectedPayPlanOption, setSelectedPayPlanOption] = useState<any>();

  const isQuotaExceeded = useMemo(
    () => chars >= totalChars && totalChars > 0,
    [chars, totalChars],
  );

  const fetcher = useFetcher<any>();
  const planCancelFetcher = useFetcher<any>();
  const payFetcher = useFetcher<any>();
  const orderFetcher = useFetcher<any>();
  const payForPlanFetcher = useFetcher<any>();

  useEffect(() => {
    setIsLoading(false);
    fetcher.submit(
      {
        log: `${globalStore?.shop} 目前在付费页面`,
      },
      {
        method: "POST",
        action: "/log",
      },
    );
  }, []);

  useEffect(() => {
    if (payFetcher.data) {
      if (payFetcher.data?.success) {
        const confirmationUrl = payFetcher.data?.response?.confirmationUrl;
        open(confirmationUrl, "_top");
      } else {
        setBuyButtonLoading(false);
      }
    }
  }, [payFetcher.data]);

  useEffect(() => {
    if (payForPlanFetcher.data) {
      if (payForPlanFetcher.data?.success) {
        const confirmationUrl =
          payForPlanFetcher.data?.response?.confirmationUrl;
        open(confirmationUrl, "_top");
      } else {
        setPayForPlanButtonLoading("");
      }
    }
  }, [payForPlanFetcher.data]);

  useEffect(() => {
    if (planCancelFetcher.data) {
      dispatch(
        setPlan({
          plan: {
            id: 2,
            type: "Free",
            feeType: 0,
            isInFreePlanTime: false,
          },
        }),
      );
      dispatch(setUpdateTime({ updateTime: "" }));
      dispatch(setIpBalance({ ipBalance: 500 }));
      setCancelPlanWarnModal(false);
    }
  }, [planCancelFetcher.data]);

  const plans = useMemo(
    () => [
      {
        title: "Basic",
        yearlyTitle: "Basic - Yearly",
        monthlyPrice: 7.99,
        yearlyPrice: 6.39,
        subtitle: t("<strong>${{amount}}</strong> billed once a year", {
          amount: 76.68,
        }),
        buttonText:
          plan.type === "Basic" && yearly === !!(plan.feeType === 2)
            ? t("pricing.current_plan")
            : t("pricing.get_start"),
        fitLabel: t("Best for shops validating a few target markets"),
        disabled: plan.type === "Basic" && yearly === !!(plan.feeType === 2),
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
        yearlyTitle: "Pro - Yearly",
        monthlyPrice: 19.99,
        yearlyPrice: 15.99,
        subtitle: t("<strong>${{amount}}</strong> billed once a year", {
          amount: 191.88,
        }),
        buttonText:
          plan.type === "Pro" && yearly === !!(plan.feeType === 2)
            ? t("pricing.current_plan")
            : t("pricing.get_start"),
        fitLabel: t("Best for growing stores translating products and storefront content continuously"),
        disabled: plan.type === "Pro" && yearly === !!(plan.feeType === 2),
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
        yearlyTitle: "Premium - Yearly",
        monthlyPrice: 39.99,
        yearlyPrice: 31.99,
        subtitle: t("<strong>${{amount}}</strong> billed once a year", {
          amount: 383.88,
        }),
        buttonText:
          plan.type === "Premium" && yearly === !!(plan.feeType === 2)
            ? t("pricing.current_plan")
            : t("pricing.get_start"),
        fitLabel: t("Best for teams operating multiple languages as an ongoing growth channel"),
        disabled: plan.type === "Premium" && yearly === !!(plan.feeType === 2),
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
    [plan, yearly],
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
          "Choosing Pro or Premium gives you 5 days of full access to all features, along with 200,000 trial credits. Cancel anytime before the trial ends to avoid billing.",
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
      width: "20%",
    },
    {
      title: "Free",
      dataIndex: "free",
      key: "free",
      width: "20%",
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
      width: "20%",
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
      width: "20%",
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
      width: "20%",
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

  const handleSetYearlyReport = () => {
    setYearly(!yearly);
    report(
      {
        status: yearly ? 0 : 1,
      },
      {
        action: "/app",
        method: "post",
        eventType: "click",
      },
      "pricing_plan_yearly_switcher",
    );
  };

  const handleCancelPlan = async () => {
    const data = await GetLatestActiveSubscribeId({
      shop: globalStore?.shop as string,
      server: globalStore?.server as string,
    });
    if (data.success) {
      planCancelFetcher.submit(
        {
          cancelId: JSON.stringify(data.response),
        },
        { method: "POST" },
      );
    }
  };

  const handleOpenAddCreditsModal = () => {
    setAddCreditsModalOpen(true);
    reportClick("pricing_balance_add");
  };

  const handlePayForCredits = () => {
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
      method: "POST",
    });
  };

  const handlePayForPlan = ({
    plan,
    trialDays,
    id,
  }: {
    plan: any;
    trialDays: number;
    id: string;
  }) => {
    setPayForPlanButtonLoading(id);
    setSelectedPayPlanOption({ ...plan, yearly, trialDays });
    payForPlanFetcher.submit(
      { payForPlan: JSON.stringify({ ...plan, yearly, trialDays }) },
      { method: "POST" },
    );
    reportClick(trialDays !== 5 ? "pricing_plan_start" : "pricing_plan_trial");
  };

  return (
    <Page>
      <TitleBar title={t("Pricing")} />
      <div className="pricing-page">
      <Space direction="vertical" size="middle" style={{ display: "flex" }}>
        <AppPageHeader
          title={t("Pricing")}
          description={t(
            "Choose a plan that matches your store growth stage, understand available credits clearly, and decide when to upgrade versus buy extra volume.",
          )}
        />

        <AppSectionCard
          title={t("Billing overview")}
          extra={
            plan.type ? (
              <AppStatusBadge tone="info">{`${t(plan.type)} Plan`}</AppStatusBadge>
            ) : (
              <Skeleton.Button />
            )
          }
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={15}>
              <AcountInfoCard
                loading={isLoading}
                translation_balance={totalChars - chars || 0}
                onBuyCredits={handleOpenAddCreditsModal}
                planLabel={plan.type ? `${t(plan.type)} ${t("Plan")}` : undefined}
                updateTime={updateTime}
                totalCredits={totalChars || 0}
                usedCredits={chars || 0}
              />
            </Col>
            <Col xs={24} lg={9}>
              <Card
                style={{
                  height: "100%",
                  border: "1px solid var(--app-color-border-secondary)",
                  boxShadow: "var(--app-shadow-card)",
                  borderRadius: 16,
                  background:
                    "linear-gradient(180deg, rgba(84, 103, 255, 0.08), rgba(255,255,255,0.96))",
                }}
                styles={{ body: { padding: 20, height: "100%" } }}
              >
                <Space direction="vertical" size={14} style={{ display: "flex", height: "100%" }}>
                  <div>
                    <Title level={4} style={{ margin: 0 }}>
                      {t("Decision helper")}
                    </Title>
                    <Text type="secondary">
                      {t("Use one clear rule to decide between upgrading your plan and buying extra credits.")}
                    </Text>
                  </div>

                  <div className="pricing-plan-card__billing-note">
                    <strong>{t("Upgrade plan")}</strong>
                    <div>{t("Best for stores translating content continuously across multiple markets every month.")}</div>
                  </div>

                  <div className="pricing-plan-card__billing-note">
                    <strong>{t("Buy credits")}</strong>
                    <div>{t("Best for short-term spikes like campaign launches, product drops, or urgent content refreshes.")}</div>
                  </div>

                  <div style={{ marginTop: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Button type="primary" onClick={() => {
                      const el = document.getElementById("pricing-plans");
                      el?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}>
                      {t("View plans")}
                    </Button>
                    <Button onClick={handleOpenAddCreditsModal}>{t("Buy credits")}</Button>
                  </div>
                </Space>
              </Card>
            </Col>
          </Row>
        </AppSectionCard>

        {isQuotaExceeded && (
          <Alert
            message={t("The quota has been used up")}
            description={t("Buy extra credits now to continue using")}
            type="warning"
            showIcon
          />
        )}
        <div id="pricing-plans">
        <AppSectionCard
          title={t("Plans")}
          extra={
            <Flex align="center" gap={8} wrap="wrap">
              <Text type="secondary">{t("Monthly")}</Text>
              <Switch checked={yearly} onChange={handleSetYearlyReport} />
              <Text strong>{t("Yearly")}</Text>
              <div className="yearly_save">
                <Text strong>{t("Save 20%")}</Text>
              </div>
            </Flex>
          }
        >
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
              className={`pricing-plan-card ${
                plan.type === "Free" ? "pricing-plan-card--current" : ""
              }`}
              hoverable
              style={{
                flex: 1,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                position: "relative",
                minWidth: "220px",
              }}
              styles={{
                body: {
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  padding: "20px",
                },
              }}
              loading={!plan.id}
            >
              <Space direction="vertical" size={12} style={{ display: "flex" }}>
                {plan.type === "Free" ? (
                  <AppStatusBadge tone="info">{t("Current plan")}</AppStatusBadge>
                ) : null}
                <div>
                  <Title level={4} style={{ margin: 0 }}>
                    {t("Free")}
                  </Title>
                  <div className="pricing-plan-card__fit">
                    {t("Best for testing translation flows before scaling")}
                  </div>
                </div>
                <div>
                  <Text className="pricing-plan-card__price">$0</Text>
                  <Text className="pricing-plan-card__unit">{t("/month")}</Text>
                </div>
              </Space>

              <Button
                type="default"
                block
                disabled={plan.type === "Free" || selectedPayPlanOption}
                style={{ marginTop: 20, marginBottom: isNew ? "60px" : "20px" }}
                onClick={() => {
                  setCancelPlanWarnModal(true);
                  reportClick("pricing_plan_trial");
                }}
              >
                {plan.type === "Free"
                  ? t("pricing.current_plan")
                  : t("pricing.get_start")}
              </Button>
              <div style={{ flex: 1 }}>
                <div
                  key={0}
                  className="pricing-plan-card__feature"
                >
                  <CheckOutlined
                    style={{ color: "var(--p-color-text-success)", fontSize: "12px" }}
                  />
                  <Text style={{ fontSize: "13px" }}>
                    {t("starter_features1")}
                  </Text>
                </div>
                <div
                  key={1}
                  className="pricing-plan-card__feature"
                >
                  <CheckOutlined
                    style={{ color: "var(--p-color-text-success)", fontSize: "12px" }}
                  />
                  <Text style={{ fontSize: "13px" }}>
                    {t("starter_features2")}
                  </Text>
                </div>
                <div
                  key={2}
                  className="pricing-plan-card__feature"
                >
                  <CheckOutlined
                    style={{ color: "var(--p-color-text-success)", fontSize: "12px" }}
                  />
                  <Text style={{ fontSize: "13px" }}>
                    {t("starter_features3")}
                  </Text>
                </div>
              </div>
            </Card>
          </Col>
          {plans.map((item, index) => (
            <Col
              key={item.title}
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
                  className={`pricing-plan-card ${
                    item.disabled ? "pricing-plan-card--current" : item.isRecommended && plan.type === "Free" && plan.id ? "pricing-plan-card--recommended" : ""
                  }`}
                  style={{
                    flex: 1,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    position: "relative",
                    minWidth: "220px",
                  }}
                  styles={{
                    body: {
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      padding: "20px",
                    },
                  }}
                  loading={!plan.id}
                >
                  <Space direction="vertical" size={12} style={{ display: "flex" }}>
                    {item.disabled ? (
                      <AppStatusBadge tone="info">{t("Current plan")}</AppStatusBadge>
                    ) : item.isRecommended && plan.type === "Free" && plan.id ? (
                      <AppStatusBadge tone="caution">{t("Recommended")}</AppStatusBadge>
                    ) : null}
                    <div>
                      <Title level={4} style={{ margin: 0 }}>
                        {yearly ? item.yearlyTitle : item.title}
                      </Title>
                      <div className="pricing-plan-card__fit">{item.fitLabel}</div>
                    </div>
                    <div>
                      <Text className="pricing-plan-card__price">
                        ${yearly ? item.yearlyPrice : item.monthlyPrice}
                      </Text>
                      <Text className="pricing-plan-card__unit">{t("/month")}</Text>
                    </div>
                  </Space>
                  {yearly && (
                    <div
                      dangerouslySetInnerHTML={{ __html: item.subtitle }}
                      className="pricing-plan-card__billing-note"
                    />
                  )}
                  <Button
                    id={`${item.title}-${yearly ? "yearly" : "month"}-${index}-0`}
                    type={item.isRecommended && !isNew ? "primary" : "default"}
                    block
                    disabled={item.disabled || selectedPayPlanOption}
                    style={{ marginBottom: "20px" }}
                    onClick={() =>
                      handlePayForPlan({
                        plan: item,
                        trialDays: 0,
                        id: `${item.title}-${yearly ? "yearly" : "month"}-${index}-0`,
                      })
                    }
                    loading={
                      payForPlanButtonLoading ==
                      `${item.title}-${yearly ? "yearly" : "month"}-${index}-0`
                    }
                  >
                    {item.buttonText}
                  </Button>
                  {isNew && (
                    <Button
                      id={`${item.title}-${yearly ? "yearly" : "month"}-${index}-5`}
                      type={item.isRecommended ? "primary" : "default"}
                      block
                      disabled={item.disabled || selectedPayPlanOption}
                      style={{ marginBottom: "20px" }}
                      onClick={() =>
                        handlePayForPlan({
                          plan: item,
                          trialDays: 5,
                          id: `${item.title}-${yearly ? "yearly" : "month"}-${index}-5`,
                        })
                      }
                      loading={
                        payForPlanButtonLoading ==
                        `${item.title}-${yearly ? "yearly" : "month"}-${index}-5`
                      }
                    >
                      {t("Free trial")}
                    </Button>
                  )}
                  <div style={{ flex: 1 }}>
                    {item.features.map((feature, idx) => (
                      <div
                        key={idx}
                        className="pricing-plan-card__feature"
                      >
                        <CheckOutlined
                          style={{
                            color: "var(--p-color-text-success)",
                            fontSize: "12px",
                          }}
                        />
                        <Text style={{ fontSize: "13px" }}>{feature}</Text>
                      </div>
                    ))}
                  </div>
                </Card>
            </Col>
          ))}
          </Row>
        </AppSectionCard>
        </div>
        <Space direction="vertical" size="small" style={{ display: "flex" }}>
          <AppSectionCard title={t("Compare plans")} bodyPadding="16px">
            <Table
              className="pricing-comparison-table"
              dataSource={tableData}
              columns={columns}
              pagination={false}
            />
          </AppSectionCard>
        </Space>
        <AppSectionCard title={t("FAQs")} bodyPadding="8px 16px">
          <Collapse
            items={collapseData}
            onChange={() => {
              reportClick("pricing_faq_click");
            }}
          />
        </AppSectionCard>
      </Space>
      </div>
      <HasPayForFreePlanModal />
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
              {plan.type === "Premium"
                ? t("discountText.premium")
                : plan.type === "Pro"
                  ? t("discountText.pro")
                  : plan.type === "Basic"
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
                    borderColor: "transparent",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "150px",
                    background:
                      JSON.stringify(selectedOptionKey) ===
                      JSON.stringify(option.key)
                        ? "var(--app-color-surface-selected)"
                        : "var(--app-color-surface)",
                    boxShadow: "var(--app-shadow-card)",
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
                  {(plan.type === "Premium" ||
                    plan.type === "Pro" ||
                    plan.type === "Basic") &&
                  !plan?.isInFreePlanTime ? (
                    <>
                      <Title
                        level={3}
                        style={{
                          margin: 0,
                          color: "var(--app-color-text)",
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
                      style={{ margin: 0, color: "var(--app-color-text)", fontWeight: 700 }}
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
                onClick={handlePayForCredits}
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
    </Page>
  );
};

export default Index;

//根据计划类型返回价格数据
export const eNumPlanType = ({
  planType,
  optionName,
  isInTrial,
}: {
  planType: string;
  optionName: string;
  isInTrial: boolean;
}) => {
  const findTableData = priceTable[optionName];

  if (!findTableData)
    return {
      currentPrice: 239.99,
      comparedPrice: 239.99,
      currencyCode: "USD",
    };

  // 免费期 = base 原价
  if (isInTrial) {
    return {
      currentPrice: findTableData.base,
      comparedPrice: findTableData.base,
      currencyCode: "USD",
    };
  }

  // 未知类型 → base
  const map: Record<string, number> = {
    Premium: findTableData.Premium,
    Pro: findTableData.Pro,
    Basic: findTableData.Basic,
  };

  const currentPrice = map[planType ?? ""] ?? findTableData.base;

  return {
    currentPrice,
    comparedPrice: findTableData.base,
    currencyCode: "USD",
  };
};
