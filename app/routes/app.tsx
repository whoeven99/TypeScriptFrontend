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
  useLocation,
  useParams,
  useRouteError,
} from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";

import { authenticate } from "../shopify.server";
import { ConfigProvider } from "antd";
import {
  GetLanguageLocaleInfo,
  GetLanguageList,
  GetTotalWords,
  GetTranslate,
  GetItemsInSqlByShopName,
  GetUserSubscriptionPlan,
  GetUserWords,
  GetTranslationItemsInfo,
  UpdateUser,
  InsertShopTranslateInfo,
} from "~/api/serve";
import { ShopLocalesType } from "./app.language/route";
import { queryShop, queryShopLanguages } from "~/api/admin";
import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { updateData } from "~/store/modules/languageItemsData";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

interface LoadingFetchType {
  shopLocales: string[];
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    await authenticate.admin(request);
    return json({ apiKey: process.env.SHOPIFY_API_KEY || "" });
  } catch (error) {
    console.error("Error load app:", error);
    throw new Response("Error load app", { status: 500 });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;

  try {
    const formData = await request.formData();
    const loading = JSON.parse(formData.get("loading") as string);
    const index = JSON.parse(formData.get("index") as string);
    const translation = JSON.parse(formData.get("translation") as string);
    const targets = JSON.parse(formData.get("targets") as string);
    const syncData = JSON.parse(formData.get("syncData") as string);
    const languageCode = JSON.parse(formData.get("languageCode") as string);

    switch (true) {
      case !!loading:
        const shopLanguages: ShopLocalesType[] = await queryShopLanguages({
          shop,
          accessToken,
        });
        const shopLanguagesWithoutPrimary = shopLanguages.filter(
          (language) => !language.primary,
        );
        const shopLocales = shopLanguagesWithoutPrimary.map(
          (item) => item.locale,
        );
        await UpdateUser({ request });

        return json({ shopLocales: shopLocales });
      case !!index:
        const shopData = await queryShop({ request });
        const shopLanguagesIndex: ShopLocalesType[] = await queryShopLanguages({
          shop,
          accessToken,
        });
        const words = await GetUserWords({ shop });
        const plan = await GetUserSubscriptionPlan({ shop, accessToken });
        const shopPrimaryLanguage = shopLanguagesIndex.filter(
          (language) => language.primary,
        );
        const shopLanguagesWithoutPrimaryIndex = shopLanguagesIndex.filter(
          (language) => !language.primary,
        );
        const shopLocalesIndex = shopLanguagesWithoutPrimaryIndex.map(
          (item) => item.locale,
        );
        const languageLocaleInfo = await GetLanguageLocaleInfo({
          locale: shopLocalesIndex,
        });
        for (const target of shopLocalesIndex) {
          try {
            await InsertShopTranslateInfo({
              request,
              source: shopPrimaryLanguage[0].locale,
              target,
            });
          } catch (error) {
            console.error("Error insert languageInfo:", error);
            return json(
              { error: "Error insert languageInfo" },
              { status: 500 },
            );
          }
        }
        const languages = await GetLanguageList({ shop, accessToken });
        const languageData = shopLanguagesWithoutPrimaryIndex.map(
          (lang, i) => ({
            key: i,
            src: languageLocaleInfo[shopLocalesIndex[i]].countries || "error",
            name: lang.name,
            localeName: languageLocaleInfo[shopLocalesIndex[i]].Local,
            locale: lang.locale,
            status:
              languages.find((language: any) => language.target === lang.locale)
                ?.status || 0,
            published: lang.published,
          }),
        );
        const user = {
          name: shopData.name,
          plan: plan,
          chars: words?.chars,
          totalChars: words?.totalChars,
          primaryLanguage: shopPrimaryLanguage[0].name,
          shopLanguagesWithoutPrimary: shopLanguagesWithoutPrimaryIndex,
          shopLanguageCodesWithoutPrimary: shopLocalesIndex,
        };
        console.log("user: ", user);
        return json({
          languageData,
          user,
        });
      case !!translation:
        const source = translation.primaryLanguage.locale;
        const selectedLanguage = translation.selectedLanguage;
        const statu = await GetTranslate({
          request,
          source,
          target: selectedLanguage,
        });
        return json({ statu: statu });
      case !!targets:
        const data = await GetItemsInSqlByShopName({
          shop,
          accessToken,
          targets,
        });
        return json({ data: data });
      case !!syncData:
        try {
          console.log("syncData: ", syncData);
          await GetTranslationItemsInfo({
            shop,
            accessToken,
            targets: syncData,
          });
        } catch (error) {
          console.error("Error GetTranslationItemsInfo:", error);
          return json(
            { error: "Error GetTranslationItemsInfo" },
            { status: 500 },
          );
        }
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
  const { apiKey } = useLoaderData<typeof loader>();
  const [shopLocales, setShopLoacles] = useState<string[]>([]);

  const loadingFetcher = useFetcher<LoadingFetchType>();
  const dispatch = useDispatch();
  const fetcher = useFetcher<any>();
  const syncFetcher = useFetcher<any>();
  // const location = useLocation();

  useEffect(() => {
    shopify.loading(true);
    const formData = new FormData();
    formData.append("loading", JSON.stringify(true));
    loadingFetcher.submit(formData, {
      method: "post",
      action: "/app",
    });
  }, []);

  useEffect(() => {
    if (shopLocales.length) {
      console.log(shopLocales);
      const formData = new FormData();
      formData.append("targets", JSON.stringify(shopLocales));
      fetcher.submit(formData, {
        method: "post",
        action: "/app",
      }); // 提交表单请求
    }
  }, [shopLocales]);

  useEffect(() => {
    if (loadingFetcher.data) {
      setShopLoacles(loadingFetcher.data.shopLocales);
    }
    if (fetcher.data && Array.isArray((fetcher.data as { data: any[] }).data)) {
      dispatch(updateData((fetcher.data as { data: any[] }).data));
    }
    shopify.loading(false);
    if (loadingFetcher.data && fetcher.data && shopLocales.length) {
      const formData = new FormData();
      formData.append("syncData", JSON.stringify(shopLocales));
      syncFetcher.submit(formData, {
        method: "post",
        action: "/app",
      }); // 提交表单请求
    }
  }, [fetcher.data, loadingFetcher.data]);

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
