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
  GetItemsInSqlByShopName,
  GetUserSubscriptionPlan,
  GetUserWords,
  GetTranslationItemsInfo,
  UpdateUser,
  GetLanguageStatus,
  InsertOrUpdateOrder,
} from "~/api/serve";
import { ShopLocalesType } from "./app.language/route";
import { mutationAppSubscriptionCreate, queryShopLanguages } from "~/api/admin";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { updateData } from "~/store/modules/languageItemsData";
import { updateNumber } from "~/store/modules/totalCharacters";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

interface LoadingFetchType {
  shopLocales: string[];
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    await authenticate.admin(request);
    console.log(process.env.SHOPIFY_API_KEY);
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
    const target = JSON.parse(formData.get("target") as string);
    const statusData = JSON.parse(formData.get("statusData") as string);
    const languageCode = JSON.parse(formData.get("languageCode") as string);
    const payInfo = JSON.parse(formData.get("payInfo") as string);
    const orderInfo = JSON.parse(formData.get("orderInfo") as string);

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
        const shopLanguagesIndex: ShopLocalesType[] = await queryShopLanguages({
          shop,
          accessToken,
        });
        const words = await GetUserWords({ shop });
        const plan = await GetUserSubscriptionPlan({ shop, accessToken });
        const languages = await GetLanguageList({ shop, accessToken });
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

        return json({
          languageData,
          user,
        });
      case !!translation:
        const source = translation.primaryLanguage.locale;
        const selectedLanguage = translation.selectedLanguage;
        const translateResponse = await GetTranslate({
          request,
          source,
          target: selectedLanguage,
        });
        return json({ data: translateResponse });
      case !!target:
        const targetData = await GetItemsInSqlByShopName({
          shop,
          accessToken,
          target,
        });
        await GetTranslationItemsInfo({ shop, accessToken, target });
        return json({ data: targetData });
      case !!statusData:
        const statusResponse = await GetLanguageStatus({
          shop,
          source: statusData.source,
          target: statusData.target,
        });
        return json({ data: statusResponse });
      case !!languageCode:
        const totalWords = await GetTotalWords({
          request,
          target: languageCode,
        });
        return json({ totalWords: totalWords });
      case !!payInfo:
        const returnUrl: URL = new URL(
          `https://admin.shopify.com/store/${shop.split(".")[0]}/apps/ciwi-translator/app`,
        );
        console.log(returnUrl);
        const payData = await mutationAppSubscriptionCreate({
          request,
          name: payInfo.name,
          price: payInfo.price,
          returnUrl,
        });
        return json({ data: payData });
      case !!orderInfo:
        const orderData = await InsertOrUpdateOrder({
          shop: shop,
          id: orderInfo.id,
          amount: orderInfo.amount,
          name: orderInfo.name,
          createdAt: orderInfo.createdAt,
          status: orderInfo.status,
          confirmationUrl: orderInfo.confirmationUrl,
        });
        return json({ data: orderData });
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
  const fetcher = useFetcher();

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
    if (shopLocales) {
      const formData = new FormData();
      formData.append("target", JSON.stringify(shopLocales[0]));
      fetcher.submit(formData, {
        method: "post",
        action: "/app",
      }); // 提交表单请求
    }
  }, [shopLocales]);

  useEffect(() => {
    if (fetcher.data && Array.isArray((fetcher.data as { data: any[] }).data)) {
      const items = (fetcher.data as { data: any[] }).data;
      const totalCharacters =
        (items.find((item: any) => item.type === "Article").totalNumber +
          items.find((item: any) => item.type === "Products").totalNumber) *
          1000 +
        100000;
      dispatch(updateData(items));
      dispatch(updateNumber(totalCharacters));
    }
  }, [fetcher.data]);

  useEffect(() => {
    if (loadingFetcher.data) {
      setShopLoacles(loadingFetcher.data.shopLocales);
    }
    shopify.loading(false);
  }, [loadingFetcher.data]);

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
