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
  GetLanguageLocaleInfo,
  GetLanguageList,
  GetTotalWords,
  GetTranslate,
  GetUserWords,
  GetTranslationItemsInfo,
  UpdateUser,
  InsertShopTranslateInfo,
  GetLanguageStatus,
  GetUserSubscriptionPlan,
} from "~/api/serve";
import { ShopLocalesType } from "./app.language/route";
import { queryShopLanguages } from "~/api/admin";
import { useEffect, useRef, useState } from "react";


export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

interface LoadingFetchType {
  shopLocales: string[];
  primaryLanguage: string[];
  initialization: boolean;
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
    // const getData = JSON.parse(formData.get("getData") as string);
    const itemsInfo = JSON.parse(formData.get("itemsInfo") as string);
    const languageCode = JSON.parse(formData.get("languageCode") as string);
    const statusData = JSON.parse(formData.get("statusData") as string);

    switch (true) {
      case !!loading:
        //   try {
        //     const shopLanguages: ShopLocalesType[] = await queryShopLanguages({
        //       shop,
        //       accessToken,
        //     });
        //     const primaryLanguage = shopLanguages
        //       .filter((language) => language.primary)
        //       .map((item) => item.locale);

        //     const shopLocales = shopLanguages
        //       .filter((language) => !language.primary)
        //       .map((item) => item.locale);

        const userStart = Date.now(); // 记录开始时间
        await UpdateUser({ request });
        const userEnd = Date.now(); // 记录结束时间
        console.log(`UpdateUser took ${userEnd - userStart}ms`);
      //     console.log("primaryLanguage: ", primaryLanguage);
      //     console.log("shopLocales: ", shopLocales);
      //     return json({
      //       shopLocales: shopLocales,
      //       primaryLanguage: primaryLanguage,
      //     });
      //   } catch (error) {
      //     console.error("Error action app:", error);
      //     return json({ error: "Error action app" }, { status: 500 });
      //   }
      case !!index:
        const planStart = Date.now(); // 记录开始时间
        const plan = await GetUserSubscriptionPlan({ shop });
        const planEnd = Date.now(); // 记录结束时间
        console.log(`GetUserSubscriptionPlan took ${planEnd - planStart}ms`);

        const shopLanguagesStart = Date.now(); // 记录开始时间
        const shopLanguagesIndex: ShopLocalesType[] = await queryShopLanguages({
          shop,
          accessToken,
        });
        const shopLanguagesEnd = Date.now(); // 记录结束时间
        console.log(
          `queryShopLanguages took ${shopLanguagesEnd - shopLanguagesStart}ms`,
        );

        const wordsStart = Date.now(); // 记录开始时间
        const words = await GetUserWords({ shop });
        const wordsEnd = Date.now(); // 记录结束时间
        console.log(`GetUserWords took ${wordsEnd - wordsStart}ms`);

        const shopPrimaryLanguage = shopLanguagesIndex.filter(
          (language) => language.primary,
        );
        const shopLanguagesWithoutPrimaryIndex = shopLanguagesIndex.filter(
          (language) => !language.primary,
        );
        const shopLocalesIndex = shopLanguagesWithoutPrimaryIndex.map(
          (item) => item.locale,
        );

        const languageLocaleInfoStart = Date.now(); // 记录开始时间
        const languageLocaleInfo = await GetLanguageLocaleInfo({
          locale: shopLocalesIndex,
        });
        const languageLocaleInfoEnd = Date.now(); // 记录结束时间
        console.log(
          `GetLanguageLocaleInfo took ${languageLocaleInfoEnd - languageLocaleInfoStart}ms`,
        );

        for (const target of shopLocalesIndex) {
          try {
            const insertStart = Date.now(); // 记录开始时间
            await InsertShopTranslateInfo({
              request,
              source: shopPrimaryLanguage[0].locale,
              target,
            });
            const insertEnd = Date.now(); // 记录结束时间
            console.log(
              `InsertShopTranslateInfo for ${target} took ${insertEnd - insertStart}ms`,
            );
          } catch (error) {
            console.error("Error insert languageInfo:", error);
            return json(
              { error: "Error insert languageInfo" },
              { status: 500 },
            );
          }
        }

        const languagesStart = Date.now(); // 记录开始时间
        const languages = await GetLanguageList({ shop, accessToken });
        const languagesEnd = Date.now(); // 记录结束时间
        console.log(`GetLanguageList took ${languagesEnd - languagesStart}ms`);

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
          plan: plan,
          chars: words?.chars,
          totalChars: words?.totalChars,
          primaryLanguage: shopPrimaryLanguage[0].name,
          primaryLanguageCode: shopPrimaryLanguage[0].locale,
          shopLanguagesWithoutPrimary: shopLanguagesWithoutPrimaryIndex,
          shopLanguageCodesWithoutPrimary: shopLocalesIndex,
        };

        console.log("user: ", user);

        return json({
          languageData,
          user,
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
          const data = await GetLanguageStatus({
            shop,
            source: statusData.source,
            target: statusData.target,
          });
          return json({ data: data });
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
  // const [shopLocales, setShopLoacles] = useState<string[]>([]);
  // const [primaryLanguage, setPrimaryLanguage] = useState<string[]>([]);
  const loadingFetcher = useFetcher<LoadingFetchType>();
  // const dispatch = useDispatch();
  // const fetcher = useFetcher<any>();
  // const resourceTypes = [
  //   "Collection",
  //   "Theme",
  //   "Article",
  //   "Blog titles",
  //   "Filters",
  //   "Metaobjects",
  //   "Pages",
  //   "Policies",
  //   "Products",
  //   "Navigation",
  //   "Store metadata",
  //   "Shop",
  //   "Shipping",
  //   "Delivery",
  // ];

  useEffect(() => {
    shopify.loading(true);
    const formData = new FormData();
    formData.append("loading", JSON.stringify(true));
    loadingFetcher.submit(formData, {
      method: "post",
      action: "/app",
    });
  }, []);

  // useEffect(() => {
  //   if (loadingFetcher.data) {
  //     setShopLoacles(loadingFetcher.data.shopLocales);
  //     setPrimaryLanguage(loadingFetcher.data.primaryLanguage);
  //   }
  // }, [loadingFetcher.data]);

  // useEffect(() => {
  //   if (shopLocales.length && primaryLanguage.length) {
  //     const formData = new FormData();
  //     formData.append(
  //       "itemsInfo",
  //       JSON.stringify({
  //         source: primaryLanguage,
  //         target: shopLocales[0],
  //         resourceTypes: resourceTypes,
  //       }),
  //     );
  //     fetcher.submit(formData, {
  //       method: "post",
  //       action: "/app",
  //     }); // 提交表单请求
  //   }
  // }, [shopLocales, primaryLanguage]);

  // useEffect(() => {
  //   if (fetcher.data) {
  //     dispatch(updateData(fetcher.data.data));
  //   }
  // }, [fetcher.data]);

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
