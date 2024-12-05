import { TitleBar } from "@shopify/app-bridge-react";
import { Page } from "@shopify/polaris";
import { Menu, Space } from "antd";
import { Suspense, useEffect, useState } from "react";
import "./styles.css";
import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import { queryShopLanguages } from "~/api/admin";
import { ShopLocalesType } from "../app.language/route";
import { Outlet, useFetcher, useLocation } from "@remix-run/react";
import AttentionCard from "~/components/attentionCard";
import { useDispatch, useSelector } from "react-redux";
import { setSelectLanguageData } from "~/store/modules/selectLanguageData";
import React from "react";
import { GetUserWords } from "~/api/serve";
import { authenticate } from "~/shopify.server";
import { WordsType } from "../app._index/route";
import NoLanguageSetCard from "~/components/noLanguageSetCard";
import { updateData } from "~/store/modules/languageItemsData";
const ManageTranslationsCard = React.lazy(
  () => import("./components/manageTranslationsCard"),
);

interface ManageMenuDataType {
  label: string;
  key: string;
}

interface TableDataType {
  key: string;
  title: string;
  allTranslatedItems: number;
  allItems: number;
  sync_status: boolean;
  navigation: string;
}

interface FetchType {
  shopLanguagesLoad: [];
  words: WordsType;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  try {
    const formData = await request.formData();
    const loading = JSON.parse(formData.get("loading") as string);
    switch (true) {
      case !!loading:
        const shopLanguagesLoad: ShopLocalesType[] = await queryShopLanguages({
          shop,
          accessToken,
        });
        const words = await GetUserWords({ shop });
        return json({
          shopLanguagesLoad: shopLanguagesLoad,
          words: words,
        });
      default:
        // 你可以在这里处理一个默认的情况，如果没有符合的条件
        return json({ success: false, message: "Invalid data" });
    }
  } catch (error) {
    console.error("Error action manage_translation:", error);
    throw new Response("Error action manage_translation", { status: 500 });
  }
};

const Index = () => {
  // const { shopLanguagesLoad, words } = useLoaderData<typeof loader>();
  const [words, setWords] = useState<WordsType>();
  const [shopLanguages, setShopLanguages] = useState<ShopLocalesType[]>();
  const [menuData, setMenuData] = useState<ManageMenuDataType[]>();
  const [primaryLanguage, setPrimaryLanguage] = useState<string>();
  const [current, setCurrent] = useState<string>("");
  const [disable, setDisable] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();
  const location = useLocation();
  const { key } = location.state || {}; // 提取传递的状态
  const items = useSelector((state: any) => state.languageItemsData);
  const fetcher = useFetcher<FetchType>();
  const currentFetcher = useFetcher<any>();

  const resourceTypes = [
    "Collection",
    "Theme",
    "Article",
    "Blog titles",
    "Filters",
    "Metaobjects",
    "Pages",
    "Policies",
    "Products",
    "Navigation",
    "Store metadata",
    "Shop",
    "Shipping",
    "Delivery",
  ];
  const productsDataSource: TableDataType[] = [
    {
      key: "products",
      title: "Products",
      allTranslatedItems:
        items.find(
          (item: any) => item.language === current && item.type === "PRODUCT",
        )?.translatedNumber ?? undefined,
      allItems:
        items.find(
          (item: any) => item.language === current && item.type === "PRODUCT",
        )?.totalNumber ?? undefined,
      sync_status: true,
      navigation: "product",
    },
    {
      key: "collections",
      title: "Collections",
      allTranslatedItems:
        items.find(
          (item: any) =>
            item.language === current && item.type === "COLLECTION",
        )?.translatedNumber ?? undefined,
      allItems:
        items.find(
          (item: any) =>
            item.language === current && item.type === "COLLECTION",
        )?.totalNumber ?? undefined,
      sync_status: true,
      navigation: "collection",
    },
  ];
  const onlineStoreDataSource: TableDataType[] = [
    {
      key: "articles",
      title: "Articles",
      allTranslatedItems:
        items.find(
          (item: any) => item.language === current && item.type === "ARTICLE",
        )?.translatedNumber ?? undefined,
      allItems:
        items.find(
          (item: any) => item.language === current && item.type === "ARTICLE",
        )?.totalNumber ?? undefined,
      sync_status: false,
      navigation: "article",
    },
    {
      key: "blog_titles",
      title: "Blog titles",
      allTranslatedItems:
        items.find(
          (item: any) => item.language === current && item.type === "BLOG",
        )?.translatedNumber ?? undefined,
      allItems:
        items.find(
          (item: any) => item.language === current && item.type === "BLOG",
        )?.totalNumber ?? undefined,
      sync_status: false,
      navigation: "blog",
    },
    {
      key: "pages",
      title: "Pages",
      allTranslatedItems:
        items.find(
          (item: any) => item.language === current && item.type === "PAGE",
        )?.translatedNumber ?? undefined,
      allItems:
        items.find(
          (item: any) => item.language === current && item.type === "PAGE",
        )?.totalNumber ?? undefined,
      sync_status: false,
      navigation: "page",
    },
    {
      key: "filters",
      title: "Filters",
      allTranslatedItems:
        items.find(
          (item: any) => item.language === current && item.type === "FILTER",
        )?.translatedNumber ?? undefined,
      allItems:
        items.find(
          (item: any) => item.language === current && item.type === "FILTER",
        )?.totalNumber ?? undefined,
      sync_status: false,
      navigation: "filter",
    },
    {
      key: "metaobjects",
      title: "Metaobjects",
      allTranslatedItems:
        items.find(
          (item: any) =>
            item.language === current && item.type === "METAOBJECT",
        )?.translatedNumber ?? undefined,
      allItems:
        items.find(
          (item: any) =>
            item.language === current && item.type === "METAOBJECT",
        )?.totalNumber ?? undefined,
      sync_status: false,
      navigation: "metaobject",
    },
    {
      key: "navigation",
      title: "Navigation",
      allTranslatedItems:
        items.find(
          (item: any) => item.language === current && item.type === "LINK",
        )?.translatedNumber ?? undefined,
      allItems:
        items.find(
          (item: any) => item.language === current && item.type === "LINK",
        )?.totalNumber ?? undefined,
      sync_status: false,
      navigation: "navigation",
    },
    {
      key: "policies",
      title: "Policies",
      allTranslatedItems:
        items.find(
          (item: any) =>
            item.language === current && item.type === "SHOP_POLICY",
        )?.translatedNumber ?? undefined,
      allItems:
        items.find(
          (item: any) =>
            item.language === current && item.type === "SHOP_POLICY",
        )?.totalNumber ?? undefined,
      sync_status: false,
      navigation: "policy",
    },
    {
      key: "shop",
      title: "Shop",
      allTranslatedItems:
        items.find(
          (item: any) => item.language === current && item.type === "SHOP",
        )?.translatedNumber ?? undefined,
      allItems:
        items.find(
          (item: any) => item.language === current && item.type === "SHOP",
        )?.totalNumber ?? undefined,
      sync_status: false,
      navigation: "shop",
    },
    {
      key: "store_metadata",
      title: "Store metadata",
      allTranslatedItems:
        items.find(
          (item: any) => item.language === current && item.type === "METAFIELD",
        )?.translatedNumber ?? undefined,
      allItems:
        items.find(
          (item: any) => item.language === current && item.type === "METAFIELD",
        )?.totalNumber ?? undefined,
      sync_status: false,
      navigation: "metafield",
    },
    {
      key: "theme",
      title: "Theme",
      allTranslatedItems:
        items.find(
          (item: any) =>
            item.language === current && item.type === "ONLINE_STORE_THEME",
        )?.translatedNumber ?? undefined,
      allItems:
        items.find(
          (item: any) =>
            item.language === current && item.type === "ONLINE_STORE_THEME",
        )?.totalNumber ?? undefined,
      sync_status: false,
      navigation: "theme",
    },
  ];
  const settingsDataSource: TableDataType[] = [
    {
      key: "delivery",
      title: "Delivery",
      allTranslatedItems:
        items.find(
          (item: any) =>
            item.language === current &&
            item.type === "DELIVERY_METHOD_DEFINITION",
        )?.translatedNumber ?? undefined,
      allItems:
        items.find(
          (item: any) =>
            item.language === current &&
            item.type === "DELIVERY_METHOD_DEFINITION",
        )?.totalNumber ?? undefined,
      sync_status: false,
      navigation: "delivery",
    },
    {
      key: "shipping",
      title: "Shipping",
      allTranslatedItems:
        items.find(
          (item: any) =>
            item.language === current && item.type === "PACKING_SLIP_TEMPLATE",
        )?.translatedNumber ?? undefined,
      allItems:
        items.find(
          (item: any) =>
            item.language === current && item.type === "PACKING_SLIP_TEMPLATE",
        )?.totalNumber ?? undefined,
      sync_status: false,
      navigation: "shipping",
    },
  ];
  useEffect(() => {
    const formData = new FormData();
    formData.append("loading", JSON.stringify(true));
    fetcher.submit(formData, {
      method: "post",
      action: "/app/manage_translation",
    });
    shopify.loading(true);
  }, []);

  useEffect(() => {
    if (fetcher.data) {
      setShopLanguages(fetcher.data.shopLanguagesLoad);
      setWords(fetcher.data.words);
      setLoading(false);
    }
  }, [fetcher.data]);

  useEffect(() => {
    if (currentFetcher.data) {
      console.log(currentFetcher.data);

      dispatch(updateData(currentFetcher.data.data));
    }
  }, [currentFetcher.data]);

  useEffect(() => {
    if (shopLanguages && words) {
      shopify.loading(false);
      setLoading(false);
    }
  }, [shopLanguages, words]);

  useEffect(() => {
    if (words && words.chars > words.totalChars) setDisable(true);
  }, [words]);

  useEffect(() => {
    if (shopLanguages && shopLanguages?.length) {
      const primaryLanguage = shopLanguages.filter(
        (language) => language.primary,
      );
      setPrimaryLanguage(primaryLanguage[0].locale);
      const newArray = shopLanguages
        .filter((language) => !language.primary)
        .map((language) => ({
          label: language.name,
          key: language.locale,
        }));
      setMenuData(newArray);
      setCurrent(newArray[0]?.key);
    }
  }, [shopLanguages]);

  useEffect(() => {
    const foundItem = menuData?.find((item) => item.key === key);
    if (foundItem && primaryLanguage) {
      setCurrent(key);
      const formData = new FormData();
      formData.append(
        "itemsInfo",
        JSON.stringify({
          source: primaryLanguage,
          target: key,
          resourceTypes: resourceTypes,
        }),
      );
      currentFetcher.submit(formData, {
        method: "post",
        action: "/app",
      }); // 提交表单请求
    }
  }, [key, menuData]);

  useEffect(() => {
    dispatch(setSelectLanguageData(current));
  }, [current]);

  const onClick = (e: any) => {
    setCurrent(e.key);
    const findItem = items.find((item: any) => item.language === e.key);
    if (!findItem && primaryLanguage) {
      const formData = new FormData();
      formData.append(
        "itemsInfo",
        JSON.stringify({
          source: primaryLanguage,
          target: e.key,
          resourceTypes: resourceTypes,
        }),
      );
      currentFetcher.submit(formData, {
        method: "post",
        action: "/app",
      }); // 提交表单请求
    }
  };

  return (
    <Page>
      <TitleBar title="Manage Translation" />
      {loading ? (
        <div>loading...</div>
      ) : menuData && !menuData?.length ? (
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
        <div>
          <Space direction="vertical" size="middle" style={{ display: "flex" }}>
            <AttentionCard
              title="Translation word credits have been exhausted."
              content="The translation cannot be completed due to exhausted credits."
              buttonContent="Get more word credits"
              show={disable}
            />
            <Suspense fallback={<div>loading...</div>}>
              <div className="manage-header">
                <Menu
                  onClick={onClick}
                  selectedKeys={[current]}
                  mode="horizontal"
                  items={menuData}
                  style={{
                    backgroundColor: "transparent", // 背景透明
                    borderBottom: "none", // 去掉底部边框
                    color: "#000", // 文本颜色
                    minWidth: "80%",
                  }}
                />
              </div>
              <div className="manage-content-wrap">
                <div className="manage-content-left">
                  <Space
                    direction="vertical"
                    size="middle"
                    style={{ display: "flex" }}
                  >
                    <div className="search-input"></div>
                    {/* 使用 Suspense 包裹懒加载组件 */}
                    <ManageTranslationsCard
                      cardTitle="Products"
                      dataSource={productsDataSource}
                      current={current}
                    />
                    <ManageTranslationsCard
                      cardTitle="Online Store"
                      dataSource={onlineStoreDataSource}
                      current={current}
                    />
                    <ManageTranslationsCard
                      cardTitle="Settings"
                      dataSource={settingsDataSource}
                      current={current}
                    />
                  </Space>
                </div>
                <div className="manage-content-right"></div>
              </div>
            </Suspense>
          </Space>
          <Outlet />
        </div>
      )}
    </Page>
  );
};

export default Index;
