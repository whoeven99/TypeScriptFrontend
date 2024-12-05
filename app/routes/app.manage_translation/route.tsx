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
  const [current, setCurrent] = useState<string>("");
  const [disable, setDisable] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();
  const location = useLocation();
  const { key } = location.state || {}; // 提取传递的状态
  const fetcher = useFetcher<FetchType>();
  const items = useSelector((state: any) => state.languageItemsData);

  const productsDataSource: TableDataType[] = [
    {
      key: "products",
      title: "Products",
      allTranslatedItems:
        items.find(
          (item: any) => item.language === current && item.type === "Products",
        )?.translatedNumber ?? undefined,
      allItems:
        items.find(
          (item: any) => item.language === current && item.type === "Products",
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
            item.language === current && item.type === "Collection",
        )?.translatedNumber ?? undefined,
      allItems:
        items.find(
          (item: any) =>
            item.language === current && item.type === "Collection",
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
          (item: any) => item.language === current && item.type === "Article",
        )?.translatedNumber ?? undefined,
      allItems:
        items.find(
          (item: any) => item.language === current && item.type === "Article",
        )?.totalNumber ?? undefined,
      sync_status: false,
      navigation: "article",
    },
    {
      key: "blog_titles",
      title: "Blog titles",
      allTranslatedItems:
        items.find(
          (item: any) =>
            item.language === current && item.type === "Blog titles",
        )?.translatedNumber ?? undefined,
      allItems:
        items.find(
          (item: any) =>
            item.language === current && item.type === "Blog titles",
        )?.totalNumber ?? undefined,
      sync_status: false,
      navigation: "blog",
    },
    {
      key: "pages",
      title: "Pages",
      allTranslatedItems:
        items.find(
          (item: any) => item.language === current && item.type === "Pages",
        )?.translatedNumber ?? undefined,
      allItems:
        items.find(
          (item: any) => item.language === current && item.type === "Pages",
        )?.totalNumber ?? undefined,
      sync_status: false,
      navigation: "page",
    },
    {
      key: "filters",
      title: "Filters",
      allTranslatedItems:
        items.find(
          (item: any) => item.language === current && item.type === "Filters",
        )?.translatedNumber ?? undefined,
      allItems:
        items.find(
          (item: any) => item.language === current && item.type === "Filters",
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
            item.language === current && item.type === "Metaobjects",
        )?.translatedNumber ?? undefined,
      allItems:
        items.find(
          (item: any) =>
            item.language === current && item.type === "Metaobjects",
        )?.totalNumber ?? undefined,
      sync_status: false,
      navigation: "metaobject",
    },
    {
      key: "navigation",
      title: "Navigation",
      allTranslatedItems:
        items.find(
          (item: any) =>
            item.language === current && item.type === "Navigation",
        )?.translatedNumber ?? undefined,
      allItems:
        items.find(
          (item: any) =>
            item.language === current && item.type === "Navigation",
        )?.totalNumber ?? undefined,
      sync_status: false,
      navigation: "navigation",
    },
    {
      key: "policies",
      title: "Policies",
      allTranslatedItems:
        items.find(
          (item: any) => item.language === current && item.type === "Policies",
        )?.translatedNumber ?? undefined,
      allItems:
        items.find(
          (item: any) => item.language === current && item.type === "Policies",
        )?.totalNumber ?? undefined,
      sync_status: false,
      navigation: "policy",
    },
    {
      key: "shop",
      title: "Shop",
      allTranslatedItems:
        items.find(
          (item: any) => item.language === current && item.type === "Shop",
        )?.translatedNumber ?? undefined,
      allItems:
        items.find(
          (item: any) => item.language === current && item.type === "Shop",
        )?.totalNumber ?? undefined,
      sync_status: false,
      navigation: "shop",
    },
    {
      key: "store_metadata",
      title: "Store metadata",
      allTranslatedItems:
        items.find(
          (item: any) =>
            item.language === current && item.type === "Store metadata",
        )?.translatedNumber ?? undefined,
      allItems:
        items.find(
          (item: any) =>
            item.language === current && item.type === "Store metadata",
        )?.totalNumber ?? undefined,
      sync_status: false,
      navigation: "metafield",
    },
    {
      key: "theme",
      title: "Theme",
      allTranslatedItems:
        items.find(
          (item: any) => item.language === current && item.type === "Theme",
        )?.translatedNumber ?? undefined,
      allItems:
        items.find(
          (item: any) => item.language === current && item.type === "Theme",
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
          (item: any) => item.language === current && item.type === "delivery",
        )?.translatedNumber ?? undefined,
      allItems:
        items.find(
          (item: any) => item.language === current && item.type === "delivery",
        )?.totalNumber ?? undefined,
      sync_status: false,
      navigation: "delivery",
    },
    {
      key: "shipping",
      title: "Shipping",
      allTranslatedItems:
        items.find(
          (item: any) => item.language === current && item.type === "Shipping",
        )?.translatedNumber ?? undefined,
      allItems:
        items.find(
          (item: any) => item.language === current && item.type === "Shipping",
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
    if (shopLanguages && words) {
    } else {
      shopify.loading(false);
      setLoading(false);
    }
  }, [shopLanguages, words]);

  useEffect(() => {
    if (words && words.chars > words.totalChars) setDisable(true);
  }, [words]);

  useEffect(() => {
    if (shopLanguages && shopLanguages?.length) {
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
    if (foundItem) {
      setCurrent(key);
    }
  }, [key, menuData]);

  useEffect(() => {
    dispatch(setSelectLanguageData(current));
  }, [current]);

  const onClick = (e: any) => {
    // 将 e.key 转换为字符串以确保 current 始终为 string
    setCurrent(e.key);
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
