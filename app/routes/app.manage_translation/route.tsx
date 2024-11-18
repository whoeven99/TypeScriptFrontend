import { TitleBar } from "@shopify/app-bridge-react";
import { Page } from "@shopify/polaris";
import { Menu, Space } from "antd";
import { Suspense, useEffect, useState } from "react";
import "./styles.css";
import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import { queryShopLanguages } from "~/api/admin";
import { ShopLocalesType } from "../app.language/route";
import {
  Outlet,
  useActionData,
  useLoaderData,
  useLocation,
  useSubmit,
} from "@remix-run/react";
import AttentionCard from "~/components/attentionCard";
import { useDispatch, useSelector } from "react-redux";
import { setSelectLanguageData } from "~/store/modules/selectLanguageData";
import React from "react";
import { GetUserWords } from "~/api/serve";
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

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const shopLanguagesLoad: ShopLocalesType[] = await queryShopLanguages({
      request,
    });
    const words = await GetUserWords({ request });

    return json({
      shopLanguagesLoad,
      words,
    });
  } catch (error) {
    console.error("Error load manage_translation:", error);
    throw new Response("Error load manage_translation", { status: 500 });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const formData = await request.formData();
    const actionType = formData.get("actionType");

    if (actionType === "sync") {
      try {
        const shopLanguagesAction: ShopLocalesType[] = await queryShopLanguages(
          { request },
        );
        return json({ shopLanguagesAction });
      } catch (error) {
        console.error("Error action shopLanguages:", error);
        throw new Response("Error action shopLanguages", { status: 500 });
      }
    }
  } catch (error) {
    console.error("Error action manage_translation:", error);
    throw new Response("Error action manage_translation", { status: 500 });
  }
};

const Index = () => {
  const { shopLanguagesLoad, words } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [shopLanguages, setShopLanguages] =
    useState<ShopLocalesType[]>(shopLanguagesLoad);
  const [menuData, setMenuData] = useState<ManageMenuDataType[]>([]);
  const [current, setCurrent] = useState<string>("");
  const [disable, setDisable] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();
  const location = useLocation();
  const { key } = location.state || {}; // 提取传递的状态
  const submit = useSubmit();
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
    if (words.chars > words.totalChars) setDisable(true);
  }, [words]);

  useEffect(() => {
    const newArray = shopLanguages
      .filter((language) => !language.primary)
      .map((language) => ({
        label: language.name,
        key: language.locale,
      }));
    setMenuData(newArray);
    setCurrent(newArray[0].key);
    if (shopLanguages) {
      setLoading(false);
    }
  }, [shopLanguages]);

  useEffect(() => {
    if (actionData) {
      // 例如更新状态
      setShopLanguages(actionData.shopLanguagesAction);
    }
  }, [actionData]);

  useEffect(() => {
    try {
      const foundItem = menuData.find((item) => item.key === key);
      if (foundItem) {
        setCurrent(key);
      } else {
        // 找不到时的处理逻辑，例如重置当前状态或显示错误消息
        console.warn(`No item found for key: ${key}`);
      }
    } catch (error) {
      console.error("Error finding item:", error);
      // 处理异常情况，比如显示错误消息
    }
  }, [key, menuData]);

  useEffect(() => {
    dispatch(setSelectLanguageData(current));
  }, [current]);

  const onClick = (e: any) => {
    // 将 e.key 转换为字符串以确保 current 始终为 string
    setCurrent(e.key);
  };

  const handleSyncAll = () => {
    const formData = new FormData();
    formData.append("actionType", "sync");
    submit(formData, { method: "post", action: "/app/manage_translation" });
  };

  if (loading) {
    return <div>加载中...</div>; // 加载状态
  }

  return (
    <Page>
      <TitleBar title="Manage Translation" />
      <Space direction="vertical" size="middle" style={{ display: "flex" }}>
        <AttentionCard
          title="Translation word credits have been exhausted."
          content="The translation cannot be completed due to exhausted credits."
          buttonContent="Get more word credits"
          show={disable}
        />
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
          ></Menu>
          {/* <div className="manage-action">
            <Space>
              <Button type="default">Backup</Button>
              <Button type="primary" onClick={handleSyncAll}>
                Sync all
              </Button>
            </Space>
          </div> */}
        </div>
        <div className="manage-content-wrap">
          <div className="manage-content-left">
            <Suspense fallback={<div>加载翻译内容...</div>}>
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
            </Suspense>
          </div>
          <div className="manage-content-right"></div>
        </div>
      </Space>
      <Outlet />
    </Page>
  );
};

export default Index;
