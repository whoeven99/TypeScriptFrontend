import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Link,
  Outlet,
  useFetcher,
  useLoaderData,
  useRouteError,
} from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";

import { authenticate } from "../shopify.server";
import { ConfigProvider } from "antd";
import {
  GetTotalWords,
  GetTranslate,
  GetTranslationItemsInfo,
} from "~/api/serve";
import { ShopLocalesType } from "./app.language/route";
import { queryShopLanguages } from "~/api/admin";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { updateData } from "~/store/modules/languageItemsData";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  const shopLanguages: ShopLocalesType[] = await queryShopLanguages({
    request,
  });
  const shopLanguagesWithoutPrimary = shopLanguages.filter(
    (language) => !language.primary,
  );
  const shopLocales = shopLanguagesWithoutPrimary.map((item) => item.locale);

  return json({ apiKey: process.env.SHOPIFY_API_KEY || "", shopLocales });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const formData = await request.formData();
    const translation = JSON.parse(formData.get("translation") as string);
    const itemsInfo = JSON.parse(formData.get("itemsInfo") as string);
    const languageCode = JSON.parse(formData.get("languageCode") as string);
    console.log(languageCode);
    
    switch (true) {
      case !!translation:
        const source = translation.primaryLanguage.locale;
        const target = translation.selectedLanguage;
        const statu = await GetTranslate({ request, source, target });
        return json({ statu: statu });

      case !!itemsInfo:
        const data = await GetTranslationItemsInfo({ request, itemsInfo });
        return json({ data: data });

      case !!languageCode:
        const totalWords = await GetTotalWords({
          request,
          target: languageCode,
        });
        return json({ totalWords: totalWords });
      default:
        // 你可以在这里处理一个默认的情况，如果没有符合的条件
        return json({ success: false, message: "Invalid data" });
    }
  } catch (error) {
    console.error("Error action app:", error);
    return json({ error: "Error action app" }, { status: 500 });
  }
};

export default function App() {
  const { apiKey, shopLocales } = useLoaderData<typeof loader>();
  const resourceTypes = [
    "Article",
    "Blog titles",
    "Collection",
    "delivery",
    "Filters",
    "Navigation",
    "Store metadata",
    "Metaobjects",
    "Theme",
    "Shipping",
    "Pages",
    "Products",
    "Policies",
  ];
  const fetcher = useFetcher();
  const dispatch = useDispatch();

  useEffect(() => {
    if (shopLocales) {
      const formData = new FormData();
      formData.append(
        "itemsInfo",
        JSON.stringify({
          targets: shopLocales,
          resourceTypes: resourceTypes,
        }),
      );
      fetcher.submit(formData, {
        method: "post",
        action: "/app",
      }); // 提交表单请求
    }
    // 将选中的语言作为字符串发送
  }, []);

  useEffect(() => {
    if (fetcher.data && Array.isArray((fetcher.data as { data: any[] }).data)) {
      dispatch(updateData((fetcher.data as { data: any[] }).data));
    }
  }, [fetcher.data]);

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: "rgb(117,211,68)", // 设置主色
          },
        }}
      >
        <NavMenu>
          <Link to="/app" rel="home">
            Home
          </Link>
          <Link to="/app/language">Language</Link>
          <Link to="/app/manage_translation">Manage Translation</Link>
        </NavMenu>
        <Outlet />
      </ConfigProvider>
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
