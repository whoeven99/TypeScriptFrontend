import { TitleBar } from "@shopify/app-bridge-react";
import { Page } from "@shopify/polaris";
import { Button, Menu, Space, Typography } from "antd";
import { useEffect, useState } from "react";
import "./styles.css";
import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import { updateUserInfo } from "~/api/serve";
import { queryShopLanguages } from "~/api/admin";
import { ShopLocalesType } from "../app.language/route";
import {
  Link,
  Outlet,
  useActionData,
  useLoaderData,
  useSubmit,
} from "@remix-run/react";
import AttentionCard from "~/components/attentionCard";
import ManageTranslationsCard from "./components/manageTranslationsCard";

const { Text } = Typography;

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
  // function filterEmptyTranslationsAndContent(data: any) {
  //   // 使用 filter 方法过滤掉 translations 和 translatableContent 为空的节点
  //   const filter = data.nodes.filter((node: any) => {
  //     return (
  //       node.translatableContent.length > 0 || node.translations.length > 0
  //     );
  //   });
  //   return filter;
  // }
  try {
    // try {
    //   // 登录成功后调用 updateUserInfo 更新用户信息
    //   await updateUserInfo(request);
    // } catch (error) {
    //   console.error("Error updating user info:", error);
    // }
    const shopLanguagesLoad: ShopLocalesType[] =
      await queryShopLanguages(request);
    // const allMarket: MarketType[] = await queryAllMarket(request);
    // let allLanguages: AllLanguagesType[] = await queryAllLanguages(request);

    // allLanguages = allLanguages.map((language, index) => ({
    //   ...language,
    //   key: index,
    // }));
    // const products = await queryAllProducts(request);
    // const collections = await queryCollections(request);
    // const pages = await queryPages(request);
    // const articles = await queryArticles(request);
    // const blogs = await queryBlogs(request);
    // const filters = await queryTransType(request, "FILTER");
    // const metaobjects = await queryTransType(request, "METAOBJECT");
    // const menus = await queryTransType(request, "MENU");
    // const policies = await queryTransType(request, "SHOP_POLICY");
    // const metafield = await queryTransType(request, "METAFIELD");
    // // const appembed = await queryTransType(request, "ONLINE_STORE_THEME_APP_EMBED");
    // // const appembed = await queryTransType(request, "ONLINE_STORE_THEME_JSON_TEMPLATE");
    // // const appembed = await queryTransType(request, "ONLINE_STORE_THEME_LOCALE_CONTENT");
    // // const appembed = await queryTransType(request, "ONLINE_STORE_THEME_SECTION_GROUP");
    // // const appembed = await queryTransType(request, "ONLINE_STORE_THEME_SETTINGS_CATEGORY");
    // // const appembed = await queryTransType(request, "ONLINE_STORE_THEME_SETTINGS_DATA_SECTIONS");
    // const emailtemplate = await queryTransType(request, "EMAIL_TEMPLATE");
    // let delivery = await queryTransType(request, "DELIVERY_METHOD_DEFINITION");
    // delivery = filterEmptyTranslationsAndContent(delivery);
    // let packingslip = await queryTransType(request, "PACKING_SLIP_TEMPLATE");

    return json({
      shopLanguagesLoad,
      // products,
      // collections,
      // pages,
      // articles,
      // blogs,
      // filters,
      // metaobjects,
      // menus,
      // policies,
      // metafield,
      // appembed,
      // emailtemplate,
      // delivery,
      // packingslip,
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
        const shopLanguagesAction: ShopLocalesType[] =
          await queryShopLanguages(request);
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
  const {
    shopLanguagesLoad,
    //   products,
    //   collections,
    //   pages,
    //   articles,
    //   blogs,
    //   filters,
    //   metaobjects,
    //   menus,
    //   policies,
    //   metafield,
    //   emailtemplate,
    //   delivery,
    //   packingslip,
  } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [shopLanguages, setShopLanguages] =
    useState<ShopLocalesType[]>(shopLanguagesLoad);
  const [menuData, setmenuData] = useState<ManageMenuDataType[]>([]);
  const [current, setCurrent] = useState<string>("");
  const [productsDataSource, setProductsDataSource] = useState<TableDataType[]>(
    [
      {
        key: "products",
        title: "Products",
        allTranslatedItems: 1,
        // allItems: products.nodes.length,
        allItems: 30,
        sync_status: true,
        navigation: "product",
      },
      {
        key: "collections",
        title: "Collections",
        allTranslatedItems: 1,
        // allItems: collections.nodes.length,
        allItems: 30,
        sync_status: true,
        navigation: "collection",
      },
    ],
  );
  const [onlineStoreDataSource, setOnlineStoreDataSource] = useState<
    TableDataType[]
  >([
    {
      key: "articles",
      title: "Articles",
      allTranslatedItems: 1,
      // allItems: articles.nodes.length,
      allItems: 30,
      sync_status: false,
      navigation: "article",
    },
    {
      key: "blog_titles",
      title: "Blog titles",
      allTranslatedItems: 1,
      // allItems: blogs.nodes.length,
      allItems: 30,
      sync_status: false,
      navigation: "blog",
    },
    {
      key: "pages",
      title: "Pages",
      allTranslatedItems: 1,
      // allItems: pages.nodes.length,
      allItems: 30,
      sync_status: false,
      navigation: "page",
    },
    {
      key: "filters",
      title: "Filters",
      allTranslatedItems: 1,
      // allItems: filters.nodes.length,
      allItems: 30,
      sync_status: false,
      navigation: "filter",
    },
    {
      key: "metaobjects",
      title: "Metaobjects",
      allTranslatedItems: 1,
      // allItems: metaobjects.nodes.length,
      allItems: 30,
      sync_status: false,
      navigation: "metaobject",
    },
    {
      key: "navigation",
      title: "Navigation",
      allTranslatedItems: 1,
      // allItems: menus.nodes.length,
      allItems: 30,
      sync_status: false,
      navigation: "navigation",
    },
    {
      key: "policies",
      title: "Policies",
      allTranslatedItems: 1,
      // allItems: policies.nodes.length,
      allItems: 30,
      sync_status: false,
      navigation: "policy",
    },
    {
      key: "store_metadata",
      title: "Store metadata",
      allTranslatedItems: 1,
      // allItems: metafield.nodes.length,
      allItems: 30,
      sync_status: false,
      navigation: "store_metadata",
    },
  ]);
  // const [themeDataSource, setThemeDataSource] = useState<
  //   TableDataType[]
  // >([
  //   {
  //     title: "App embed",
  //     allTranslatedItems: 1,
  //     allItems: 30,
  //     sync_status: false,
  //   },
  //   {
  //     title: "Default theme content",
  //     allTranslatedItems: 1,
  //     allItems: 30,
  //     sync_status: false,
  //   },
  //   {
  //     title: "Section groups",
  //     allTranslatedItems: 1,
  //     allItems: 30,
  //     sync_status: false,
  //   },
  //   {
  //     title: "Static section",
  //     allTranslatedItems: 1,
  //     allItems: 30,
  //     sync_status: false,
  //   },
  //   {
  //     title: "Templates",
  //     allTranslatedItems: 1,
  //     allItems: 30,
  //     sync_status: false,
  //   },
  //   {
  //     title: "Theme settings",
  //     allTranslatedItems: 1,
  //     allItems: 30,
  //     sync_status: false,
  //   },
  // ]);
  const [settingsDataSource, setSettingsDataSource] = useState<TableDataType[]>(
    [
      {
        key: "notifications",
        title: "Notifications",
        allTranslatedItems: 1,
        // allItems: emailtemplate.nodes.length,
        allItems: 30,
        sync_status: false,
        navigation: "notification",
      },
      {
        key: "delivery",
        title: "Delivery",
        allTranslatedItems: 1,
        // allItems: delivery.length,
        allItems: 30,
        sync_status: false,
        navigation: "delivery",
      },
      {
        key: "shipping",
        title: "Shipping",
        allTranslatedItems: 1,
        // allItems: packingslip.nodes.length,
        allItems: 30,
        sync_status: false,
        navigation: "shipping",
      },
    ],
  );

  const submit = useSubmit();

  useEffect(() => {
    const newArray = shopLanguages
      .filter((language) => language.published)
      .filter((language) => !language.primary)
      .map((language) => ({
        label: language.name,
        key: language.locale,
      }));
    setmenuData(newArray);
    setCurrent(newArray[0].key);
  }, [shopLanguages]);

  useEffect(() => {
    if (actionData) {
      console.log(actionData.shopLanguagesAction); // 处理返回的数据
      // 例如更新状态
      setShopLanguages(actionData.shopLanguagesAction);
    }
  }, [actionData]);

  const onClick = (e: any) => {
    // 将 e.key 转换为字符串以确保 current 始终为 string
    setCurrent(e.key);
  };

  const handleSyncAll = () => {
    const formData = new FormData();
    formData.append("actionType", "sync");
    submit(formData, { method: "post", action: "/app/manage_translation" });
  };

  return (
    <Page>
      <TitleBar title="Manage Translation" />
      <Space direction="vertical" size="middle" style={{ display: "flex" }}>
        <AttentionCard
          title="Translation word credits have been exhausted."
          content="The translation cannot be completed due to exhausted credits."
          buttonContent="Get more word credits"
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
          <div className="manage-action">
            <Space>
              <Button type="default">Backup</Button>
              <Button type="primary" onClick={handleSyncAll}>
                Sync all
              </Button>
            </Space>
          </div>
        </div>
        <div className="manage-content-wrap">
          <div className="manage-content-left">
            <Space
              direction="vertical"
              size="middle"
              style={{ display: "flex" }}
            >
              <div className="search-input"></div>
              <ManageTranslationsCard
                cardTitle="Products"
                dataSource={productsDataSource}
              />
              <ManageTranslationsCard
                cardTitle="Online Store"
                dataSource={onlineStoreDataSource}
              />
              <ManageTranslationsCard
                cardTitle="Settings"
                dataSource={settingsDataSource}
              />
            </Space>
          </div>
          <div className="manage-content-right"></div>
        </div>
      </Space>
      <Outlet />
    </Page>
  );
};

export default Index;
