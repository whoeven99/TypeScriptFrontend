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
  GetLanguageStatus,
  AddUserFreeSubscription,
  InsertOrUpdateOrder,
  GetUserSubscriptionPlan,
  InitializationDetection,
  UserAdd,
  AddDefaultLanguagePack,
  InsertCharsByShopName,
  InsertTargets,
} from "~/api/serve";
import { ShopLocalesType } from "./app.language/route";
import { mutationAppSubscriptionCreate, queryShopLanguages } from "~/api/admin";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
// import i18n from "~/i18n";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

interface LoadingFetchType {
  shopLocales: string[];
  primaryLanguage: string[];
  initialization: boolean;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    await authenticate.admin(request);
    return json({
      apiKey: process.env.SHOPIFY_API_KEY || "",
    });
  } catch (error) {
    console.error("Error during authentication:", error);
    throw new Response("Error during authentication", { status: 500 });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;

  try {
    const formData = await request.formData();
    const initialization = JSON.parse(formData.get("initialization") as string);
    const loading = JSON.parse(formData.get("loading") as string);
    const languageData = JSON.parse(formData.get("languageData") as string);
    const userData = JSON.parse(formData.get("userData") as string);
    const translation = JSON.parse(formData.get("translation") as string);
    const languageCode = JSON.parse(formData.get("languageCode") as string);
    const statusData = JSON.parse(formData.get("statusData") as string);
    const payInfo = JSON.parse(formData.get("payInfo") as string);
    const orderInfo = JSON.parse(formData.get("orderInfo") as string);

    switch (true) {
      case !!initialization:
        try {
          const data: boolean = await AddUserFreeSubscription({
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
          const userStart = Date.now(); // 记录开始时间
          const data = await InitializationDetection({ request });
          switch (false) {
            case data?.add:
              await UserAdd({ request });
            case data?.insertCharsByShopName:
              await InsertCharsByShopName({ request });
            case data?.addDefaultLanguagePack:
              await AddDefaultLanguagePack({ request });
            default:
              console.log("Initialization has been completed");
          }
          const userEnd = Date.now(); // 记录结束时间
          console.log(`InitializationDetection took ${userEnd - userStart}ms`);
        } catch (error) {
          console.error("Error loading app:", error);
          return json({ error: "Error loading app" }, { status: 500 });
        }

      case !!languageData:
        try {
          const shopLanguagesStart = Date.now(); // 记录开始时间
          const shopLanguagesIndex: ShopLocalesType[] =
            await queryShopLanguages({
              shop,
              accessToken,
            });
          const shopLanguagesEnd = Date.now(); // 记录结束时间
          console.log(
            `queryShopLanguages took ${shopLanguagesEnd - shopLanguagesStart}ms`,
          );

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

          try {
            const insertStart = Date.now(); // 记录开始时间
            await InsertTargets({
              request,
              source: shopPrimaryLanguage[0].locale,
              targets: shopLocalesIndex,
            });
            const insertEnd = Date.now(); // 记录结束时间
            console.log(
              `ALL InsertShopTranslateInfo  took ${insertEnd - insertStart}ms`,
            );
          } catch (error) {
            console.error("Error insert languageInfo:", error);
            return json(
              { error: "Error insert languageInfo" },
              { status: 500 },
            );
          }

          const languagesStart = Date.now(); // 记录开始时间
          const languages = await GetLanguageList({ shop });
          const languagesEnd = Date.now(); // 记录结束时间
          console.log(
            `GetLanguageList took ${languagesEnd - languagesStart}ms`,
          );

          const data = shopLanguagesWithoutPrimaryIndex.map((lang, i) => ({
            key: i,
            src: languageLocaleInfo[lang.locale].countries,
            name: lang.name,
            localeName: languageLocaleInfo[lang.locale].Local,
            locale: lang.locale,
            status:
              languages.find((language: any) => language.target === lang.locale)
                ?.status || 0,
            published: lang.published,
          }));
          const languageSetting = {
            primaryLanguage: shopPrimaryLanguage[0].name,
            primaryLanguageCode: shopPrimaryLanguage[0].locale,
            shopLanguagesWithoutPrimary: shopLanguagesWithoutPrimaryIndex,
            shopLanguageCodesWithoutPrimary: shopLocalesIndex,
          };
          return json({
            data: data,
            languageSetting: languageSetting,
          });
        } catch (error) {
          console.error("Error statusData app:", error);
          return json({ error: "Error statusData app" }, { status: 500 });
        }

      case !!userData:
        try {
          const planStart = Date.now(); // 记录开始时间
          const plan = await GetUserSubscriptionPlan({ shop });
          const planEnd = Date.now(); // 记录结束时间
          console.log(`GetUserSubscriptionPlan took ${planEnd - planStart}ms`);
          const wordsStart = Date.now(); // 记录开始时间
          const words = await GetUserWords({ shop });
          const wordsEnd = Date.now(); // 记录结束时间
          console.log(`GetUserWords took ${wordsEnd - wordsStart}ms`);
          const data = {
            plan: plan,
            chars: words?.chars || 0,
            totalChars: words?.totalChars || 0,
          };
          return json({
            data: data,
          });
        } catch (error) {
          console.error("Error statusData app:", error);
          return json({ error: "Error statusData app" }, { status: 500 });
        }

      case !!translation:
        const source = translation.primaryLanguageCode;
        const selectedLanguage = translation.selectedLanguage;
        const translateResponse = await GetTranslate({
          request,
          source,
          target: selectedLanguage,
        });
        return json({ data: translateResponse });

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
          console.error("Error statusData app:", error);
          return json({ error: "Error statusData app" }, { status: 500 });
        }
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
          test: payInfo.test,
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
  const loadingFetcher = useFetcher<LoadingFetchType>();
  const { t } = useTranslation();

  useEffect(() => {
    shopify.loading(true);
    const formData = new FormData();
    formData.append("loading", JSON.stringify(true));
    loadingFetcher.submit(formData, {
      method: "post",
      action: "/app",
    });
  }, []);

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
          <Link to="/app/language">{t("Language")}</Link>
          <Link to="/app/manage_translation">{t("Manage Translation")}</Link>
          <Link to="/app/currency">{t("Currency")}</Link>
          <Link to="/app/glossary">{t("Glossary")}</Link>
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
