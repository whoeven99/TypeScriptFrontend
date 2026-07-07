import { TitleBar } from "@shopify/app-bridge-react";
import { Page } from "@shopify/polaris";
import { Space, Select, Typography, Popconfirm, Flex, Modal } from "antd";
import Button from "~/ui/components/AppButton";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./styles.css";
import { json } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { queryAppByHandle } from "~/api/admin";
import type { LanguagesDataType, ShopLocalesType } from "../app.language/route";
import { useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import { useSelector } from "react-redux";
import { TranslateImage, storageTranslateImage } from "~/api/JavaServer";
import {
  getManageTranslationLocaleSnapshotFromCache,
  invalidateAllItemsCountForLocale,
  refreshManageTranslationLocaleSummary,
  type ManageTranslationLocaleSnapshot,
} from "~/server/translateV4/itemsCount.server";
import { authenticate } from "~/shopify.server";
import NoLanguageSetCard from "~/components/noLanguageSetCard";
import { useTranslation } from "react-i18next";
import ManageTranslationsCard from "./components/manageTranslationsCard";
import ScrollNotice from "~/components/ScrollNotice";
import { InfoCircleOutlined, ReloadOutlined } from "@ant-design/icons";
import defaultStyles from "../styles/defaultStyles.module.css";
import useReport from "scripts/eventReport";
import { globalStore } from "~/globalStore";
import { shouldRevalidateManageTranslation } from "~/lib/routeShouldRevalidate";
import { onTranslationStatsUpdated } from "~/lib/translationStatsSync";
import { sameTranslationLocale } from "~/server/translateV4/locale";
import AppPageHeader from "~/ui/components/AppPageHeader";
import AppSectionCard from "~/ui/components/AppSectionCard";
import {
  type ClientLogTrace,
  finishClientLogTrace,
  reportClientLog,
  startClientLogTrace,
} from "~/utils/clientLog";
import { logManageTranslationGraphQLErrorDetail } from "~/utils/manageTranslationErrors";

const { Text } = Typography;
interface TableDataType {
  key: string;
  title: string;
  allTranslatedItems?: number | undefined;
  allItems?: number | undefined;
  sync_status: boolean;
  navigation: string;
  withoutCount: boolean;
}

type LocaleSummary = ManageTranslationLocaleSnapshot;

type RowCountRef = { type?: string; module?: string };

function buildDataRow(
  key: string,
  title: string,
  navigation: string,
  snapshot: LocaleSummary | null,
  locale: string,
  loading: boolean,
  countRef?: RowCountRef,
  opts?: { sync_status?: boolean },
): TableDataType {
  const withoutCount = !countRef;
  const row: TableDataType = {
    key,
    title,
    navigation,
    sync_status: opts?.sync_status ?? false,
    withoutCount,
  };
  if (withoutCount) return row;
  if (loading || !snapshot || snapshot.locale !== locale) return row;
  const counts = countRef.module
    ? snapshot.byModule[countRef.module]
    : countRef.type
      ? snapshot.byType[countRef.type]
      : undefined;
  if (!counts) return row;
  return {
    ...row,
    allTranslatedItems: counts.translated,
    allItems: counts.total,
  };
}

/**
 * 首屏先拉用户最常看的基础模块，把 Theme / Navigation 等重统计延后，
 * 降低进入管理页时对 Shopify GraphQL cost bucket 的瞬时压力。
 */
const ITEMS_COUNT_PRIORITY_RESOURCE_TYPES = [
  "Products",
  "Collection",
  "Article",
  "Blog titles",
  "Pages",
  "Shop",
  "Store metadata",
] as const;

const ITEMS_COUNT_DEFERRED_RESOURCE_TYPES = ITEMS_COUNT_RESOURCE_TYPES.filter(
  (resourceType) =>
    !ITEMS_COUNT_PRIORITY_RESOURCE_TYPES.includes(
      resourceType as (typeof ITEMS_COUNT_PRIORITY_RESOURCE_TYPES)[number],
    ),
);

/** 避免 15 路统计在首屏持续压满 Render 单实例（大店 Products 统计耗时更长）。 */
const ITEMS_COUNT_SUBMIT_GAP_MS = 800;
const ITEMS_COUNT_BATCH_GAP_MS = 2500;

function safeParseFormJson(value: FormDataEntryValue | null): unknown {
  if (value == null || value === "") return null;
  try {
    return JSON.parse(String(value));
  } catch {
    return null;
  }
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const searchTerm = url.searchParams.get("language");

  return json({
    searchTerm: searchTerm || "",
  });
};

export const shouldRevalidate = shouldRevalidateManageTranslation;

export const action = async ({ request }: ActionFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  const { admin } = adminAuthResult;

  const formData = await request.formData();
  const itemsCountSummary = safeParseFormJson(formData.get("itemsCountSummary")) as
    | { target?: string; forceRefresh?: boolean }
    | null;
  if (itemsCountSummary?.target) {
    const target = itemsCountSummary.target.trim();
    const forceRefresh = itemsCountSummary.forceRefresh === true;
    try {
      if (forceRefresh) {
        await invalidateAllItemsCountForLocale(shop, target);
        const response = await refreshManageTranslationLocaleSummary({
          admin,
          shop,
          locale: target,
        });
        return { success: true, errorCode: 0, errorMsg: "", response };
      }
      const response = await getManageTranslationLocaleSnapshotFromCache(shop, target);
      return { success: true, errorCode: 0, errorMsg: "", response };
    } catch (error) {
      logManageTranslationGraphQLErrorDetail(
        "Error manage_translation refreshItemsCount",
        error,
      );
      return {
        success: false,
        errorCode: 10001,
        errorMsg: "SERVER_ERROR",
        response: null,
      };
    }
  }

  const appInstalls = safeParseFormJson(formData.get("appInstalls"));
  const translateImage = safeParseFormJson(formData.get("translateImage"));
  const replaceTranslateImage = safeParseFormJson(
    formData.get("replaceTranslateImage"),
  );
  switch (true) {
    case !!appInstalls:
      try {
        const appByHandle = await queryAppByHandle({
          shop,
          accessToken: accessToken as string,
        });
        return {
          success: true,
          errorCode: 0,
          errorMsg: "",
          response: appByHandle,
        };
      } catch (error) {
        logManageTranslationGraphQLErrorDetail(
          "Error manage_translation appInstalls",
          error,
        );
        return {
          success: false,
          errorCode: 10001,
          errorMsg: "SERVER_ERROR",
          response: null,
        };
      }

    case !!itemsCount:
      try {
        const response = await getItemsCountByLabel({
          admin,
          shop,
          target: itemsCount.target,
          resourceTypeLabel: itemsCount.resourceType,
          skipCache: itemsCount.forceRefresh === true,
        });
        return { success: true, errorCode: 0, errorMsg: "", response };
      } catch (error) {
        logManageTranslationGraphQLErrorDetail(
          "Error manage_translation itemsCount",
          error,
        );
        return {
          success: false,
          errorCode: 10001,
          errorMsg: "SERVER_ERROR",
          response: null,
        };
      }

    case !!translateImage:
      try {
        const { sourceLanguage, targetLanguage, imageUrl, imageId } =
          translateImage;
        const response = await TranslateImage({
          shop,
          imageUrl,
          sourceCode: sourceLanguage,
          targetCode: targetLanguage,
          accessToken: accessToken as string,
          imageId,
        });
        return response;
      } catch (error) {
        console.log("Error getImageTranslate", error);
        return {
          success: false,
          errorCode: 10001,
          errorMsg: "SERVER_ERROR",
          response: null,
        };
      }

    case !!replaceTranslateImage:
      try {
        const { url, userPicturesDoJson } = replaceTranslateImage;
        userPicturesDoJson.shopName = shop;
        const response = await storageTranslateImage({
          shop,
          imageUrl: url,
          userPicturesDoJson,
        });
        return response;
      } catch (error) {
        console.log("error storageImage", error);
        return {
          success: false,
          errorCode: 10001,
          errorMsg: "SERVER_ERROR",
          response: null,
        };
      }

    default:
      // 你可以在这里处理一个默认的情况，如果没有符合的条件
      return {
        success: false,
        errorCode: 10001,
        errorMsg: "SERVER_ERROR",
        response: null,
      };
  }
};

function manageRow(
  key: string,
  title: string,
  navigation: string,
  opts?: { withoutCount?: boolean; sync_status?: boolean },
): TableDataType {
  return {
    key,
    title,
    sync_status: opts?.sync_status ?? false,
    navigation,
    withoutCount: opts?.withoutCount ?? true,
  };
}

const Index = () => {
  const { searchTerm } = useLoaderData<typeof loader>();

  const { t } = useTranslation();
  const navigate = useNavigate();
  const { plan } = useSelector((state: any) => state.userConfig);

  const { reportClick } = useReport();

  const { source } = useSelector((state: any) => state.userConfig);

  const languageTableData: LanguagesDataType[] = useSelector(
    (state: any) => state.languageTableData.rows,
  );

  const loading = useMemo(() => {
    return !source?.code;
  }, [source]);

  const selectOptions = useMemo(() => {
    const newArray = languageTableData?.map((language: ShopLocalesType) => ({
      label: language?.name,
      value: language?.locale,
    }));

    return newArray || [];
  }, [languageTableData]);

  const [currentLocale, setCurrentLocale] = useState<string>("");
  const [showModal, setShowModal] = useState(false);
  const [showWarnModal, setShowWarnModal] = useState(false);
  const [localeSummary, setLocaleSummary] = useState<LocaleSummary | null>(null);
  const [appInstallList, setAppInstallList] = useState<{
    pagefly: boolean;
  }>({
    pagefly: false,
  });

  const appFetcher = useFetcher<any>();
  const summaryFetcher = useFetcher<any>();

  const refreshStatsTraceRef = useRef<ClientLogTrace | null>(null);
  const loadedSummaryLocaleRef = useRef<string | null>(null);
  const pendingForceRefreshRef = useRef(false);

  const fetchLocaleSummary = useCallback(
    (target: string, forceRefresh = false) => {
      if (!target) return;
      if (forceRefresh) pendingForceRefreshRef.current = true;
      const formData = new FormData();
      formData.append(
        "itemsCountSummary",
        JSON.stringify({ target, forceRefresh }),
      );
      summaryFetcher.submit(formData, {
        method: "post",
        action: "/app/manage_translation",
      });
    },
    [summaryFetcher],
  );

  const isSummaryLoading = summaryFetcher.state !== "idle";

  const productsDataSource = useMemo(
    () => [
      buildDataRow(
        "products",
        t("Products"),
        "product",
        localeSummary,
        currentLocale,
        isSummaryLoading,
        { type: "PRODUCT" },
        { sync_status: true },
      ),
      buildDataRow(
        "collections",
        t("Collections"),
        "collection",
        localeSummary,
        currentLocale,
        isSummaryLoading,
        { type: "COLLECTION" },
        { sync_status: true },
      ),
    ],
    [localeSummary, currentLocale, isSummaryLoading, t],
  );

  const onlineStoreThemeDataSource = useMemo(
    () => [
      buildDataRow(
        "locale_content",
        t("Locale Content"),
        "locale_content",
        localeSummary,
        currentLocale,
        isSummaryLoading,
        { module: "ONLINE_STORE_THEME_LOCALE_CONTENT" },
      ),
      manageRow("json_template", t("Json Template"), "json_template"),
      manageRow("section_group", t("Section Group"), "section_group"),
      manageRow("settings_category", t("Settings Category"), "settings_category"),
      manageRow(
        "settings_data_sections",
        t("Settings Data Sections"),
        "settings_data_sections",
      ),
    ],
    [localeSummary, currentLocale, isSummaryLoading, t],
  );

  const onlineStoreDataSource = useMemo(
    () => [
      buildDataRow("shop", t("Shop"), "shop", localeSummary, currentLocale, isSummaryLoading, {
        type: "SHOP",
      }),
      buildDataRow("pages", t("Pages"), "page", localeSummary, currentLocale, isSummaryLoading, {
        type: "PAGE",
      }),
      buildDataRow(
        "metaobjects",
        t("Metaobjects"),
        "metaobject",
        localeSummary,
        currentLocale,
        isSummaryLoading,
        { type: "METAOBJECT" },
      ),
      buildDataRow(
        "navigation",
        t("Navigation"),
        "navigation",
        localeSummary,
        currentLocale,
        isSummaryLoading,
        { type: "LINK" },
      ),
      buildDataRow(
        "store_metadata",
        t("Metafield"),
        "metafield",
        localeSummary,
        currentLocale,
        isSummaryLoading,
        { type: "METAFIELD" },
      ),
    ],
    [localeSummary, currentLocale, isSummaryLoading, t],
  );

  const blogAndArticleDataSource = useMemo(
    () => [
      buildDataRow(
        "articles",
        t("Articles"),
        "article",
        localeSummary,
        currentLocale,
        isSummaryLoading,
        { type: "ARTICLE" },
      ),
      buildDataRow(
        "blog_titles",
        t("Blog titles"),
        "blog",
        localeSummary,
        currentLocale,
        isSummaryLoading,
        { type: "BLOG" },
      ),
    ],
    [localeSummary, currentLocale, isSummaryLoading, t],
  );

  const imageDataSource = useMemo(
    () => [
      manageRow("product_images", t("Product images"), "productImage"),
      manageRow("product_image_alt", t("Product image alt text"), "productImageAlt"),
    ],
    [t],
  );

  const settingsDataSource = useMemo(
    () => [
      buildDataRow(
        "policies",
        t("Policies"),
        "policy",
        localeSummary,
        currentLocale,
        isSummaryLoading,
        { type: "SHOP_POLICY" },
      ),
      buildDataRow(
        "email",
        t("Email"),
        "email",
        localeSummary,
        currentLocale,
        isSummaryLoading,
        { type: "EMAIL_TEMPLATE" },
      ),
      buildDataRow(
        "shipping",
        t("Shipping"),
        "shipping",
        localeSummary,
        currentLocale,
        isSummaryLoading,
        { type: "PACKING_SLIP_TEMPLATE" },
      ),
      buildDataRow(
        "delivery",
        t("Delivery"),
        "delivery",
        localeSummary,
        currentLocale,
        isSummaryLoading,
        { type: "DELIVERY_METHOD_DEFINITION" },
      ),
    ],
    [localeSummary, currentLocale, isSummaryLoading, t],
  );

  const liquidAndThirdPartyAppsDataSource = useMemo(() => {
    const list: TableDataType[] = [
      manageRow("custom_liquid", t("Custom Liquid"), "custom_liquid"),
    ];

    if (appInstallList.pagefly) {
      list.push(manageRow("pagefly", t("PageFly"), "pagefly"));
    }

    return list;
  }, [appInstallList, t]);


  useEffect(() => {
    void reportClientLog(
      {
        event: "manage_translation_page_view",
        shop: globalStore?.shop,
        level: "info",
        kind: "event",
        status: "success",
        message: `${globalStore?.shop} 目前在翻译管理页面`,
        context: {
          legacy: true,
        },
      },
      { beacon: true },
    );
    appFetcher.submit(
      {
        appInstalls: JSON.stringify({}),
      },
      {
        method: "POST",
      },
    );
  }, []);

  useEffect(() => {
    if (languageTableData?.length) {
      const newArray = languageTableData?.map((language: ShopLocalesType) => ({
        label: language?.name,
        value: language?.locale,
      }));

      const findValue = newArray?.find((item) => item.value == searchTerm);

      if (findValue && searchTerm) {
        setCurrentLocale(searchTerm);
      } else {
        setCurrentLocale(newArray[0]?.value);
      }
    }
  }, [languageTableData, searchTerm]);

  useEffect(() => {
    if (appFetcher.data) {
      if (appFetcher.data?.success) {
        let newData: {
          pagefly: boolean;
        } = {
          pagefly: false,
        };
        if ("pagefly" in appFetcher.data?.response) {
          newData = {
            ...newData,
            pagefly: true,
          };
        }
        setAppInstallList(newData);
      }
    }
  }, [appFetcher.data]);

  useEffect(() => {
    if (!currentLocale) return;
    if (loadedSummaryLocaleRef.current === currentLocale) return;
    loadedSummaryLocaleRef.current = currentLocale;
    fetchLocaleSummary(currentLocale, false);
  }, [currentLocale, fetchLocaleSummary]);

  /** v4 任务完成后读 Redis 缓存刷新当前语言汇总。 */
  useEffect(() => {
    return onTranslationStatsUpdated((detail) => {
      if (
        !currentLocale ||
        !sameTranslationLocale(detail.target, currentLocale)
      ) {
        return;
      }
      fetchLocaleSummary(currentLocale, false);
    });
  }, [currentLocale, fetchLocaleSummary]);

  useEffect(() => {
    if (summaryFetcher.state !== "idle" || !summaryFetcher.data) return;
    const data = summaryFetcher.data;
    if (data.success && data.response) {
      setLocaleSummary(data.response as LocaleSummary);
      if (pendingForceRefreshRef.current) {
        pendingForceRefreshRef.current = false;
        finishClientLogTrace(refreshStatsTraceRef.current, {
          status: "success",
          context: { locale: currentLocale },
        });
        refreshStatsTraceRef.current = null;
        shopify.toast.show(t("Translation statistics refreshed"));
      }
      return;
    }
    if (pendingForceRefreshRef.current) {
      pendingForceRefreshRef.current = false;
      finishClientLogTrace(refreshStatsTraceRef.current, {
        level: "warn",
        status: "failure",
        message: data?.errorMsg || "Failed to refresh statistics",
        context: { locale: currentLocale },
      });
      refreshStatsTraceRef.current = null;
      shopify.toast.show(t("Failed to refresh statistics"));
    }
  }, [summaryFetcher.data, summaryFetcher.state, currentLocale, t]);

  const handleShowWarnModal = () => {
    setShowWarnModal(true);
    reportClick("manage_navi_import");
  };

  const handleShowImportModal = () => {
    setShowModal(true);
    reportClick("manage_navi_import");
  };

  const navigateToPricing = () => {
    navigate("/app/pricing");
    void reportClientLog(
      {
        event: "manage_translation_to_pricing",
        action: "navigate_pricing",
        shop: globalStore?.shop,
        level: "info",
        kind: "event",
        status: "success",
        message: `${globalStore?.shop} 前往付费页面, 从翻译管理页面点击`,
        context: {
          legacy: true,
        },
      },
      { beacon: true },
    );
  };

  const handleRefreshStats = () => {
    if (!currentLocale || !source?.code) return;
    refreshStatsTraceRef.current = startClientLogTrace({
      event: "manage_refresh_statistics",
      action: "refresh_statistics",
      shop: globalStore?.shop,
      context: {
        locale: currentLocale,
        source: source.code,
      },
    });
    reportClick("manage_refresh_stats");
    fetchLocaleSummary(currentLocale, true);
  };

  const summaryDisplay = useMemo(() => {
    if (isSummaryLoading && !localeSummary) return t("Syncing");
    if (!localeSummary || localeSummary.locale !== currentLocale) return "—";
    if (localeSummary.total <= 0) return "—";
    const pct =
      localeSummary.percent != null ? ` (${localeSummary.percent}%)` : "";
    return `${localeSummary.translated.toLocaleString()} / ${localeSummary.total.toLocaleString()}${pct}`;
  }, [currentLocale, isSummaryLoading, localeSummary, t]);

  return (
    <Page>
      <TitleBar title={t("Manage Translation")} />
      <ScrollNotice
        text={t(
          "Welcome to our app! If you have any questions, feel free to email us at support@ciwi.ai, and we will respond as soon as possible.",
        )}
      />
      {loading || !!selectOptions?.length ? (
        <div className="manage-page">
          <div className="manage-page__inner">
            <Space
              direction="vertical"
              size="middle"
              style={{ display: "flex" }}
            >
              <AppPageHeader title={t("Manage Translation")} />
              <AppSectionCard bodyPadding="16px">
                <div className="manage-header">
                  <div className="manage-header-left">
                    <Text strong>{t("Localized content:")}</Text>
                    <Select
                      options={selectOptions}
                      value={currentLocale}
                      onChange={(value) => {
                        loadedSummaryLocaleRef.current = null;
                        setLocaleSummary(null);
                        setCurrentLocale(value);
                      }}
                      style={{ minWidth: "200px" }}
                    />
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={handleRefreshStats}
                      loading={isSummaryLoading}
                      disabled={!currentLocale || !source?.code}
                    >
                      {t("Refresh statistics")}
                    </Button>
                  </div>
                  <div className="manage-header-right">
                    {plan?.type == "Free" ||
                    plan?.type == "Basic" ||
                    typeof plan === "undefined" ? (
                      <Flex align="center" gap="middle">
                        <Popconfirm
                          title=""
                          description={t(
                            "This feature is available only with the paid plan.",
                          )}
                          trigger="hover"
                          showCancel={false}
                          okText={t("Upgrade")}
                          onConfirm={() => navigateToPricing()}
                        >
                          <InfoCircleOutlined />
                        </Popconfirm>
                        <Button
                          className={defaultStyles.Button_disable}
                          onClick={handleShowWarnModal}
                        >
                          {t("Import")}
                        </Button>
                      </Flex>
                    ) : (
                      <Button onClick={handleShowImportModal}>
                        {t("Import")}
                      </Button>
                    )}
                  </div>
                </div>
              </AppSectionCard>
              <AppSectionCard bodyPadding="16px 20px">
                <Flex align="center" gap={24} wrap="wrap">
                  <Flex vertical gap={4}>
                    <Text type="secondary">{t("Items Translated")}</Text>
                    <Text strong style={{ fontSize: 20 }}>
                      {summaryDisplay}
                    </Text>
                  </Flex>
                </Flex>
              </AppSectionCard>
              <div className="manage-content-wrap">
                <div className="manage-content-left">
                  <div className="manage-card-grid">
                    <ManageTranslationsCard
                      cardTitle={t("Products")}
                      dataSource={productsDataSource}
                      currentLocale={currentLocale}
                    />
                    <ManageTranslationsCard
                      cardTitle={t("Online Store Theme")}
                      dataSource={onlineStoreThemeDataSource}
                      currentLocale={currentLocale}
                    />
                    <ManageTranslationsCard
                      cardTitle={t("Online Store")}
                      dataSource={onlineStoreDataSource}
                      currentLocale={currentLocale}
                    />
                    <ManageTranslationsCard
                      cardTitle={t("Blogs and articles")}
                      dataSource={blogAndArticleDataSource}
                      currentLocale={currentLocale}
                    />
                    <ManageTranslationsCard
                      cardTitle={t("Images data")}
                      dataSource={imageDataSource}
                      currentLocale={currentLocale}
                    />
                    <ManageTranslationsCard
                      cardTitle={t("Settings")}
                      dataSource={settingsDataSource}
                      currentLocale={currentLocale}
                    />
                    <ManageTranslationsCard
                      cardTitle={t("Liquid & Third-Party Apps")}
                      dataSource={liquidAndThirdPartyAppsDataSource}
                      currentLocale={currentLocale}
                    />
                  </div>
                </div>
                {/* <div className="manage-content-right"></div> */}
              </div>
            </Space>
          </div>
        </div>
      ) : (
        <NoLanguageSetCard />
      )}
      <Modal
        title={t("How to import translation data")}
        open={showModal}
        onCancel={() => setShowModal(false)}
        centered
        footer={null}
      >
        <Space direction="vertical" size={"small"} style={{ width: "100%" }}>
          <Text>{t("Import steps:")}</Text>
          <Text>
            {t("1. Click to download the product import template")}{" "}
            <Button
              type="link"
              style={{
                padding: "0",
              }}
              onClick={() => {
                // 这里可以添加下载逻辑
                const link = document.createElement("a");
                link.href = "/Shop_translation.csv"; // 假设文件路径
                link.download = "Shop_translation.csv";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                void reportClientLog(
                  {
                    event: "manage_translation_download_template",
                    action: "download_template",
                    shop: globalStore?.shop,
                    level: "info",
                    kind: "event",
                    status: "success",
                    message: `${globalStore?.shop} 下载批量导入文件`,
                    context: {
                      legacy: true,
                      fileName: "Shop_translation.csv",
                    },
                  },
                  { beacon: true },
                );
              }}
            >
              Shop_translation.csv
            </Button>
          </Text>
          <Text>{t("2. Fill in the translated data in the template")}</Text>
          <Text>{t("3. Contact us to import the corresponding files")}</Text>
          <Flex justify="center">
            <Button
              style={{
                marginTop: "28px",
              }}
              type="primary"
              onClick={() => setShowModal(false)}
            >
              {t("Got it")}
            </Button>
          </Flex>
        </Space>
      </Modal>
      <Modal
        title={t("Feature Unavailable")}
        open={showWarnModal}
        onCancel={() => setShowWarnModal(false)}
        centered
        width={700}
        footer={
          <Button type="primary" onClick={() => navigate("/app/pricing")}>
            {t("Upgrade")}
          </Button>
        }
      >
        <Text>{t("This feature is available only with the paid plan.")}</Text>
      </Modal>
    </Page>
  );
};

export const getItemOptions = (t: (key: string) => string) => [
  { label: t("Products"), value: "product" },
  { label: t("Collection"), value: "collection" },
  { label: t("Json Template"), value: "json_template" },
  { label: t("Locale Content"), value: "locale_content" },
  { label: t("Section Group"), value: "section_group" },
  { label: t("Settings Category"), value: "settings_category" },
  { label: t("Settings Data Sections"), value: "settings_data_sections" },
  { label: t("Shop"), value: "shop" },
  { label: t("Metafield"), value: "metafield" },
  { label: t("Articles"), value: "article" },
  { label: t("Blog titles"), value: "blog" },
  { label: t("Pages"), value: "page" },
  { label: t("Filters"), value: "filter" },
  { label: t("Metaobjects"), value: "metaobject" },
  { label: t("Navigation"), value: "navigation" },
  { label: t("Email"), value: "email" },
  { label: t("Policies"), value: "policy" },
  { label: t("Product images"), value: "productImage" },
  { label: t("Product image alt text"), value: "productImageAlt" },
  { label: t("Delivery"), value: "delivery" },
  { label: t("Shipping"), value: "shipping" },
];

export default Index;
