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
  GetUserSubscriptionPlan,
  GetUserWords,
  GetTranslationItemsInfo,
  UpdateUser,
  InsertShopTranslateInfo,
  GetLanguageStatus,
  userCharsInitialization,
} from "~/api/serve";
import { ShopLocalesType } from "./app.language/route";
import { queryShop, queryShopLanguages } from "~/api/admin";
import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { updateData } from "~/store/modules/languageItemsData";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

interface LoadingFetchType {
  shopLocales: string[];
  primaryLanguage: string[];
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
    const initialization = JSON.parse(formData.get("initialization") as string);
    const loading = JSON.parse(formData.get("loading") as string);
    const index = JSON.parse(formData.get("index") as string);
    const translation = JSON.parse(formData.get("translation") as string);
    // const getData = JSON.parse(formData.get("getData") as string);
    const itemsInfo = JSON.parse(formData.get("itemsInfo") as string);
    const languageCode = JSON.parse(formData.get("languageCode") as string);
    const statusData = JSON.parse(formData.get("statusData") as string);

    switch (true) {
      case !!initialization:
        try {
          const data: boolean = await userCharsInitialization({
            shop,
          });
          return json({
            data: data,
          });
        } catch (error) {
          console.error("Error userCharsInitialization:", error);
          return json(
            { error: "Error userCharsInitialization" },
            { status: 500 },
          );
        }
      case !!loading:
        try {
          const shopLanguages: ShopLocalesType[] = await queryShopLanguages({
            shop,
            accessToken,
          });
          const primaryLanguage = shopLanguages
            .filter((language) => language.primary)
            .map((item) => item.locale);

          const shopLocales = shopLanguages
            .filter((language) => !language.primary)
            .map((item) => item.locale);
          await UpdateUser({ request });
          return json({
            shopLocales: shopLocales,
            primaryLanguage: primaryLanguage,
          });
        } catch (error) {
          console.error("Error action app:", error);
          return json({ error: "Error action app" }, { status: 500 });
        }
      case !!index:
        const shopData = await queryShop({ request });
        const shopLanguagesIndex: ShopLocalesType[] = await queryShopLanguages({
          shop,
          accessToken,
        });
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
        const plan = await GetUserSubscriptionPlan({ shop });
        const words = await GetUserWords({ shop });
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
          chars: words?.chars || 0,
          totalChars: words?.totalChars || 0,
          primaryLanguage: shopPrimaryLanguage[0].name,
          primaryLanguageCode: shopPrimaryLanguage[0].locale,
          shopLanguagesWithoutPrimary: shopLanguagesWithoutPrimaryIndex,
          shopLanguageCodesWithoutPrimary: shopLocalesIndex,
        };
        console.log("plan: ", plan);
        return json({
          languageData,
          user,
          plan,
        });
      case !!translation:
        const source = translation.primaryLanguageCode;
        const selectedLanguage = translation.selectedLanguage;
        const statu = await GetTranslate({
          request,
          source,
          target: selectedLanguage,
        });
        return json({ statu: statu });
      // case !!getData:
      //   console.log("getData: ", getData);
      //   const data = await GetItemsInSqlByShopName({
      //     shop,
      //     accessToken,
      //     source: getData.source[0],
      //     targets: getData.targets,
      //   });
      //   return json({ data: data });
      case !!itemsInfo:
        try {
          const promises = itemsInfo.resourceTypes.map(
            (resourceType: string) => {
              return GetTranslationItemsInfo({
                shop,
                accessToken,
                source: itemsInfo.source,
                target: itemsInfo.target,
                resourceType: resourceType,
              });
            },
          );

          // 等待所有请求并发完成
          const res = await Promise.all(promises);
          console.log("All translations fetched:", res);
          return json({ data: res });
        } catch (error) {
          console.error("Error GetTranslationItemsInfo:", error);
          return json(
            { error: "Error GetTranslationItemsInfo" },
            { status: 500 },
          );
        }
      case !!statusData:
        try {
          console.log("statusData:", statusData);
          if (statusData) {
            const data = await GetLanguageStatus({
              shop,
              source: statusData.source,
              target: statusData.target,
            });
            return json({ data: data });
          }
        } catch (error) {
          console.error("Error GetLanguageStatus:", error);
          return json({ error: "Error GetLanguageStatus" }, { status: 500 });
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
  const [primaryLanguage, setPrimaryLanguage] = useState<string[]>([]);

  const loadingFetcher = useFetcher<LoadingFetchType>();
  const dispatch = useDispatch();
  const fetcher = useFetcher<any>();
  // const location = useLocation();
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
    if (loadingFetcher.data) {
      setShopLoacles(loadingFetcher.data.shopLocales);
      setPrimaryLanguage(loadingFetcher.data.primaryLanguage);
    }
  }, [loadingFetcher.data]);

  useEffect(() => {
    if (shopLocales.length && primaryLanguage.length) {
      const formData = new FormData();
      formData.append(
        "itemsInfo",
        JSON.stringify({
          source: primaryLanguage,
          target: shopLocales[0],
          resourceTypes: resourceTypes,
        }),
      );
      fetcher.submit(formData, {
        method: "post",
        action: "/app",
      }); // 提交表单请求
    }
  }, [shopLocales, primaryLanguage]);

  useEffect(() => {
    if (fetcher.data) {      
      dispatch(updateData(fetcher.data.data));
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
          <Link to="/app/currency">Currency</Link>
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
