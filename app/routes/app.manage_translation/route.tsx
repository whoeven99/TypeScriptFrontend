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
import { useDispatch, useSelector } from "react-redux";
import { TranslateImage, storageTranslateImage } from "~/api/JavaServer";
import {
  getItemsCountByLabel,
  invalidateAllItemsCountForLocale,
} from "~/server/translateV4/itemsCount.server";
import { authenticate } from "~/shopify.server";
import NoLanguageSetCard from "~/components/noLanguageSetCard";
import {
  updateData,
  clearLocaleStats,
} from "~/store/modules/languageItemsData";
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

/** 汇总页各卡片对应的 itemsCount resourceType（与 action 请求一致）。 */
const ITEMS_COUNT_RESOURCE_TYPES = [
  "Products",
  "Collection",
  "Article",
  "Blog titles",
  "Pages",
  "Filters",
  "Metaobjects",
  "Navigation",
  "Notifications",
  "Policies",
  "Shop",
  "Store metadata",
  "Theme",
  "Delivery",
  "Shipping",
] as const;

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
  const refreshItemsCountTarget = formData.get("refreshItemsCountTarget");
  if (typeof refreshItemsCountTarget === "string" && refreshItemsCountTarget) {
    try {
      // 与管理翻译/v4 共用 Redis：tsf:items_count:{shop}:{locale}（见 itemsCountRedisKey）
      await invalidateAllItemsCountForLocale(shop, refreshItemsCountTarget);
      return { success: true, errorCode: 0, errorMsg: "", response: null };
    } catch (error) {
      console.error("Error manage_translation refreshItemsCount:", error);
      return {
        success: false,
        errorCode: 10001,
        errorMsg: "SERVER_ERROR",
        response: null,
      };
    }
  }

  const appInstalls = safeParseFormJson(formData.get("appInstalls"));
  const itemsCount = safeParseFormJson(formData.get("itemsCount"));
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
        console.error("Error manage_translation appInstalls:", error);
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
        console.error("Error manage_translation itemsCount:", error);
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

const Index = () => {
  const { searchTerm } = useLoaderData<typeof loader>();

  const dispatch = useDispatch();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { plan } = useSelector((state: any) => state.userConfig);

  const { reportClick } = useReport();

  const { source } = useSelector((state: any) => state.userConfig);

  const languageTableData: LanguagesDataType[] = useSelector(
    (state: any) => state.languageTableData.rows,
  );

  const languageItemsData = useSelector(
    (state: any) => state.languageItemsData,
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
  const [appInstallList, setAppInstallList] = useState<{
    pagefly: boolean;
  }>({
    pagefly: false,
  });

  const appFetcher = useFetcher<any>();
  const productsFetcher = useFetcher<any>();
  const collectionsFetcher = useFetcher<any>();
  const articlesFetcher = useFetcher<any>();
  const blog_titlesFetcher = useFetcher<any>();
  const pagesFetcher = useFetcher<any>();
  const filtersFetcher = useFetcher<any>();
  const metaobjectsFetcher = useFetcher<any>();
  const navigationFetcher = useFetcher<any>();
  const emailFetcher = useFetcher<any>();
  const policiesFetcher = useFetcher<any>();
  const shopFetcher = useFetcher<any>();
  const store_metadataFetcher = useFetcher<any>();
  const themeFetcher = useFetcher<any>();
  const deliveryFetcher = useFetcher<any>();
  const shippingFetcher = useFetcher<any>();
  const refreshStatsFetcher = useFetcher<any>();

  const [isRefreshingStats, setIsRefreshingStats] = useState(false);
  const pendingRefreshStatsRef = useRef(false);
  const refreshStatsTraceRef = useRef<ClientLogTrace | null>(null);
  /** 刷新统计：等 Products（首个本地重算）完成后再 toast，避免假成功。 */
  const refreshAwaitingProductsRef = useRef(false);
  /** 切换语言或重复 effect 时作废进行中的错峰拉取。 */
  const itemsCountLoadTokenRef = useRef(0);
  const loadedItemsCountLocaleRef = useRef<string | null>(null);

  const itemsCountFetcherByType = useMemo(
    () => ({
      Products: productsFetcher,
      Collection: collectionsFetcher,
      Article: articlesFetcher,
      "Blog titles": blog_titlesFetcher,
      Pages: pagesFetcher,
      Filters: filtersFetcher,
      Metaobjects: metaobjectsFetcher,
      Navigation: navigationFetcher,
      Notifications: emailFetcher,
      Policies: policiesFetcher,
      Shop: shopFetcher,
      "Store metadata": store_metadataFetcher,
      Theme: themeFetcher,
      Delivery: deliveryFetcher,
      Shipping: shippingFetcher,
    }),
    [
      productsFetcher,
      collectionsFetcher,
      articlesFetcher,
      blog_titlesFetcher,
      pagesFetcher,
      filtersFetcher,
      metaobjectsFetcher,
      navigationFetcher,
      emailFetcher,
      policiesFetcher,
      shopFetcher,
      store_metadataFetcher,
      themeFetcher,
      deliveryFetcher,
      shippingFetcher,
    ],
  );

  const fetchAllItemsCounts = useCallback(
    (target: string, sourceCode: string, forceRefresh = false) => {
      if (!target || !sourceCode) return;
      const loadToken = ++itemsCountLoadTokenRef.current;
      const batches = forceRefresh
        ? [ITEMS_COUNT_RESOURCE_TYPES]
        : [
            ITEMS_COUNT_PRIORITY_RESOURCE_TYPES,
            ITEMS_COUNT_DEFERRED_RESOURCE_TYPES,
          ];

      void (async () => {
        for (const [batchIndex, batch] of batches.entries()) {
          for (const resourceType of batch) {
            if (itemsCountLoadTokenRef.current !== loadToken) return;

            const fetcher =
              itemsCountFetcherByType[
                resourceType as keyof typeof itemsCountFetcherByType
              ];
            const formData = new FormData();
            formData.append(
              "itemsCount",
              JSON.stringify({
                source: sourceCode,
                target,
                resourceType,
                ...(forceRefresh ? { forceRefresh: true } : {}),
              }),
            );
            fetcher.submit(formData, {
              method: "post",
              action: "/app/manage_translation",
            });

            await new Promise((resolve) =>
              setTimeout(resolve, ITEMS_COUNT_SUBMIT_GAP_MS),
            );
          }

          if (
            !forceRefresh &&
            batchIndex < batches.length - 1 &&
            itemsCountLoadTokenRef.current === loadToken
          ) {
            await new Promise((resolve) =>
              setTimeout(resolve, ITEMS_COUNT_BATCH_GAP_MS),
            );
          }
        }
      })();
    },
    [itemsCountFetcherByType],
  );

  const productsDataSource: TableDataType[] = [
    {
      key: "products",
      title: t("Products"),
      allTranslatedItems:
        languageItemsData.find(
          (item: any) =>
            item?.language === currentLocale && item?.type === "PRODUCT",
        )?.translatedNumber ?? undefined,
      allItems:
        languageItemsData.find(
          (item: any) =>
            item?.language === currentLocale && item?.type === "PRODUCT",
        )?.totalNumber ?? undefined,
      sync_status: true,
      navigation: "product",
      withoutCount: false,
    },
    {
      key: "collections",
      title: t("Collections"),
      allTranslatedItems:
        languageItemsData.find(
          (item: any) =>
            item?.language === currentLocale && item?.type === "COLLECTION",
        )?.translatedNumber ?? undefined,
      allItems:
        languageItemsData.find(
          (item: any) =>
            item?.language === currentLocale && item?.type === "COLLECTION",
        )?.totalNumber ?? undefined,
      sync_status: true,
      navigation: "collection",
      withoutCount: false,
    },
  ];

  const onlineStoreThemeDataSource: TableDataType[] = [
    {
      key: "locale_content",
      title: t("Locale Content"),
      allTranslatedItems:
        languageItemsData.find(
          (item: any) =>
            item?.language === currentLocale &&
            item?.type === "ONLINE_STORE_THEME",
        )?.translatedNumber ?? undefined,
      allItems:
        languageItemsData.find(
          (item: any) =>
            item?.language === currentLocale &&
            item?.type === "ONLINE_STORE_THEME",
        )?.totalNumber ?? undefined,
      sync_status: false,
      navigation: "locale_content",
      withoutCount: false,
    },
    {
      key: "json_template",
      title: t("Json Template"),
      sync_status: false,
      navigation: "json_template",
      withoutCount: true,
    },
    {
      key: "section_group",
      title: t("Section Group"),
      sync_status: false,
      navigation: "section_group",
      withoutCount: true,
    },
    {
      key: "settings_category",
      title: t("Settings Category"),
      sync_status: false,
      navigation: "settings_category",
      withoutCount: true,
    },
    {
      key: "settings_data_sections",
      title: t("Settings Data Sections"),
      sync_status: false,
      navigation: "settings_data_sections",
      withoutCount: true,
    },
  ];

  const onlineStoreDataSource: TableDataType[] = [
    {
      key: "shop",
      title: t("Shop"),
      allTranslatedItems:
        languageItemsData.find(
          (item: any) =>
            item?.language === currentLocale && item?.type === "SHOP",
        )?.translatedNumber ?? undefined,
      allItems:
        languageItemsData.find(
          (item: any) =>
            item?.language === currentLocale && item?.type === "SHOP",
        )?.totalNumber ?? undefined,
      sync_status: false,
      navigation: "shop",
      withoutCount: false,
    },
    {
      key: "pages",
      title: t("Pages"),
      allTranslatedItems:
        languageItemsData.find(
          (item: any) =>
            item?.language === currentLocale && item?.type === "PAGE",
        )?.translatedNumber ?? undefined,
      allItems:
        languageItemsData.find(
          (item: any) =>
            item?.language === currentLocale && item?.type === "PAGE",
        )?.totalNumber ?? undefined,
      sync_status: false,
      navigation: "page",
      withoutCount: false,
    },
    {
      key: "metaobjects",
      title: t("Metaobjects"),
      allTranslatedItems:
        languageItemsData.find(
          (item: any) =>
            item?.language === currentLocale && item?.type === "METAOBJECT",
        )?.translatedNumber ?? undefined,
      allItems:
        languageItemsData.find(
          (item: any) =>
            item?.language === currentLocale && item?.type === "METAOBJECT",
        )?.totalNumber ?? undefined,
      sync_status: false,
      navigation: "metaobject",
      withoutCount: false,
    },
    {
      key: "navigation",
      title: t("Navigation"),
      allTranslatedItems:
        languageItemsData.find(
          (item: any) =>
            item?.language === currentLocale && item?.type === "LINK",
        )?.translatedNumber ?? undefined,
      allItems:
        languageItemsData.find(
          (item: any) =>
            item?.language === currentLocale && item?.type === "LINK",
        )?.totalNumber ?? undefined,
      sync_status: false,
      navigation: "navigation",
      withoutCount: false,
    },
    {
      key: "store_metadata",
      title: t("Metafield"),
      allTranslatedItems:
        languageItemsData.find(
          (item: any) =>
            item?.language === currentLocale && item?.type === "METAFIELD",
        )?.translatedNumber ?? undefined,
      allItems:
        languageItemsData.find(
          (item: any) =>
            item?.language === currentLocale && item?.type === "METAFIELD",
        )?.totalNumber ?? undefined,
      sync_status: false,
      navigation: "metafield",
      withoutCount: false,
    },
  ];

  const blogAndArticleDataSource: TableDataType[] = [
    {
      key: "articles",
      title: t("Articles"),
      allTranslatedItems:
        languageItemsData.find(
          (item: any) =>
            item?.language === currentLocale && item?.type === "ARTICLE",
        )?.translatedNumber ?? undefined,
      allItems:
        languageItemsData.find(
          (item: any) =>
            item?.language === currentLocale && item?.type === "ARTICLE",
        )?.totalNumber ?? undefined,
      sync_status: false,
      navigation: "article",
      withoutCount: false,
    },
    {
      key: "blog_titles",
      title: t("Blog titles"),
      allTranslatedItems:
        languageItemsData.find(
          (item: any) =>
            item?.language === currentLocale && item?.type === "BLOG",
        )?.translatedNumber ?? undefined,
      allItems:
        languageItemsData.find(
          (item: any) =>
            item?.language === currentLocale && item?.type === "BLOG",
        )?.totalNumber ?? undefined,
      sync_status: false,
      navigation: "blog",
      withoutCount: false,
    },
  ];

  const imageDataSource: TableDataType[] = [
    {
      key: "product_images",
      title: t("Product images"),
      sync_status: false,
      navigation: "productImage",
      withoutCount: true,
    },
    {
      key: "product_image_alt",
      title: t("Product image alt text"),
      sync_status: false,
      navigation: "productImageAlt",
      withoutCount: true,
    },
  ];

  const settingsDataSource: TableDataType[] = [
    {
      key: "policies",
      title: t("Policies"),
      allTranslatedItems:
        languageItemsData.find(
          (item: any) =>
            item?.language === currentLocale && item?.type === "SHOP_POLICY",
        )?.translatedNumber ?? undefined,
      allItems:
        languageItemsData.find(
          (item: any) =>
            item?.language === currentLocale && item?.type === "SHOP_POLICY",
        )?.totalNumber ?? undefined,
      sync_status: false,
      navigation: "policy",
      withoutCount: false,
    },
    {
      key: "email",
      title: t("Email"),
      allTranslatedItems:
        languageItemsData.find(
          (item: any) =>
            item?.language === currentLocale && item?.type === "EMAIL_TEMPLATE",
        )?.translatedNumber ?? undefined,
      allItems:
        languageItemsData.find(
          (item: any) =>
            item?.language === currentLocale && item?.type === "EMAIL_TEMPLATE",
        )?.totalNumber ?? undefined,
      sync_status: false,
      navigation: "email",
      withoutCount: false,
    },
    {
      key: "shipping",
      title: t("Shipping"),
      allTranslatedItems:
        languageItemsData.find(
          (item: any) =>
            item?.language === currentLocale &&
            item?.type === "PACKING_SLIP_TEMPLATE",
        )?.translatedNumber ?? undefined,
      allItems:
        languageItemsData.find(
          (item: any) =>
            item?.language === currentLocale &&
            item?.type === "PACKING_SLIP_TEMPLATE",
        )?.totalNumber ?? undefined,
      sync_status: false,
      navigation: "shipping",
      withoutCount: false,
    },
    {
      key: "delivery",
      title: t("Delivery"),
      allTranslatedItems:
        languageItemsData.find(
          (item: any) =>
            item?.language === currentLocale &&
            item?.type === "DELIVERY_METHOD_DEFINITION",
        )?.translatedNumber ?? undefined,
      allItems:
        languageItemsData.find(
          (item: any) =>
            item?.language === currentLocale &&
            item?.type === "DELIVERY_METHOD_DEFINITION",
        )?.totalNumber ?? undefined,
      sync_status: false,
      navigation: "delivery",
      withoutCount: false,
    },
  ];

  const liquidAndThirdPartyAppsDataSource: TableDataType[] = useMemo(() => {
    const list: TableDataType[] = [
      {
        key: "custom_liquid",
        title: t("Custom Liquid"),
        sync_status: false,
        navigation: "custom_liquid",
        withoutCount: true,
      },
    ];

    if (appInstallList.pagefly) {
      list.push({
        key: "pagefly",
        title: t("PageFly"),
        sync_status: false,
        navigation: "pagefly",
        withoutCount: true,
      });
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
    if (productsFetcher.data) {
      if (
        productsFetcher.data?.success &&
        productsFetcher.data?.response?.length > 0
      ) {
        dispatch(updateData(productsFetcher.data?.response));
      }
    }
  }, [dispatch, productsFetcher.data]);

  useEffect(() => {
    if (collectionsFetcher.data) {
      if (
        collectionsFetcher.data?.success &&
        collectionsFetcher.data?.response?.length > 0
      ) {
        dispatch(updateData(collectionsFetcher.data?.response));
      }
    }
  }, [dispatch, collectionsFetcher.data]);

  useEffect(() => {
    if (articlesFetcher.data) {
      if (
        articlesFetcher.data?.success &&
        articlesFetcher.data?.response?.length > 0
      ) {
        dispatch(updateData(articlesFetcher.data?.response));
      }
    }
  }, [dispatch, articlesFetcher.data]);

  useEffect(() => {
    if (blog_titlesFetcher.data) {
      if (
        blog_titlesFetcher.data?.success &&
        blog_titlesFetcher.data?.response?.length > 0
      ) {
        dispatch(updateData(blog_titlesFetcher.data?.response));
      }
    }
  }, [dispatch, blog_titlesFetcher.data]);

  useEffect(() => {
    if (pagesFetcher.data) {
      if (
        pagesFetcher.data?.success &&
        pagesFetcher.data?.response?.length > 0
      ) {
        dispatch(updateData(pagesFetcher.data?.response));
      }
    }
  }, [dispatch, pagesFetcher.data]);

  useEffect(() => {
    if (filtersFetcher.data) {
      if (
        filtersFetcher.data?.success &&
        filtersFetcher.data?.response?.length > 0
      ) {
        dispatch(updateData(filtersFetcher.data?.response));
      }
    }
  }, [dispatch, filtersFetcher.data]);

  useEffect(() => {
    if (metaobjectsFetcher.data) {
      if (
        metaobjectsFetcher.data?.success &&
        metaobjectsFetcher.data?.response?.length > 0
      ) {
        dispatch(updateData(metaobjectsFetcher.data?.response));
      }
    }
  }, [dispatch, metaobjectsFetcher.data]);

  useEffect(() => {
    if (emailFetcher.data) {
      if (
        emailFetcher.data?.success &&
        emailFetcher.data?.response?.length > 0
      ) {
        dispatch(updateData(emailFetcher.data?.response));
      }
    }
  }, [dispatch, emailFetcher.data]);

  useEffect(() => {
    if (navigationFetcher.data) {
      if (
        navigationFetcher.data?.success &&
        navigationFetcher.data?.response?.length > 0
      ) {
        dispatch(updateData(navigationFetcher.data?.response));
      }
    }
  }, [dispatch, navigationFetcher.data]);

  useEffect(() => {
    if (policiesFetcher.data) {
      if (
        policiesFetcher.data?.success &&
        policiesFetcher.data?.response?.length > 0
      ) {
        dispatch(updateData(policiesFetcher.data?.response));
      }
    }
  }, [dispatch, policiesFetcher.data]);

  useEffect(() => {
    if (shopFetcher.data) {
      if (shopFetcher.data?.success && shopFetcher.data?.response?.length > 0) {
        dispatch(updateData(shopFetcher.data?.response));
      }
    }
  }, [dispatch, shopFetcher.data]);

  useEffect(() => {
    if (store_metadataFetcher.data) {
      if (
        store_metadataFetcher.data?.success &&
        store_metadataFetcher.data?.response?.length > 0
      ) {
        dispatch(updateData(store_metadataFetcher.data?.response));
      }
    }
  }, [dispatch, store_metadataFetcher.data]);

  useEffect(() => {
    if (themeFetcher.data) {
      if (
        themeFetcher.data?.success &&
        themeFetcher.data?.response?.length > 0
      ) {
        dispatch(updateData(themeFetcher.data?.response));
      }
    }
  }, [dispatch, themeFetcher.data]);

  useEffect(() => {
    if (deliveryFetcher.data) {
      if (
        deliveryFetcher.data?.success &&
        deliveryFetcher.data?.response?.length > 0
      ) {
        dispatch(updateData(deliveryFetcher.data?.response));
      }
    }
  }, [dispatch, deliveryFetcher.data]);

  useEffect(() => {
    if (shippingFetcher.data) {
      if (
        shippingFetcher.data?.success &&
        shippingFetcher.data?.response?.length > 0
      ) {
        dispatch(updateData(shippingFetcher.data.response));
      }
    }
  }, [dispatch, shippingFetcher.data]);

  useEffect(() => {
    const sourceCode = source?.code;
    if (!sourceCode || !currentLocale) return;
    if (loadedItemsCountLocaleRef.current === currentLocale) return;
    loadedItemsCountLocaleRef.current = currentLocale;
    fetchAllItemsCounts(currentLocale, sourceCode);
  }, [currentLocale, source?.code, fetchAllItemsCounts]);

  /** v4 任务完成后读 Redis 缓存刷新当前语言统计（无需点「刷新统计」）。 */
  useEffect(() => {
    const sourceCode = source?.code;
    if (!sourceCode) return;
    return onTranslationStatsUpdated((detail) => {
      if (
        !currentLocale ||
        !sameTranslationLocale(detail.target, currentLocale)
      ) {
        return;
      }
      fetchAllItemsCounts(currentLocale, sourceCode, false);
    });
  }, [currentLocale, source?.code, fetchAllItemsCounts]);

  useEffect(() => {
    if (!pendingRefreshStatsRef.current) return;
    if (refreshStatsFetcher.state !== "idle" || !refreshStatsFetcher.data) {
      return;
    }
    pendingRefreshStatsRef.current = false;
    if (refreshStatsFetcher.data.success && currentLocale && source?.code) {
      dispatch(clearLocaleStats(currentLocale));
      loadedItemsCountLocaleRef.current = null;
      refreshAwaitingProductsRef.current = true;
      fetchAllItemsCounts(currentLocale, source.code, true);
    } else {
      finishClientLogTrace(refreshStatsTraceRef.current, {
        level: "warn",
        status: "failure",
        message:
          refreshStatsFetcher.data?.errorMsg || "Failed to refresh statistics",
        context: {
          locale: currentLocale,
        },
      });
      refreshStatsTraceRef.current = null;
      shopify.toast.show(t("Failed to refresh statistics"));
      setIsRefreshingStats(false);
    }
  }, [
    refreshStatsFetcher.data,
    refreshStatsFetcher.state,
    currentLocale,
    source?.code,
    fetchAllItemsCounts,
    dispatch,
    t,
  ]);

  useEffect(() => {
    if (!refreshAwaitingProductsRef.current) return;
    if (productsFetcher.state !== "idle") return;
    refreshAwaitingProductsRef.current = false;
    setIsRefreshingStats(false);
    if (productsFetcher.data?.success) {
      finishClientLogTrace(refreshStatsTraceRef.current, {
        status: "success",
        context: {
          locale: currentLocale,
        },
      });
      refreshStatsTraceRef.current = null;
      shopify.toast.show(t("Translation statistics refreshed"));
    } else {
      finishClientLogTrace(refreshStatsTraceRef.current, {
        level: "warn",
        status: "failure",
        message: "Products statistics refresh failed",
        context: {
          locale: currentLocale,
        },
      });
      refreshStatsTraceRef.current = null;
      shopify.toast.show(t("Failed to refresh statistics"));
    }
  }, [productsFetcher.state, productsFetcher.data, currentLocale, t]);

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
    setIsRefreshingStats(true);
    pendingRefreshStatsRef.current = true;
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
    const formData = new FormData();
    formData.append("refreshItemsCountTarget", currentLocale);
    refreshStatsFetcher.submit(formData, {
      method: "post",
      action: "/app/manage_translation",
    });
  };

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
                      onChange={(value) => setCurrentLocale(value)}
                      style={{ minWidth: "200px" }}
                    />
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={handleRefreshStats}
                      loading={
                        isRefreshingStats ||
                        refreshStatsFetcher.state !== "idle"
                      }
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
