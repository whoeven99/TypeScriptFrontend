import { TitleBar } from "@shopify/app-bridge-react";
import { Page } from "@shopify/polaris";
import { Space, Select, Typography, Button, Table, Card } from "antd";
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
import { GetTranslationItemsInfo } from "~/api/JavaServer";
import { authenticate } from "~/shopify.server";
import NoLanguageSetCard from "~/components/noLanguageSetCard";
import languageItemsData, {
  updateData,
} from "~/store/modules/languageItemsData";
import { useTranslation } from "react-i18next";
import ManageTranslationsCard from "./components/manageTranslationsCard";
import ScrollNotice from "~/components/ScrollNotice";
import { setUserConfig } from "~/store/modules/userConfig";
import { setTableData } from "~/store/modules/languageTableData";
import TranslationWarnModal from "~/components/translationWarnModal";

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

  const adminAuthResult = await authenticate.admin(request);
  const { shop } = adminAuthResult.session;

  console.log(`${shop} load manage`);
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
        console.log("GetTranslationItemsInfo: ", data);
        return json({ data: data });
      } catch (error) {
        console.error("Error manage_translation itemsCount:", error);
        return json({ data: [] });
      }
    default:
      // 你可以在这里处理一个默认的情况，如果没有符合的条件
      return json({ success: false, message: "Invalid data" });
  }
};

const Index = () => {
  const navigate = useNavigate();

  const { searchTerm } = useLoaderData<typeof loader>();
  const [selectOptions, setSelectOptions] = useState<ManageSelectDataType[]>(
    [],
  );
  const [primaryLanguage, setPrimaryLanguage] = useState<string>();
  const [current, setCurrent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const location = useLocation();
  const [showWarnModal, setShowWarnModal] = useState(false);
  const { key } = useMemo(() => location.state || {}, [location.state]);
  const languageItemsData = useSelector(
    (state: any) => state.languageItemsData,
  );

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
    {
      key: "filters",
      title: t("Filters"),
      allTranslatedItems:
        languageItemsData.find(
          (item: any) => item?.language === current && item?.type === "FILTER",
        )?.translatedNumber ?? undefined,
      allItems:
        languageItemsData.find(
          (item: any) => item?.language === current && item?.type === "FILTER",
        )?.totalNumber ?? undefined,
      sync_status: false,
      navigation: "filter",
    },
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
    {
      key: "navigation",
      title: t("Navigation"),
      allTranslatedItems:
        languageItemsData.find(
          (item: any) => item?.language === current && item?.type === "LINK",
        )?.translatedNumber ?? undefined,
      allItems:
        languageItemsData.find(
          (item: any) => item?.language === current && item?.type === "LINK",
        )?.totalNumber ?? undefined,
      sync_status: false,
      navigation: "navigation",
    },
    {
      key: "email",
      title: t("Email"),
      allTranslatedItems:
        languageItemsData.find(
          (item: any) =>
            item?.language === current && item?.type === "EMAIL_TEMPLATE",
        )?.translatedNumber ?? undefined,
      allItems:
        languageItemsData.find(
          (item: any) =>
            item?.language === current && item?.type === "EMAIL_TEMPLATE",
        )?.totalNumber ?? undefined,
      sync_status: false,
      navigation: "email",
    },
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
  ];

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
              key: index,
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
        dispatch(setUserConfig({ locale: locale || "" }));
      }
    }
  }, [languageFetcher.data]);

  useEffect(() => {
    if (productsFetcher.data?.data?.length > 0) {
      dispatch(updateData(productsFetcher.data.data));
    }
  }, [productsFetcher.data]);

  useEffect(() => {
    if (collectionsFetcher.data?.data?.length > 0) {
      dispatch(updateData(collectionsFetcher.data.data));
    }
  }, [collectionsFetcher.data]);

  useEffect(() => {
    if (articlesFetcher.data?.data?.length > 0) {
      dispatch(updateData(articlesFetcher.data.data));
    }
  }, [articlesFetcher.data]);

  useEffect(() => {
    if (blog_titlesFetcher.data?.data?.length > 0) {
      dispatch(updateData(blog_titlesFetcher.data.data));
    }
  }, [blog_titlesFetcher.data]);

  useEffect(() => {
    if (pagesFetcher.data?.data?.length > 0) {
      dispatch(updateData(pagesFetcher.data.data));
    }
  }, [pagesFetcher.data]);

  useEffect(() => {
    if (filtersFetcher.data?.data?.length > 0) {
      dispatch(updateData(filtersFetcher.data.data));
    }
  }, [filtersFetcher.data]);

  useEffect(() => {
    if (metaobjectsFetcher.data?.data?.length > 0) {
      dispatch(updateData(metaobjectsFetcher.data.data));
    }
  }, [metaobjectsFetcher.data]);

  useEffect(() => {
    if (navigationFetcher.data?.data?.length > 0) {
      dispatch(updateData(navigationFetcher.data.data));
    }
  }, [navigationFetcher.data]);

  useEffect(() => {
    if (emailFetcher.data?.data?.length > 0) {
      dispatch(updateData(emailFetcher.data.data));
    }
  }, [emailFetcher.data]);

  useEffect(() => {
    if (policiesFetcher.data?.data?.length > 0) {
      dispatch(updateData(policiesFetcher.data.data));
    }
  }, [policiesFetcher.data]);

  useEffect(() => {
    if (shopFetcher.data?.data?.length > 0) {
      dispatch(updateData(shopFetcher.data.data));
    }
  }, [shopFetcher.data]);

  useEffect(() => {
    if (store_metadataFetcher.data?.data?.length > 0) {
      dispatch(updateData(store_metadataFetcher.data.data));
    }
  }, [store_metadataFetcher.data]);

  useEffect(() => {
    if (themeFetcher.data?.data?.length > 0) {
      dispatch(updateData(themeFetcher.data.data));
    }
  }, [themeFetcher.data]);

  useEffect(() => {
    if (deliveryFetcher.data?.data?.length > 0) {
      dispatch(updateData(deliveryFetcher.data.data));
    }
  }, [deliveryFetcher.data]);

  useEffect(() => {
    if (shippingFetcher.data?.data?.length > 0) {
      dispatch(updateData(shippingFetcher.data.data));
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
      key: "title",
    },
    {
      title: t("Action"),
      render: (_: any, record: any) => {
        return (
          <Button
            onClick={() => {
              if (current)
                navigate(
                  `/app/manage_translation/${record.navigation}?language=${current}`,
                );
            }}
          >
            {t("Edit")}
          </Button>
        );
      },
    },
  ];

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
            {/* <div
              className="manage-header-right"
            >
              <Button>
                {t("Sync")}
              </Button>
            </div> */}
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
                  setShowWarnModal={setShowWarnModal}
                />
                <ManageTranslationsCard
                  cardTitle={t("Online Store")}
                  dataSource={onlineStoreDataSource}
                  current={current}
                  setShowWarnModal={setShowWarnModal}
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
                  setShowWarnModal={setShowWarnModal}
                />
              </Space>
            </div>
            {/* <div className="manage-content-right"></div> */}
          </div>
        </Space>
      )}
      {/* <TranslationWarnModal
        title={t("The Translation Editor has been limited due to your plan (Current plan: {{plan}})", { plan: planMapping[plan as keyof typeof planMapping] })}
        content={t("Please upgrade to a higher plan to unlock the Translation Editor")}
        action={() => {
          navigate("/app/pricing");
        }}
        actionText={t("Upgrade")}
        show={showWarnModal}
        setShow={setShowWarnModal}
      /> */}
    </Page>
  );
};

export default Index;
