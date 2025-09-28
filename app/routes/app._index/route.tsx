import { Page } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import {
  Button,
  Card,
  Col,
  Flex,
  Row,
  Skeleton,
  Space,
  Table,
  Typography,
  Modal,
} from "antd";
import { Link, useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import UserGuideCard from "./components/userGuideCard";
import ContactCard from "./components/contactCard";
import PreviewCard from "./components/previewCard";
import ScrollNotice from "~/components/ScrollNotice";
import { LoaderFunctionArgs } from "@remix-run/node";
import ProgressingCard from "~/components/progressingCard";
import AnalyticsCard from "./components/AnalyticsCard";
import { authenticate } from "~/shopify.server";
import WelcomeCard from "./components/welcomeCard";
import useReport from "scripts/eventReport";
import { useSelector } from "react-redux";
import CorrectIcon from "~/components/icon/correctIcon";
import GiftIcon from "~/components/icon/giftIcon";
import axios from "axios";
import TranslationPanel from "./components/TranslationPanel";
const { Title, Text } = Typography;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop } = adminAuthResult.session;
  const language =
    request.headers.get("Accept-Language")?.split(",")[0] || "en";
  const languageCode = language.split("-")[0];
  const scopes = adminAuthResult.session.scope
    ? adminAuthResult.session.scope.split(",")
    : [];
  console.log("dsdadasd", adminAuthResult.session.scope?.split(","));

  console.log("aaaaascopes", scopes.length);

  const optionalScopes = process.env.OPTIONAL_SCOPES;
  const missScopes = optionalScopes
    ?.split(",")
    .filter((s) => !scopes.includes(s)) as string[];

  const hasRequiresScopes = missScopes?.length === 0;
  console.log("hasRequiresScopes", hasRequiresScopes);

  if (languageCode === "zh" || languageCode === "zh-CN") {
    return {
      language,
      isChinese: true,
      ciwiSwitcherId: process.env.SHOPIFY_CIWI_SWITCHER_ID as string,
      ciwiSwitcherBlocksId: process.env
        .SHOPIFY_CIWI_SWITCHER_THEME_ID as string,
      server: process.env.SERVER_URL,
      shop: shop,
      hasRequiresScopes,
      missScopes,
    };
  } else {
    return {
      language,
      isChinese: false,
      ciwiSwitcherId: process.env.SHOPIFY_CIWI_SWITCHER_ID as string,
      ciwiSwitcherBlocksId: process.env
        .SHOPIFY_CIWI_SWITCHER_THEME_ID as string,
      server: process.env.SERVER_URL,
      shop: shop,
      hasRequiresScopes,
      missScopes,
    };
  }
};

const Index = () => {
  const {
    language,
    isChinese,
    server,
    shop,
    ciwiSwitcherBlocksId,
    ciwiSwitcherId,
    hasRequiresScopes,
    missScopes,
  } = useLoaderData<typeof loader>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { userConfigIsLoading, isNew } = useSelector(
    (state: any) => state.userConfig,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [switcherOpen, setSwitcherOpen] = useState(true);
  const [switcherLoading, setSwitcherLoading] = useState(true);
  const blockUrl = useMemo(
    () =>
      `https://${shop}/admin/themes/current/editor?context=apps&activateAppId=${ciwiSwitcherId}/ciwi_I18n_Switcher`,
    [shop, ciwiSwitcherBlocksId],
  );

  const fetcher = useFetcher<any>();
  const themeFetcher = useFetcher<any>();
  const graphqlFetcher = useFetcher<any>();
  const findWebPixelFetcher = useFetcher<any>();
  const [showRequireScopeBtn, setShowRequireScopeBtn] =
    useState(!hasRequiresScopes);
  const { reportClick, report } = useReport();

  // 翻译得分
  const [translationScore, setTranslationScore] = useState<number>(0);
  const [translatedLanguages, setTranslatedLanguages] = useState<number>(0);
  useEffect(() => {
    setIsLoading(false);
    themeFetcher.submit(
      {
        theme: JSON.stringify(true),
      },
      {
        method: "post",
        action: "/app/currency",
      },
    );
    fetcher.submit(
      {
        log: `${shop} 目前在主页面, 页面语言为${language}`,
      },
      {
        method: "POST",
        action: "/log",
      },
    );
  }, []);

  useEffect(() => {
    if (themeFetcher.data) {
      const switcherData =
        themeFetcher.data.data.nodes[0].files.nodes[0]?.body?.content;
      const jsonString = switcherData.replace(/\/\*[\s\S]*?\*\//g, "").trim();
      const blocks = JSON.parse(jsonString).current?.blocks;
      if (blocks) {
        const switcherJson: any = Object.values(blocks).find(
          (block: any) => block.type === ciwiSwitcherBlocksId,
        );
        if (switcherJson) {
          if (!switcherJson.disabled) {
            setSwitcherOpen(false);
            localStorage.setItem("switcherEnableCardOpen", "false");
          } else {
            setSwitcherOpen(true);
            localStorage.setItem("switcherEnableCardOpen", "true");
          }
        }
      }
      setSwitcherLoading(false);
    }
  }, [themeFetcher.data]);

  const columns = [
    {
      title: t("planCardTableList1.title"),
      dataIndex: "need",
      key: "need",
    },
    {
      title: t("planCardTableList2.title"),
      dataIndex: "votes",
      key: "votes",
    },
    {
      title: t("planCardTableList3.title"),
      dataIndex: "devStatus",
      key: "devStatus",
    },
  ];

  const data: {
    key: number;
    need: string;
    votes: number;
    devStatus: string;
  }[] = [
    {
      key: 1,
      need: t("devplanCard1.title"),
      votes: 65,
      devStatus: t("Launched"),
    },
    {
      key: 2,
      need: t("devplanCard2.title"),
      votes: 33,
      devStatus: t("In development"),
    },
    {
      key: 3,
      need: t("devplanCard3.title"),
      votes: 41,
      devStatus: t("Launched"),
    },
    {
      key: 4,
      need: t("devplanCard4.title"),
      votes: 18,
      devStatus: t("Launched"),
    },
    {
      key: 5,
      need: t("devplanCard5.title"),
      votes: 29,
      devStatus: t("In development"),
    },
  ];
  const handleCommitRequest = () => {
    handleContactSupport();
    reportClick("dashboard_devprogress_request");
  };
  const handleReportCiwiHelpCenter = () => {
    reportClick("dashboard_footer_help_center");
  };
  const navigateToHelpSwitchCurrency = () => {
    reportClick("dashboard_currency_guide");
    window.open(
      "https://ciwi.bogdatech.com/help/frequently-asked-question/how-to-set-up-multi-currency-pricing-on-your-shopify-store%ef%bc%9f/",
      "_blank",
    );
  };
  const navigateToSwitchCurrencyDetail = () => {
    reportClick("dashboard_currency_view_detail");
    window.open(
      "https://ciwi.bogdatech.com/help/frequently-asked-question/how-to-enable-the-app-from-shopify-theme-customization-to-apply-the-language-currency-exchange-switcher/",
      "_blank",
    );
  };
  const navigateToLanguage = () => {
    navigate("/app/language");
    fetcher.submit(
      {
        log: `${shop} 前往语言页面, 从主页面点击`,
      },
      {
        method: "POST",
        action: "/log",
      },
    );
    reportClick("dashboard_language_manage");
  };

  const navigateToCurrency = () => {
    navigate("/app/currency");
    fetcher.submit(
      {
        log: `${shop} 前往货币页面, 从主页面点击`,
      },
      {
        method: "POST",
        action: "/log",
      },
    );
    reportClick("dashboard_currency_manage");
  };

  const handleReceive = () => {
    navigate("/app/pricing");
    fetcher.submit(
      {
        log: `${shop} 前往付费页面, 从新人链接点击`,
      },
      {
        method: "POST",
        action: "/log",
      },
    );
  };
  useEffect(() => {
    console.log("app home");
  }, []);

  const handleTestGraphqlData = async () => {
    // await shopify.scopes.revoke(['read_analytics','read_reports','read_orders']);
    console.log(missScopes);
    console.log(hasRequiresScopes);

    const response = await shopify.scopes.request(missScopes as string[]);
    console.log("add scopes", response);
    const formData = new FormData();
    formData.append("quailtyEvaluation", JSON.stringify({}));
    graphqlFetcher.submit(formData, {
      method: "post",
      action: "/app",
    });
    console.log(hasRequiresScopes, missScopes);
  };
  const handleFindWebPixel = async () => {
    const data = await axios({
      method: "post",
      url: "http://localhost:3000/track",
      data: {
        eventData: "1111",
      },
    });
    console.log("data", data);

    // const formData = new FormData();
    // formData.append("findWebPixelId", JSON.stringify({}));
    // findWebPixelFetcher.submit(formData, {
    //   method: "post",
    //   action: "/app",
    // });
  };
  // useEffect(() => {
  //   const checkScopes = async () => {
  //     const { granted } = await shopify.scopes.query();
  //     console.log("exit", granted);
  //     const missingScopes = ["read_customer_events", "write_pixels"].filter(
  //       (s) => !granted.includes(s),
  //     );
  //     setShowRequireScopeBtn(missingScopes.length !== 0);
  //     console.log(showRequireScopeBtn);
  //   };
  //   checkScopes();
  // }, []);
  useEffect(() => {
    if (graphqlFetcher.data) {
      console.log(graphqlFetcher.data);
    } else {
    }
  }, [graphqlFetcher.data]);
  useEffect(() => {
    if (findWebPixelFetcher.data) {
      console.log(findWebPixelFetcher.data);
    } else {
    }
  }, [findWebPixelFetcher.data]);
  return (
    <Page>
      <TitleBar title={t("Dashboard")} />
      {/* <FreePlanCountdownCard /> */}
      <ScrollNotice
        text={t(
          "Welcome to our app! If you have any questions, feel free to email us at support@ciwi.ai, and we will respond as soon as possible.",
        )}
      />
      <Space
        direction="vertical"
        size="large"
        style={{
          display: "flex",
          overflowX: "hidden",
        }}
      >
        <Space direction="vertical" size="middle" style={{ display: "flex" }}>
          <AnalyticsCard
            hasRequiresScopes={hasRequiresScopes}
            missScopes={missScopes}
            isLoading={isLoading}
          ></AnalyticsCard>
          <ProgressingCard shop={shop} server={server || ""} />
          <WelcomeCard
            switcherOpen={switcherOpen}
            blockUrl={blockUrl}
            shop={shop}
            // handleReload={handleReload}
          />
          <Row gutter={16}>
            <Col xs={24} sm={24} md={12}>
              <Card
                style={{
                  height: "100%",
                }}
                styles={{
                  body: {
                    height: "100%",
                    padding: "12px 24px",
                  },
                }}
              >
                <Space direction="vertical" style={{ display: "flex" }}>
                  <Text strong>{t("transLanguageCard3.title")}</Text>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "row-reverse",
                      gap: "10px",
                      justifyContent: "flex-start",
                    }}
                  >
                    <img
                      src="https://ciwi-1327177217.cos.ap-singapore.myqcloud.com/safeicon-min.png"
                      alt="safe"
                      style={{
                        width: "50px",
                        height: "50px",
                        borderRadius: "4px",
                      }}
                    />
                    <div style={{ marginRight: "auto" }}>
                      <div
                        dangerouslySetInnerHTML={{
                          __html: t("transLanguageCard3.description1"),
                        }}
                      />
                      <div
                        dangerouslySetInnerHTML={{
                          __html: t("transLanguageCard3.description2"),
                        }}
                      />
                      <div
                        dangerouslySetInnerHTML={{
                          __html: t("transLanguageCard3.description3"),
                        }}
                      />
                      <div
                        dangerouslySetInnerHTML={{
                          __html: t("transLanguageCard3.description4"),
                        }}
                      />
                      <div
                        dangerouslySetInnerHTML={{
                          __html: t("transLanguageCard3.description5"),
                        }}
                      />
                    </div>
                  </div>
                </Space>
              </Card>
            </Col>
            <Col xs={24} sm={24} md={12}>
              <Card
                style={{
                  height: "100%",
                }}
                styles={{
                  body: {
                    height: "100%",
                    padding: "12px 24px",
                  },
                }}
              >
                <Flex
                  vertical
                  style={{ height: "100%" }}
                  justify="space-between"
                >
                  {/* <Title level={4}>{t("transCurrencyCard1.title")}</Title> */}
                  <Space direction="vertical" style={{ display: "flex" }}>
                    <Text strong>{t("transCurrencyCard1.title")}</Text>
                    <Text>{t("transCurrencyCard1.description")}</Text>
                  </Space>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-start",
                      bottom: "0",
                    }}
                  >
                    {isLoading ? (
                      <Skeleton.Button active />
                    ) : (
                      <Button
                        type="default"
                        onClick={() => navigateToCurrency()}
                      >
                        {t("transCurrencyCard1.button")}
                      </Button>
                    )}
                  </div>
                </Flex>
              </Card>
            </Col>
          </Row>
        </Space>
        <Space direction="vertical" size="small" style={{ display: "flex" }}>
          <div style={{ paddingLeft: "8px" }}>
            <Title level={5}>{t("dashboard.title3")}</Title>
          </div>
          <Card
            styles={{
              body: {
                padding: "12px 24px",
              },
            }}
          >
            <Space
              direction="vertical"
              size="small"
              style={{ display: "flex" }}
            >
              <Title level={5}>{t("planCard.title")}</Title>
              <Flex justify="space-between" align="center">
                <Text>{t("planCard.description")}</Text>
                {isLoading ? (
                  <Skeleton.Button active />
                ) : (
                  <Button onClick={handleCommitRequest}>
                    {t("planCard.button")}
                  </Button>
                )}
              </Flex>

              <Table columns={columns} dataSource={data} pagination={false} />
            </Space>
          </Card>
          <Row gutter={16}>
            <Col xs={24} sm={24} md={12}>
              <ContactCard
                isChinese={isChinese}
                onClick={() => {
                  reportClick("dashboard_contact_us");
                  handleContactSupport();
                }}
              />
            </Col>
            <Col xs={24} sm={24} md={12}>
              <UserGuideCard />
            </Col>
          </Row>
          <PreviewCard shop={shop} />
        </Space>
        <Text
          style={{
            display: "flex", // 使用 flexbox 来布局
            justifyContent: "center", // 水平居中
          }}
        >
          {t("Learn more in")}
          <Link
            to="https://ciwi.ai/help-center/ShopifyApp/about-ciwi-ai-translator-shopify-app"
            target="_blank"
            style={{ margin: "0 5px" }}
            onClick={handleReportCiwiHelpCenter}
          >
            {t("Ciwi Help Center")}
          </Link>
          {t("by")}
          <Link
            to={"https://ciwi.ai"}
            target="_blank"
            style={{ margin: "0 5px" }}
          >
            {t("Ciwi.ai")}
          </Link>
        </Text>
      </Space>
    </Page>
  );
};

export const handleContactSupport = () => {
  // 声明 tidioChatApi 类型
  interface Window {
    tidioChatApi?: {
      open: () => void;
    };
  }

  if ((window as Window)?.tidioChatApi) {
    (window as Window).tidioChatApi?.open();
  } else {
    console.warn("Tidio Chat API not loaded");
  }
};

export default Index;
