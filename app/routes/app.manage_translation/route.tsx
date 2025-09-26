import { TitleBar } from "@shopify/app-bridge-react";
import { Icon, Page } from "@shopify/polaris";
import {
  Space,
  Select,
  Typography,
  Button,
  Table,
  Card,
  Popconfirm,
  Flex,
  Modal,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import "./styles.css";
import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import { queryShopLanguages } from "~/api/admin";
import { ShopLocalesType } from "../app.language/route";
import {
  useFetcher,
  useLoaderData,
  useLocation,
  useNavigate,
} from "@remix-run/react";
import { useDispatch, useSelector } from "react-redux";
import { setSelectLanguageData } from "~/store/modules/selectLanguageData";
import {
  GetTranslationItemsInfo,
  TranslateImage,
  storageTranslateImage,
} from "~/api/JavaServer";
import { authenticate } from "~/shopify.server";
import NoLanguageSetCard from "~/components/noLanguageSetCard";
import { updateData } from "~/store/modules/languageItemsData";
import { useTranslation } from "react-i18next";
import ManageTranslationsCard from "./components/manageTranslationsCard";
import ScrollNotice from "~/components/ScrollNotice";
import { setTableData } from "~/store/modules/languageTableData";
import { InfoCircleOutlined } from "@ant-design/icons";
import defaultStyles from "../styles/defaultStyles.module.css";
import useReport from "scripts/eventReport";
import { setLocale } from "~/store/modules/userConfig";
import { globalStore } from "~/globalStore";

const { Text, Title } = Typography;

interface ManageSelectDataType {
  label: string;
  value: string;
}

interface TableDataType {
  key: string;
  title: string;
  allTranslatedItems: number;
  allItems: number;
  sync_status: boolean;
  navigation: string;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const searchTerm = url.searchParams.get("language");

  return json({
    searchTerm: searchTerm || "",
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;

  const formData = await request.formData();
  const language = JSON.parse(formData.get("language") as string);
  const itemsCount = JSON.parse(formData.get("itemsCount") as string);
  const translateImage = JSON.parse(formData.get("translateImage") as string);
  const replaceTranslateImage = JSON.parse(
    formData.get("replaceTranslateImage") as string,
  );
  const replaceTranslateFile = JSON.parse(
    formData.get("replaceTranslateFile") as string,
  );
  switch (true) {
    case !!language:
      try {
        const shopLanguages: ShopLocalesType[] = await queryShopLanguages({
          shop,
          accessToken: accessToken as string,
        });
        return json({ data: shopLanguages });
      } catch (error) {
        console.error("Error manage_translation language:", error);
      }
    case !!itemsCount:
      try {
        const data = await GetTranslationItemsInfo({
          shop,
          accessToken,
          source: itemsCount.source,
          target: itemsCount.target,
          resourceType: itemsCount.resourceType,
        });
        return data;
      } catch (error) {
        console.error("Error manage_translation itemsCount:", error);
        return {
          success: false,
          errorCode: 10001,
          errorMsg: "SERVER_ERROR",
          response: [],
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
          response: [],
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
          response: [],
        };
      }

    default:
      // 你可以在这里处理一个默认的情况，如果没有符合的条件
      return json({ success: false, message: "Invalid data" });
  }
};

const Index = () => {
  const { searchTerm } = useLoaderData<typeof loader>();

  const navigate = useNavigate();
  const { plan } = useSelector((state: any) => state.userConfig);

  const [selectOptions, setSelectOptions] = useState<ManageSelectDataType[]>(
    [],
  );
  const [primaryLanguage, setPrimaryLanguage] = useState<string>();
  const [current, setCurrent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const location = useLocation();
  const [showModal, setShowModal] = useState(false);
  const [showWarnModal, setShowWarnModal] = useState(false);

  const { key } = useMemo(() => location.state || {}, [location.state]);
  const languageItemsData = useSelector(
    (state: any) => state.languageItemsData,
  );

  const fetcher = useFetcher<any>();
  const languageFetcher = useFetcher<any>();
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
  const { reportClick } = useReport();
  const productsDataSource: TableDataType[] = [
    {
      key: "products",
      title: t("Products"),
      allTranslatedItems:
        languageItemsData.find(
          (item: any) => item?.language === current && item?.type === "PRODUCT",
        )?.translatedNumber ?? undefined,
      allItems:
        languageItemsData.find(
          (item: any) => item?.language === current && item?.type === "PRODUCT",
        )?.totalNumber ?? undefined,
      sync_status: true,
      navigation: "product",
    },
    {
      key: "collections",
      title: t("Collections"),
      allTranslatedItems:
        languageItemsData.find(
          (item: any) =>
            item?.language === current && item?.type === "COLLECTION",
        )?.translatedNumber ?? undefined,
      allItems:
        languageItemsData.find(
          (item: any) =>
            item?.language === current && item?.type === "COLLECTION",
        )?.totalNumber ?? undefined,
      sync_status: true,
      navigation: "collection",
    },
  ];

  const onlineStoreDataSource: TableDataType[] = [
    {
      key: "shop",
      title: t("Shop"),
      allTranslatedItems:
        languageItemsData.find(
          (item: any) => item?.language === current && item?.type === "SHOP",
        )?.translatedNumber ?? undefined,
      allItems:
        languageItemsData.find(
          (item: any) => item?.language === current && item?.type === "SHOP",
        )?.totalNumber ?? undefined,
      sync_status: false,
      navigation: "shop",
    },
    {
      key: "theme",
      title: t("Theme"),
      allTranslatedItems:
        languageItemsData.find(
          (item: any) =>
            item?.language === current && item?.type === "ONLINE_STORE_THEME",
        )?.translatedNumber ?? undefined,
      allItems:
        languageItemsData.find(
          (item: any) =>
            item?.language === current && item?.type === "ONLINE_STORE_THEME",
        )?.totalNumber ?? undefined,
      sync_status: false,
      navigation: "theme",
    },
    {
      key: "pages",
      title: t("Pages"),
      allTranslatedItems:
        languageItemsData.find(
          (item: any) => item?.language === current && item?.type === "PAGE",
        )?.translatedNumber ?? undefined,
      allItems:
        languageItemsData.find(
          (item: any) => item?.language === current && item?.type === "PAGE",
        )?.totalNumber ?? undefined,
      sync_status: false,
      navigation: "page",
    },
    // {
    //   key: "filters",
    //   title: t("Filters"),
    //   allTranslatedItems:
    //     languageItemsData.find(
    //       (item: any) => item?.language === current && item?.type === "FILTER",
    //     )?.translatedNumber ?? undefined,
    //   allItems:
    //     languageItemsData.find(
    //       (item: any) => item?.language === current && item?.type === "FILTER",
    //     )?.totalNumber ?? undefined,
    //   sync_status: false,
    //   navigation: "filter",
    // },
    {
      key: "metaobjects",
      title: t("Metaobjects"),
      allTranslatedItems:
        languageItemsData.find(
          (item: any) =>
            item?.language === current && item?.type === "METAOBJECT",
        )?.translatedNumber ?? undefined,
      allItems:
        languageItemsData.find(
          (item: any) =>
            item?.language === current && item?.type === "METAOBJECT",
        )?.totalNumber ?? undefined,
      sync_status: false,
      navigation: "metaobject",
    },
    // {
    //   key: "navigation",
    //   title: t("Navigation"),
    //   allTranslatedItems:
    //     languageItemsData.find(
    //       (item: any) => item?.language === current && item?.type === "LINK",
    //     )?.translatedNumber ?? undefined,
    //   allItems:
    //     languageItemsData.find(
    //       (item: any) => item?.language === current && item?.type === "LINK",
    //     )?.totalNumber ?? undefined,
    //   sync_status: false,
    //   navigation: "navigation",
    // },
    {
      key: "store_metadata",
      title: t("Store metadata"),
      allTranslatedItems:
        languageItemsData.find(
          (item: any) =>
            item?.language === current && item?.type === "METAFIELD",
        )?.translatedNumber ?? undefined,
      allItems:
        languageItemsData.find(
          (item: any) =>
            item?.language === current && item?.type === "METAFIELD",
        )?.totalNumber ?? undefined,
      sync_status: false,
      navigation: "metafield",
    },
  ];

  const blogAndArticleDataSource = [
    {
      key: "articles",
      title: t("Articles"),
      allTranslatedItems:
        languageItemsData.find(
          (item: any) => item?.language === current && item?.type === "ARTICLE",
        )?.translatedNumber ?? undefined,
      allItems:
        languageItemsData.find(
          (item: any) => item?.language === current && item?.type === "ARTICLE",
        )?.totalNumber ?? undefined,
      sync_status: false,
      navigation: "article",
    },
    {
      key: "blog_titles",
      title: t("Blog titles"),
      allTranslatedItems:
        languageItemsData.find(
          (item: any) => item?.language === current && item?.type === "BLOG",
        )?.translatedNumber ?? undefined,
      allItems:
        languageItemsData.find(
          (item: any) => item?.language === current && item?.type === "BLOG",
        )?.totalNumber ?? undefined,
      sync_status: false,
      navigation: "blog",
    },
  ];

  const imageDataSource = [
    {
      key: "product_images",
      title: t("Product images"),
      sync_status: false,
      navigation: "productImage",
    },
    {
      key: "product_image_alt",
      title: t("Product image alt text"),
      sync_status: false,
      navigation: "productImageAlt",
    },
  ];

  const settingsDataSource: TableDataType[] = [
    {
      key: "policies",
      title: t("Policies"),
      allTranslatedItems:
        languageItemsData.find(
          (item: any) =>
            item?.language === current && item?.type === "SHOP_POLICY",
        )?.translatedNumber ?? undefined,
      allItems:
        languageItemsData.find(
          (item: any) =>
            item?.language === current && item?.type === "SHOP_POLICY",
        )?.totalNumber ?? undefined,
      sync_status: false,
      navigation: "policy",
    },
    // {
    //   key: "email",
    //   title: t("Email"),
    //   allTranslatedItems:
    //     languageItemsData.find(
    //       (item: any) =>
    //         item?.language === current && item?.type === "EMAIL_TEMPLATE",
    //     )?.translatedNumber ?? undefined,
    //   allItems:
    //     languageItemsData.find(
    //       (item: any) =>
    //         item?.language === current && item?.type === "EMAIL_TEMPLATE",
    //     )?.totalNumber ?? undefined,
    //   sync_status: false,
    //   navigation: "email",
    // },
    {
      key: "shipping",
      title: t("Shipping"),
      allTranslatedItems:
        languageItemsData.find(
          (item: any) =>
            item?.language === current &&
            item?.type === "PACKING_SLIP_TEMPLATE",
        )?.translatedNumber ?? undefined,
      allItems:
        languageItemsData.find(
          (item: any) =>
            item?.language === current &&
            item?.type === "PACKING_SLIP_TEMPLATE",
        )?.totalNumber ?? undefined,
      sync_status: false,
      navigation: "shipping",
    },
    {
      key: "delivery",
      title: t("Delivery"),
      allTranslatedItems:
        languageItemsData.find(
          (item: any) =>
            item?.language === current &&
            item?.type === "DELIVERY_METHOD_DEFINITION",
        )?.translatedNumber ?? undefined,
      allItems:
        languageItemsData.find(
          (item: any) =>
            item?.language === current &&
            item?.type === "DELIVERY_METHOD_DEFINITION",
        )?.totalNumber ?? undefined,
      sync_status: false,
      navigation: "delivery",
    },
  ];
  const handleShowWarnModal = () => {
    setShowWarnModal(true);
    reportClick("manage_navi_import");
  };
  const handleShowImportModal = () => {
    setShowModal(true);
    reportClick("manage_navi_import");
  };

  useEffect(() => {
    languageFetcher.submit(
      {
        language: JSON.stringify(true),
      },
      {
        method: "post",
        action: "/app/manage_translation",
      },
    );
    fetcher.submit(
      {
        log: `${globalStore?.shop} 目前在翻译管理页面`,
      },
      {
        method: "POST",
        action: "/log",
      },
    );
  }, []);

  useEffect(() => {
    if (languageFetcher.data) {
      if (languageFetcher.data.data) {
        const shopLanguages = languageFetcher.data.data;
        const primaryLanguage = shopLanguages.filter(
          (language: ShopLocalesType) => language.primary,
        );
        setPrimaryLanguage(primaryLanguage[0].locale);
        const newArray = shopLanguages
          .filter((language: ShopLocalesType) => !language.primary)
          .map((language: ShopLocalesType) => ({
            label: language.name,
            value: language.locale,
          }));
        setSelectOptions(newArray);
        if (!searchTerm) {
          setCurrent(newArray[0]?.value);
        } else {
          setCurrent(searchTerm);
        }
        dispatch(
          setTableData(
            shopLanguages.map((language: ShopLocalesType, index: number) => ({
              key: language.locale,
              language: language.name,
              locale: language.locale,
              primary: language.primary,
              published: language.published,
            })),
          ),
        );
        setLoading(false);
        const locale = shopLanguages.find(
          (language: ShopLocalesType) => language.primary === true,
        )?.locale;
        dispatch(setLocale({ locale: locale || "" }));
      }
    }
  }, [languageFetcher.data]);

  useEffect(() => {
    if (productsFetcher.data) {
      if (
        productsFetcher.data?.success &&
        productsFetcher.data?.response?.length > 0
      ) {
        dispatch(updateData(productsFetcher.data?.response));
      }
    }
  }, [productsFetcher.data]);

  useEffect(() => {
    if (collectionsFetcher.data) {
      if (
        collectionsFetcher.data?.success &&
        collectionsFetcher.data?.response?.length > 0
      ) {
        dispatch(updateData(collectionsFetcher.data?.response));
      }
    }
  }, [collectionsFetcher.data]);

  useEffect(() => {
    if (articlesFetcher.data) {
      if (
        articlesFetcher.data?.success &&
        articlesFetcher.data?.response?.length > 0
      ) {
        dispatch(updateData(articlesFetcher.data?.response));
      }
    }
  }, [articlesFetcher.data]);

  useEffect(() => {
    if (blog_titlesFetcher.data) {
      if (
        blog_titlesFetcher.data?.success &&
        blog_titlesFetcher.data?.response?.length > 0
      ) {
        dispatch(updateData(blog_titlesFetcher.data?.response));
      }
    }
  }, [blog_titlesFetcher.data]);

  useEffect(() => {
    if (pagesFetcher.data) {
      if (
        pagesFetcher.data?.success &&
        pagesFetcher.data?.response?.length > 0
      ) {
        dispatch(updateData(pagesFetcher.data?.response));
      }
    }
  }, [pagesFetcher.data]);

  useEffect(() => {
    if (filtersFetcher.data) {
      if (
        filtersFetcher.data?.success &&
        filtersFetcher.data?.response?.length > 0
      ) {
        dispatch(updateData(filtersFetcher.data?.response));
      }
    }
  }, [filtersFetcher.data]);

  useEffect(() => {
    if (metaobjectsFetcher.data) {
      if (
        metaobjectsFetcher.data?.success &&
        metaobjectsFetcher.data?.response?.length > 0
      ) {
        dispatch(updateData(metaobjectsFetcher.data?.response));
      }
    }
  }, [metaobjectsFetcher.data]);

  useEffect(() => {
    if (policiesFetcher.data) {
      if (
        policiesFetcher.data?.success &&
        policiesFetcher.data?.response?.length > 0
      ) {
        dispatch(updateData(policiesFetcher.data?.response));
      }
    }
  }, [policiesFetcher.data]);

  useEffect(() => {
    if (shopFetcher.data) {
      if (shopFetcher.data?.success && shopFetcher.data?.response?.length > 0) {
        dispatch(updateData(shopFetcher.data?.response));
      }
    }
  }, [shopFetcher.data]);

  useEffect(() => {
    if (store_metadataFetcher.data) {
      if (
        store_metadataFetcher.data?.success &&
        store_metadataFetcher.data?.response?.length > 0
      ) {
        dispatch(updateData(store_metadataFetcher.data?.response));
      }
    }
  }, [store_metadataFetcher.data]);

  useEffect(() => {
    if (themeFetcher.data) {
      if (
        themeFetcher.data?.success &&
        themeFetcher.data?.response?.length > 0
      ) {
        dispatch(updateData(themeFetcher.data?.response));
      }
    }
  }, [themeFetcher.data]);

  useEffect(() => {
    if (deliveryFetcher.data) {
      if (
        deliveryFetcher.data?.success &&
        deliveryFetcher.data?.response?.length > 0
      ) {
        dispatch(updateData(deliveryFetcher.data?.response));
      }
    }
  }, [deliveryFetcher.data]);

  useEffect(() => {
    if (shippingFetcher.data) {
      if (
        shippingFetcher.data?.success &&
        shippingFetcher.data?.response?.length > 0
      ) {
        dispatch(updateData(shippingFetcher.data.response));
      }
    }
  }, [shippingFetcher.data]);

  useEffect(() => {
    const foundItem = selectOptions?.find((item) => item.value === key);
    if (foundItem && primaryLanguage) {
      setCurrent(key);
    }
  }, [key, selectOptions]);

  useEffect(() => {
    dispatch(setSelectLanguageData(current));
    const findItem = languageItemsData.find(
      (item: any) => item?.language === current,
    );
    if (!findItem && primaryLanguage) {
      const productsFormData = new FormData();
      productsFormData.append(
        "itemsCount",
        JSON.stringify({
          source: primaryLanguage,
          target: current,
          resourceType: "Products",
        }),
      );
      productsFetcher.submit(productsFormData, {
        method: "post",
        action: "/app/manage_translation",
      }); // 提交表单请求
      const collectionsFormData = new FormData();
      collectionsFormData.append(
        "itemsCount",
        JSON.stringify({
          source: primaryLanguage,
          target: current,
          resourceType: "Collection",
        }),
      );
      collectionsFetcher.submit(collectionsFormData, {
        method: "post",
        action: "/app/manage_translation",
      }); // 提交表单请求
      const articlesFormData = new FormData();
      articlesFormData.append(
        "itemsCount",
        JSON.stringify({
          source: primaryLanguage,
          target: current,
          resourceType: "Article",
        }),
      );
      articlesFetcher.submit(articlesFormData, {
        method: "post",
        action: "/app/manage_translation",
      }); // 提交表单请求
      const blog_titlesFormData = new FormData();
      blog_titlesFormData.append(
        "itemsCount",
        JSON.stringify({
          source: primaryLanguage,
          target: current,
          resourceType: "Blog titles",
        }),
      );
      blog_titlesFetcher.submit(blog_titlesFormData, {
        method: "post",
        action: "/app/manage_translation",
      }); // 提交表单请求
      const pagesFormData = new FormData();
      pagesFormData.append(
        "itemsCount",
        JSON.stringify({
          source: primaryLanguage,
          target: current,
          resourceType: "Pages",
        }),
      );
      pagesFetcher.submit(pagesFormData, {
        method: "post",
        action: "/app/manage_translation",
      }); // 提交表单请求
      const filtersFormData = new FormData();
      filtersFormData.append(
        "itemsCount",
        JSON.stringify({
          source: primaryLanguage,
          target: current,
          resourceType: "Filters",
        }),
      );
      filtersFetcher.submit(filtersFormData, {
        method: "post",
        action: "/app/manage_translation",
      }); // 提交表单请求
      const metaobjectsFormData = new FormData();
      metaobjectsFormData.append(
        "itemsCount",
        JSON.stringify({
          source: primaryLanguage,
          target: current,
          resourceType: "Metaobjects",
        }),
      );
      metaobjectsFetcher.submit(metaobjectsFormData, {
        method: "post",
        action: "/app/manage_translation",
      }); // 提交表单请求
      const navigationFormData = new FormData();
      navigationFormData.append(
        "itemsCount",
        JSON.stringify({
          source: primaryLanguage,
          target: current,
          resourceType: "Navigation",
        }),
      );
      navigationFetcher.submit(navigationFormData, {
        method: "post",
        action: "/app/manage_translation",
      }); // 提交表单请求
      const emailFormData = new FormData();
      emailFormData.append(
        "itemsCount",
        JSON.stringify({
          source: primaryLanguage,
          target: current,
          resourceType: "Notifications",
        }),
      );
      emailFetcher.submit(emailFormData, {
        method: "post",
        action: "/app/manage_translation",
      }); // 提交表单请求
      const policiesFormData = new FormData();
      policiesFormData.append(
        "itemsCount",
        JSON.stringify({
          source: primaryLanguage,
          target: current,
          resourceType: "Policies",
        }),
      );
      policiesFetcher.submit(policiesFormData, {
        method: "post",
        action: "/app/manage_translation",
      }); // 提交表单请求
      const shopFormData = new FormData();
      shopFormData.append(
        "itemsCount",
        JSON.stringify({
          source: primaryLanguage,
          target: current,
          resourceType: "Shop",
        }),
      );
      shopFetcher.submit(shopFormData, {
        method: "post",
        action: "/app/manage_translation",
      }); // 提交表单请求
      const store_metadataFormData = new FormData();
      store_metadataFormData.append(
        "itemsCount",
        JSON.stringify({
          source: primaryLanguage,
          target: current,
          resourceType: "Store metadata",
        }),
      );
      store_metadataFetcher.submit(store_metadataFormData, {
        method: "post",
        action: "/app/manage_translation",
      }); // 提交表单请求
      const themeFormData = new FormData();
      themeFormData.append(
        "itemsCount",
        JSON.stringify({
          source: primaryLanguage,
          target: current,
          resourceType: "Theme",
        }),
      );
      themeFetcher.submit(themeFormData, {
        method: "post",
        action: "/app/manage_translation",
      }); // 提交表单请求
      const deliveryFormData = new FormData();
      deliveryFormData.append(
        "itemsCount",
        JSON.stringify({
          source: primaryLanguage,
          target: current,
          resourceType: "Delivery",
        }),
      );
      deliveryFetcher.submit(deliveryFormData, {
        method: "post",
        action: "/app/manage_translation",
      }); // 提交表单请求
      const shippingFormData = new FormData();
      shippingFormData.append(
        "itemsCount",
        JSON.stringify({
          source: primaryLanguage,
          target: current,
          resourceType: "Shipping",
        }),
      );
      shippingFetcher.submit(shippingFormData, {
        method: "post",
        action: "/app/manage_translation",
      }); // 提交表单请求
    }
  }, [current]);

  const imageColumns = [
    {
      title: t("Images data"),
      dataIndex: "title",
      width: "60%",
      key: "title",
    },
    {
      title: t("Action"),
      width: "40%",
      render: (_: any, record: any) => {
        return (
          <Button
            onClick={() => {
              if (current)
                navigate(
                  `/app/manage_translation/${record.navigation}?language=${current}`,
                );
              reportClick("manage_list_edit");
            }}
          >
            {t("Edit")}
          </Button>
        );
      },
    },
  ];

  const navigateToPricing = () => {
    navigate("/app/pricing");
    fetcher.submit(
      {
        log: `${globalStore?.shop} 前往付费页面, 从翻译管理页面点击`,
      },
      {
        method: "POST",
        action: "/log",
      },
    );
  };

  return (
    <Page>
      <TitleBar title={t("Manage Translation")} />
      <ScrollNotice
        text={t(
          "Welcome to our app! If you have any questions, feel free to email us at support@ciwi.ai, and we will respond as soon as possible.",
        )}
      />
      {!loading && !selectOptions?.length ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "90vh",
          }}
        >
          <NoLanguageSetCard />
        </div>
      ) : (
        <Space direction="vertical" size="middle" style={{ display: "flex" }}>
          <div className="manage-header">
            <div className="manage-header-left">
              <Title
                level={3}
                style={{ marginRight: "10px", marginBottom: "5px" }}
              >
                {t("Localized content:")}
              </Title>
              <Select
                options={selectOptions}
                value={current}
                onChange={(value) => setCurrent(value)}
                style={{ minWidth: "200px" }}
              />
            </div>
            <div className="manage-header-right">
              {(typeof plan === "number" && plan <= 4) ||
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
                <Button onClick={handleShowImportModal}>{t("Import")}</Button>
              )}
            </div>
          </div>
          <div className="manage-content-wrap">
            <div className="manage-content-left">
              <Space
                direction="vertical"
                size="middle"
                style={{ display: "flex" }}
              >
                <ManageTranslationsCard
                  cardTitle={t("Products")}
                  dataSource={productsDataSource}
                  current={current}
                />
                <ManageTranslationsCard
                  cardTitle={t("Online Store")}
                  dataSource={onlineStoreDataSource}
                  current={current}
                />
                <ManageTranslationsCard
                  cardTitle={t("Blogs and articles")}
                  dataSource={blogAndArticleDataSource}
                  current={current}
                />
                <Card>
                  <Space
                    direction="vertical"
                    size="small"
                    style={{ display: "flex" }}
                  >
                    <Title style={{ fontSize: "1.5rem", display: "inline" }}>
                      {t("Images data")}
                    </Title>
                    <Table
                      columns={imageColumns}
                      dataSource={imageDataSource}
                      pagination={false}
                    />
                  </Space>
                </Card>

                <ManageTranslationsCard
                  cardTitle={t("Settings")}
                  dataSource={settingsDataSource}
                  current={current}
                />
              </Space>
            </div>
            {/* <div className="manage-content-right"></div> */}
          </div>
        </Space>
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
                fetcher.submit(
                  {
                    log: `${globalStore?.shop} 下载批量导入文件`,
                  },
                  {
                    method: "POST",
                    action: "/log",
                  },
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

export default Index;
