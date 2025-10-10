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
import { authenticate } from "~/shopify.server";
import WelcomeCard from "./components/welcomeCard";
import useReport from "scripts/eventReport";
import { useSelector } from "react-redux";
import CorrectIcon from "~/components/icon/correctIcon";
import GiftIcon from "~/components/icon/giftIcon";

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
  const {
    language,
    isChinese,
    server,
    shop,
    ciwiSwitcherBlocksId,
    ciwiSwitcherId,
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
  const { reportClick, report } = useReport();
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
      votes: 100,
      devStatus: t("Launched"),
    },
    {
      key: 2,
      need: t("devplanCard2.title"),
      votes: 35,
      devStatus: t("Launched"),
    },
    {
      key: 3,
      need: t("devplanCard3.title"),
      votes: 35,
      devStatus: t("In development"),
    },
    {
      key: 4,
      need: t("devplanCard4.title"),
      votes: 25,
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
        <WelcomeCard
          switcherOpen={switcherOpen}
          blockUrl={blockUrl}
          shop={shop}
          // handleReload={handleReload}
        />
        <Space direction="vertical" size="middle" style={{ display: "flex" }}>
          <div style={{ paddingLeft: "8px" }}>
            <Title level={3}>{t("dashboard.title1")}</Title>
            <Text strong>{t("dashboard.description1")}</Text>
          </div>
          <div>
            <Card
              style={
                !userConfigIsLoading && isNew
                  ? {
                      borderBottomLeftRadius: 0,
                      borderBottomRightRadius: 0,
                    }
                  : {}
              }
            >
              <Space
                direction="vertical"
                size="middle"
                style={{ display: "flex" }}
              >
                <Title level={4}>{t("transLanguageCard1.title")}</Title>
                <Text>{t("transLanguageCard1.description")}</Text>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  {isLoading ? (
                    <Skeleton.Button active />
                  ) : (
                    <Button
                      type="primary"
                      onClick={() => navigateToTranslate()}
                    >
                      {t("transLanguageCard1.button")}
                    </Button>
                  )}
                </div>
              </Space>
            </Card>

            <Card
              style={{
                borderBlockStartColor: "#f0f0f0",
                borderTopLeftRadius: 0,
                borderTopRightRadius: 0,
              }}
              styles={{
                body: {
                  paddingTop: 6,
                  paddingBottom: 6,
                },
              }}
            >
              <Flex align="center" justify="space-between" gap={24}>
                <Space
                  size={"small"}
                  style={{ display: "flex", alignItems: "center" }}
                >
                  <Flex align="center">
                    <CorrectIcon />
                  </Flex>
                  <Text
                    style={{
                      whiteSpace: "normal", // 允许换行
                      wordBreak: "break-word", // 长单词也能断开
                      maxWidth: "100%", // 不超过容器宽度
                      color: "#007F61",
                    }}
                  >
                    {t("Up to 8,000,000 translation credits")}
                  </Text>
                  <Flex align="center">
                    <CorrectIcon />
                  </Flex>
                  <Text
                    style={{
                      whiteSpace: "normal", // 允许换行
                      wordBreak: "break-word", // 长单词也能断开
                      maxWidth: "100%", // 不超过容器宽度
                      color: "#007F61",
                    }}
                  >
                    {t("Auto translation")}
                  </Text>
                  <Flex align="center">
                    <CorrectIcon />
                  </Flex>
                  <Text
                    style={{
                      whiteSpace: "normal", // 允许换行
                      wordBreak: "break-word", // 长单词也能断开
                      maxWidth: "100%", // 不超过容器宽度
                      color: "#007F61",
                    }}
                  >
                    {t("Image & alt text translation")}
                  </Text>
                  <Flex align="center">
                    <CorrectIcon />
                  </Flex>

                  <Text
                    style={{
                      whiteSpace: "normal", // 允许换行
                      wordBreak: "break-word", // 长单词也能断开
                      maxWidth: "100%", // 不超过容器宽度
                      color: "#007F61",
                    }}
                  >
                    {t("IP-based switching")}
                  </Text>
                </Space>
                {!userConfigIsLoading ? (
                  <Button
                    type="text"
                    icon={<GiftIcon />}
                    onClick={handleReceive}
                    style={{
                      color: "#007F61",
                      padding: 0,
                    }}
                  >
                    {isNew ? t("5 Days Free Trial >>") : t("Activate >>")}
                  </Button>
                ) : (
                  <Skeleton.Button active />
                )}
              </Flex>
            </Card>
          </div>
          <ProgressingCard shop={shop} server={server || ""} />
          <Row gutter={16}>
            <Col xs={24} sm={24} md={12}>
              <Card
                style={{
                  height: "100%",
                }}
                styles={{
                  body: {
                    height: "100%",
                  },
                }}
              >
                <div
                  style={{
                    height: "100%",
                    display: "flex",
                    justifyContent: "space-between",
                    flexDirection: "column",
                  }}
                >
                  <Space
                    direction="vertical"
                    size="middle"
                    style={{ display: "flex" }}
                  >
                    <Text strong>{t("transLanguageCard2.title")}</Text>
                    <Text>{t("transLanguageCard2.description")}</Text>
                  </Space>
                  {isLoading ? (
                    <Skeleton.Button active />
                  ) : (
                    <Button
                      onClick={() => navigateToLanguage()}
                      style={{ marginLeft: "auto", alignSelf: "flex-start" }}
                    >
                      {t("transLanguageCard2.button")}
                    </Button>
                  )}
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={24} md={12}>
              <Card
                style={{
                  height: "100%",
                }}
              >
                <Space
                  direction="vertical"
                  size="middle"
                  style={{ display: "flex" }}
                >
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
          </Row>
        </Space>
        <Space direction="vertical" size="middle" style={{ display: "flex" }}>
          <div style={{ paddingLeft: "8px" }}>
            <Title level={3}>{t("dashboard.title2")}</Title>
            <Text strong>{t("dashboard.description2")}</Text>
          </div>
          <Card>
            <Space
              direction="vertical"
              size="middle"
              style={{ display: "flex" }}
            >
              <Title level={4}>{t("transCurrencyCard1.title")}</Title>
              <Text>{t("transCurrencyCard1.description")}</Text>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                {isLoading ? (
                  <Skeleton.Button active />
                ) : (
                  <Button type="primary" onClick={() => navigateToCurrency()}>
                    {t("transCurrencyCard1.button")}
                  </Button>
                )}
              </div>
            </Space>
          </Card>
          <Row gutter={16}>
            <Col xs={24} sm={24} md={12}>
              <Card
                style={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
                styles={{
                  body: {
                    display: "flex",
                    flexDirection: "column",
                    flex: 1,
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
                      <Button onClick={navigateToHelpSwitchCurrency}>
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
                </Space>
              </Card>
            </Col>
          </Row>
        </Space>
        <Space direction="vertical" size="middle" style={{ display: "flex" }}>
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
              <Title style={{fontSize:"14px"}}>{t("planCard.title")}</Title>
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
