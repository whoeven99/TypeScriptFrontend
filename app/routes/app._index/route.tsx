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
import {
  Link,
  useFetcher,
  useLoaderData,
  useLocation,
  useNavigate,
} from "@remix-run/react";
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
import prisma from "~/db.server";
import WelcomeCard from "./components/welcomeCard";
import useReport from "scripts/eventReport";
import ProgressingModal from "./components/progressingModal";
import TranslationPanel from "./components/TranslationPanel";
import ExpressTranslateCard from "./components/ExpressTranslateCard";
import { GetAllProgressData } from "~/api/JavaServer";
import { globalStore } from "~/globalStore";
import { withEmbeddedSearch } from "~/utils/embeddedAction";
import AppPageHeader from "~/ui/components/AppPageHeader";
import AppSectionCard from "~/ui/components/AppSectionCard";
import { isTranslateV4Enabled, isTranslateV4ShopAllowed } from "~/server/translateV4/feature.server";
import { listV4JobSummaries } from "~/server/translateV4/progress.server";

const { Title, Text } = Typography;

type ShopLocaleOption = {
  value: string;
  label: string;
  primary: boolean;
  published: boolean;
};

const SHOP_LOCALES_QUERY = `#graphql
  query HomeExpressShopLocales {
    shopLocales {
      locale
      name
      primary
      published
    }
  }
`;

/** 首页「极速翻译」卡片所需的 v4 数据，仅在功能开关开启时拉取。 */
async function loadExpressV4Data(
  admin: Awaited<ReturnType<typeof authenticate.admin>>["admin"],
  shop: string,
) {
  if (!isTranslateV4Enabled() || !isTranslateV4ShopAllowed(shop)) {
    return { enabled: false, locales: [], primaryLocale: "zh-CN", jobs: [], migrated: false };
  }

  let locales: ShopLocaleOption[] = [];
  let primaryLocale = "zh-CN";
  try {
    const res = await admin.graphql(SHOP_LOCALES_QUERY);
    const payload = (await res.json()) as {
      data?: {
        shopLocales?: Array<{
          locale: string;
          name: string;
          primary: boolean;
          published: boolean;
        }> | null;
      };
    };
    const rows = payload.data?.shopLocales ?? [];
    locales = rows.map((r) => ({
      value: r.locale,
      label: `${r.name} (${r.locale})`,
      primary: r.primary,
      published: r.published,
    }));
    primaryLocale = rows.find((r) => r.primary)?.locale ?? primaryLocale;
  } catch (err) {
    console.error("[expressV4] load shopLocales failed:", err);
  }

  let jobs: Awaited<ReturnType<typeof listV4JobSummaries>> = [];
  try {
    jobs = await listV4JobSummaries(shop);
  } catch (err) {
    console.error("[expressV4] load jobs failed:", err);
  }

  let migrated = false;
  try {
    const settings = await prisma.shopTranslationSettings.findUnique({
      where: { shop },
      select: { migratedToTsf: true },
    });
    migrated = settings?.migratedToTsf ?? false;
  } catch (err) {
    console.error("[expressV4] load migration status failed:", err);
  }

  return { enabled: true, locales, primaryLocale, jobs, migrated };
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop } = adminAuthResult.session;
  const language =
    request.headers.get("Accept-Language")?.split(",")[0] || "en";
  const languageCode = language.split("-")[0];

  const expressV4 = await loadExpressV4Data(adminAuthResult.admin, shop);

  return {
    language,
    isChinese: languageCode === "zh" || languageCode === "zh-CN",
    ciwiSwitcherId: process.env.SHOPIFY_CIWI_SWITCHER_ID as string,
    ciwiSwitcherBlocksId: process.env.SHOPIFY_CIWI_SWITCHER_THEME_ID as string,
    server: process.env.SERVER_URL,
    shop: shop,
    expressV4,
  };
};

const Index = () => {
  const { language, isChinese, shop, server, ciwiSwitcherBlocksId, ciwiSwitcherId, expressV4 } =
    useLoaderData<typeof loader>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  /** 已迁移到 v4 的店：首页只展示「极速翻译」，隐藏 v2 仪表盘与翻译进度卡。 */
  const v4MigratedHome = expressV4.enabled && expressV4.migrated;

  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasStoppedTaskIds = useRef<number[]>([]);

  const [progressDataSource, setProgressDataSource] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProgressLoading, setIsProgressLoading] = useState(true);
  const [switcherOpen, setSwitcherOpen] = useState(true);
  const [progressingModalOpen, setProgressingModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  const needRepoll = useMemo(() =>
    progressDataSource.some(
      (item: any) =>
        item?.translateStatus !== "translation_process_saved" &&
        (item?.status == 1 || item?.status == 2),
    ),
    [progressDataSource],
  );

  const blockUrl = useMemo(
    () =>
      `https://${shop}/admin/themes/current/editor?context=apps&activateAppId=${ciwiSwitcherId}/ciwi_I18n_Switcher`,
    [shop, ciwiSwitcherBlocksId],
  );

  const fetcher = useFetcher<any>();
  const themeFetcher = useFetcher<any>();

  const { reportClick } = useReport();

  useEffect(() => {
    setIsLoading(false);
    themeFetcher.submit(
      {
        theme: JSON.stringify(true),
      },
      {
        method: "post",
        action: withEmbeddedSearch("/app/currency", location.search),
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
    if (!v4MigratedHome) {
      getAllProgressDataFromEnd({ active: false });
    } else {
      setIsProgressLoading(false);
    }
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [location.search]);

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
    if (v4MigratedHome) return;

    console.log("needRepoll: ", needRepoll);

    if (needRepoll) {
      getAllProgressDataFromEnd({ active: needRepoll });
    } else if (pollingTimerRef.current) {
      clearTimeout(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  }, [needRepoll, v4MigratedHome]);

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

  const getAllProgressDataFromEnd = async ({
    retryCount = 0,
    active = false
  }: {
    retryCount?: number,
    active?: boolean
  }) => {
    // source 不存在：500ms 重试，最多 5 次
    if (!globalStore.source) {
      if (retryCount < 50) {
        setTimeout(() => {
          getAllProgressDataFromEnd({ retryCount: retryCount + 1, active });
        }, 500);
      }
      return;
    }

    const getAllProgressData = await GetAllProgressData({
      shop,
      server: server || "",
      source: globalStore.source || "",
    });

    if (getAllProgressData?.success) {
      const listData =
        getAllProgressData?.response?.list?.map((item: any) => {
          return {
            ...item,
            progressData:
              item?.translateStatus === "translation_process_saving_shopify"
                ? {
                  RemainingQuantity:
                    item?.writingData?.write_total -
                    item?.writingData?.write_done || 0,
                  TotalQuantity: item?.writingData?.write_total || 1,
                }
                : item?.progressData,
            module: resourceTypeToModule(item?.resourceType ?? ""),
            status: hasStoppedTaskIds.current.includes(item?.taskId) ? 7 : item?.status,
          };
        }) ?? [];

      setProgressDataSource(listData);
    }

    if (isProgressLoading) {
      setIsProgressLoading(false);
    }

    if (active) {
      pollingTimerRef.current = setTimeout(() => {
        getAllProgressDataFromEnd({ active: needRepoll });
      }, 1000);
    }
  };

  const handleCommitRequest = () => {
    handleContactSupport();
    reportClick("dashboard_devprogress_request");
  };

  const handleReportCiwiHelpCenter = () => {
    reportClick("dashboard_footer_help_center");
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
        return "Metafield";

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

  const updateProgressDataSourceStatus = (taskId: number, status: number) => {
    if (status === 7) {
      hasStoppedTaskIds.current.push(taskId);
    } else if (status === 2 && hasStoppedTaskIds.current.includes(taskId)) {
      hasStoppedTaskIds.current.splice(hasStoppedTaskIds.current.indexOf(taskId), 1);
    }

    setProgressDataSource((prev: any) => {
      return prev.map((item: any) => {
        if (item.taskId === taskId) {
          return {
            ...item,
            status,
          };
        }
        return item;
      });
    });
  };

  return (
    <Page>
      <TitleBar title={t("Dashboard")} />
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
        <AppPageHeader
          title={t("Dashboard")}
          description={t(
            "Monitor translation progress, review key storefront metrics, and jump into the next localization task.",
          )}
        />
        <Space direction="vertical" size="middle" style={{ display: "flex" }}>
          {!v4MigratedHome ? (
            <>
              <AnalyticsCard isLoading={isLoading}></AnalyticsCard>
              <ProgressingCard
                dataSource={progressDataSource}
                isProgressLoading={isProgressLoading}
                isMobile={isMobile}
                setProgressingModalOpen={setProgressingModalOpen}
                updateProgressDataSourceStatus={updateProgressDataSourceStatus}
              />
            </>
          ) : null}
          {expressV4.enabled ? (
            <ExpressTranslateCard
              shop={shop}
              locales={expressV4.locales}
              primaryLocale={expressV4.primaryLocale}
              initialJobs={expressV4.jobs}
              migrated={expressV4.migrated}
            />
          ) : null}

          <TranslationPanel />

          <WelcomeCard
            switcherOpen={switcherOpen}
            blockUrl={blockUrl}
            shop={shop}
          // handleReload={handleReload}
          />

          <Row gutter={16}>
            <Col xs={24} sm={24} md={12}>
              <AppSectionCard style={{ height: "100%" }} bodyPadding="12px 16px">
                <Space direction="vertical" style={{ display: "flex" }}>
                  <Text strong>{t("transLanguageCard3.title")}</Text>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "row-reverse",
                      gap: "var(--app-space-300)",
                      justifyContent: "flex-start",
                    }}
                  >
                    <img
                      src="https://ciwi-1327177217.cos.ap-singapore.myqcloud.com/safeicon-min.png"
                      alt="safe"
                      style={{
                        width: "50px",
                        height: "50px",
                        borderRadius: "var(--app-radius-small)",
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
              </AppSectionCard>
            </Col>
            <Col xs={24} sm={24} md={12}>
              <AppSectionCard
                style={{ height: "100%" }}
                bodyPadding="12px 16px"
                title={t("transCurrencyCard1.title")}
                description={t("transCurrencyCard1.description")}
              >
                <Flex
                  vertical
                  style={{ height: "100%" }}
                  justify="space-between"
                >
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
              </AppSectionCard>
            </Col>
          </Row>
        </Space>
        <Space direction="vertical" size="small" style={{ display: "flex" }}>
          <AppSectionCard
            title={t("dashboard.title3")}
            bodyPadding="12px 16px"
          >
            <Space
              direction="vertical"
              size="small"
              style={{ display: "flex" }}
            >
              <Text strong>{t("planCard.title")}</Text>
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
          </AppSectionCard>
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
            display: "flex",
            justifyContent: "center",
            color: "var(--app-color-text-secondary)",
            gap: "4px",
            flexWrap: "wrap",
          }}
        >
          {t("Learn more in")}
          <Link
            to="https://ciwi.ai/help-center/ShopifyApp/about-ciwi-ai-translator-shopify-app"
            target="_blank"
            style={{ color: "var(--app-color-brand)" }}
            onClick={handleReportCiwiHelpCenter}
          >
            {t("Ciwi Help Center")}
          </Link>
          {t("by")}
          <Link
            to={"https://ciwi.ai"}
            target="_blank"
            style={{ color: "var(--app-color-brand)" }}
          >
            {t("Ciwi.ai")}
          </Link>
        </Text>
      </Space>
      {!v4MigratedHome ? (
        <ProgressingModal
          open={progressingModalOpen}
          onCancel={() => setProgressingModalOpen(false)}
          dataSource={progressDataSource}
          isMobile={isMobile}
          updateProgressDataSourceStatus={updateProgressDataSourceStatus}
        />
      ) : null}
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
