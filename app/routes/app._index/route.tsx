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
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import UserGuideCard from "./components/userGuideCard";
import ContactCard from "./components/contactCard";
import PreviewCard from "./components/previewCard";
import ScrollNotice from "~/components/ScrollNotice";
import { LoaderFunctionArgs } from "@remix-run/node";
import AnalyticsCard from "./components/AnalyticsCard";
import ProgressingCard from "~/routes/app._index/components/progressingCard";
import { authenticate } from "~/shopify.server";
import WelcomeCard from "./components/welcomeCard";
import { useSelector } from "react-redux";
import ProgressingModal from "./components/progressingModal";
import CorrectIcon from "~/components/icon/correctIcon";
import GiftIcon from "~/components/icon/giftIcon";
import TranslationPanel from "./components/TranslationPanel";
import useReport from "scripts/eventReport";

const { Title, Text } = Typography;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop } = adminAuthResult.session;
  const language =
    request.headers.get("Accept-Language")?.split(",")[0] || "en";
  const languageCode = language.split("-")[0];
  if (languageCode === "zh" || languageCode === "zh-CN") {
    return {
      language,
      isChinese: true,
      ciwiSwitcherId: process.env.SHOPIFY_CIWI_SWITCHER_ID as string,
      ciwiSwitcherBlocksId: process.env
        .SHOPIFY_CIWI_SWITCHER_THEME_ID as string,
      server: process.env.SERVER_URL,
      shop: shop,
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
    };
  }
};

const Index = () => {
  const { language, isChinese, shop, ciwiSwitcherBlocksId, ciwiSwitcherId } =
    useLoaderData<typeof loader>();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const source = useRef<string>("");
  const timeoutIdRef = useRef<number | null>(null);
  const isActiveRef = useRef(false); // 当前轮询是否激活（可控制停止）
  const hasInitialized = useRef(false);
  const hasStopped = useRef(false);

  const { userConfigIsLoading, isNew } = useSelector(
    (state: any) => state.userConfig,
  );
  const [progressDataSource, setProgressDataSource] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isProgressLoading, setIsProgressLoading] = useState(true);
  const [switcherOpen, setSwitcherOpen] = useState(true);
  const [progressingModalOpen, setProgressingModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  const blockUrl = useMemo(
    () =>
      `https://${shop}/admin/themes/current/editor?context=apps&activateAppId=${ciwiSwitcherId}/ciwi_I18n_Switcher`,
    [shop, ciwiSwitcherBlocksId],
  );

  const fetcher = useFetcher<any>();
  const themeFetcher = useFetcher<any>();

  const languageFetcher = useFetcher<any>();
  const stopTranslateFetcher = useFetcher<any>();

  const { reportClick } = useReport();

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
    isActiveRef.current = true;
    pollStatus(); // 立即执行第一次

    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
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
    }
  }, [themeFetcher.data]);

  useEffect(() => {
    if (languageFetcher.data) {
      const response = languageFetcher.data?.response?.list || [];
      setIsProgressLoading(false);

      if (!response.length) return;

      const data =
        response.map((item: any) => {
          if (item)
            return {
              ...item,
              module: resourceTypeToModule(item?.resourceType || ""),
            };
          return item;
        }) ?? [];
      if (!hasInitialized.current) {
        setProgressDataSource(data);
        source.current = languageFetcher.data?.response?.source;
        setIsProgressLoading(false);
        hasInitialized.current = true;
      }

      const needRepoll = response.some((item: any) => item?.status === 2);

      if (!needRepoll || hasStopped.current) {
        return () => {
          if (timeoutIdRef.current) {
            clearTimeout(timeoutIdRef.current);
          }
        };
      }

      setProgressDataSource(data);

      // 若轮询仍激活，则等待3秒后继续
      if (isActiveRef.current && !hasStopped.current) {
        timeoutIdRef.current = window.setTimeout(() => {
          pollStatus();
        }, 3000);
      }
    }
  }, [languageFetcher.data]);

  useEffect(() => {
    if (stopTranslateFetcher.data) {
      setProgressDataSource((prev: any[] = []) =>
        prev.map((item) =>
          item?.status === 2 ? { ...item, status: 7 } : item,
        ),
      );
      hasStopped.current = true;
    }
  }, [stopTranslateFetcher.data]);

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

  const navigateToTranslate = () => {
    reportClick("dashboard_translate_button");
    navigate("/app/translate", {
      state: { from: "/app", selectedLanguageCode: "" },
    });
    fetcher.submit(
      {
        log: `${shop} 前往翻译页面, 从主页面点击`,
      },
      {
        method: "POST",
        action: "/log",
      },
    );
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

  const pollStatus = () => {
    if (!isActiveRef.current) return;

    console.log("[poll] fetch /app at", new Date().toLocaleTimeString());

    languageFetcher.submit(
      { nearTransaltedData: JSON.stringify(true) },
      { method: "post", action: "/app" },
    );
  };

  const resourceTypeToModule = (resourceType: string) => {
    switch (true) {
      case resourceType == "SHOP" || resourceType == "SELLING_PLAN_GROUP":
        return "Shop";

      case resourceType == "PAGE":
        return "Pages";

      case resourceType == "ONLINE_STORE_THEME" ||
        resourceType == "ONLINE_STORE_THEME_LOCALE_CONTENT" ||
        resourceType == "ONLINE_STORE_THEME_JSON_TEMPLATE" ||
        resourceType == "ONLINE_STORE_THEME_SECTION_GROUP" ||
        resourceType == "ONLINE_STORE_THEME_SETTINGS_CATEGORY" ||
        resourceType == "ONLINE_STORE_THEME_SETTINGS_DATA_SECTIONS" ||
        resourceType == "ONLINE_STORE_THEME_APP_EMBED":
        return "Theme";

      case resourceType == "PRODUCT" ||
        resourceType == "PRODUCT_OPTION" ||
        resourceType == "PRODUCT_OPTION_VALUE":
        return "Products";

      case resourceType == "COLLECTION":
        return "Collection";

      case resourceType == "METAFIELD":
        return "Store metadata";

      case resourceType == "ARTICLE":
        return "Article";

      case resourceType == "BLOG":
        return "Blog titles";

      case resourceType == "MENU" || resourceType == "LINK":
        return "Navigation";

      case resourceType == "FILTER":
        return "Filters";

      case resourceType == "METAOBJECT" ||
        resourceType == "PAYMENT_GATEWAY" ||
        resourceType == "SELLING_PLAN":
        return "Metaobjects";

      case resourceType == "PACKING_SLIP_TEMPLATE":
        return "Shipping";

      case resourceType == "DELIVERY_METHOD_DEFINITION":
        return "Delivery";

      case resourceType == "SHOP_POLICY":
        return "Policies";

      case resourceType == "EMAIL_TEMPLATE":
        return "Email";

      default:
        return "";
    }
  };

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
          <AnalyticsCard isLoading={isLoading}></AnalyticsCard>
          <ProgressingCard
            dataSource={progressDataSource}
            source={source.current}
            stopTranslateFetcher={stopTranslateFetcher}
            isProgressLoading={isProgressLoading}
            isMobile={isMobile}
            setProgressingModalOpen={setProgressingModalOpen}
          />
          <TranslationPanel />

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
                <Space
                  direction="vertical"
                  size="middle"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    flex: 1,
                  }}
                >
                  <Text strong>{t("transCurrencyCard2.title")}</Text>
                  <Text>{t("transCurrencyCard2.description")}</Text>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    {isLoading ? (
                      <Skeleton.Button active />
                    ) : (
                      <Button
                        onClick={() =>
                          window.open(
                            "https://ciwi.bogdatech.com/help/frequently-asked-question/how-to-set-up-multi-currency-pricing-on-your-shopify-store%ef%bc%9f/",
                            "_blank",
                          )
                        }
                      >
                        {t("transCurrencyCard2.button")}
                      </Button>
                    )}
                  </div>
                </Space>
              </Card>
            </Col>
            <Col xs={24} sm={24} md={12}>
              <Card
                style={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Space
                  direction="vertical"
                  size="middle"
                  style={{
                    display: "flex",
                    flex: 1,
                  }}
                >
                  <Text strong>{t("transCurrencyCard3.title")}</Text>
                  <Text>{t("transCurrencyCard3.description")}</Text>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    {isLoading ? (
                      <Skeleton.Button active />
                    ) : (
                      <Button onClick={navigateToSwitchCurrencyDetail}>
                        {t("transCurrencyCard3.button")}
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
            <Title level={4}>{t("dashboard.title3")}</Title>
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
              <Title style={{ fontSize: "14px" }}>{t("planCard.title")}</Title>
              <Flex justify="space-between" align="center">
                <Text>{t("planCard.description")}</Text>
                {isLoading ? (
                  <Skeleton.Button active />
                ) : (
                  <Button onClick={handleContactSupport}>
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
      <ProgressingModal
        open={progressingModalOpen}
        onCancel={() => setProgressingModalOpen(false)}
        dataSource={progressDataSource}
        isMobile={isMobile}
        source={source.current || ""}
        stopTranslateFetcher={stopTranslateFetcher}
      />
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
