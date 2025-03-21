import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
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
  getCredits,
  GetUserInitTokenByShopName,
  GetTranslateDOByShopNameAndSource,
  GetUserData,
} from "~/api/serve";
import { ShopLocalesType } from "./app.language/route";
import {
  mutationAppPurchaseOneTimeCreate,
  queryShopLanguages,
} from "~/api/admin";
import { Suspense, useEffect } from "react";
import { useTranslation } from "react-i18next";

import { ConfigProvider } from "antd";
import { SessionService } from "~/utils/session.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    return json({
      apiKey: process.env.SHOPIFY_API_KEY || "",
    });
  } catch (error) {
    console.error("Error during authentication app:", error);
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const sessionService = await SessionService.init(request);
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  const shopSession = {
    shop: shop,
    accessToken: accessToken as string,
  };
  sessionService.setShopSession(shopSession);
  try {
    const formData = await request.formData();
    // const initialization = JSON.parse(formData.get("initialization") as string);
    const loading = JSON.parse(formData.get("loading") as string);
    const languageData = JSON.parse(formData.get("languageData") as string);
    const nearTransaltedData = JSON.parse(formData.get("nearTransaltedData") as string);
    const userData = JSON.parse(formData.get("userData") as string);
    const translation = JSON.parse(formData.get("translation") as string);
    const languageCode = JSON.parse(formData.get("languageCode") as string);
    const statusData = JSON.parse(formData.get("statusData") as string);
    const payInfo = JSON.parse(formData.get("payInfo") as string);
    const orderInfo = JSON.parse(formData.get("orderInfo") as string);
    const rate = JSON.parse(formData.get("rate") as string);
    const credits = JSON.parse(formData.get("credits") as string);
    const recalculate = JSON.parse(formData.get("recalculate") as string);
    // if (initialization) {
    //   try {
    //     const data: boolean = await AddUserFreeSubscription({ shop });
    //     return json({ data });
    //   } catch (error) {
    //     console.error("Error userCharsInitialization:", error);
    //     return json(
    //       { error: "Error userCharsInitialization" },
    //       { status: 500 },
    //     );
    //   }
    // }

    if (loading) {
      try {
        const data = await InitializationDetection({ shop });
        if (!data?.add) await UserAdd({ shop, accessToken: accessToken as string });
        if (!data?.insertCharsByShopName)
          await InsertCharsByShopName({ shop, accessToken: accessToken as string });
        if (!data?.addDefaultLanguagePack)
          await AddDefaultLanguagePack({ shop });
        if (!data?.addUserFreeSubscription)
          await AddUserFreeSubscription({ shop });
        const shopLanguagesIndex: ShopLocalesType[] = await queryShopLanguages({
          shop,
          accessToken: accessToken as string,
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
        await InsertTargets({
          shop,
          accessToken: accessToken!,
          source: shopPrimaryLanguage[0].locale,
          targets: shopLocalesIndex,
        });

        return true
      } catch (error) {
        console.error("Error loading app:", error);
        return json({ error: "Error loading app" }, { status: 500 });
      }
    }

    if (languageData) {
      try {
        const shopLanguagesIndex: ShopLocalesType[] = await queryShopLanguages({
          shop,
          accessToken: accessToken as string,
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

        const languages = await GetLanguageList({ shop, source: shopPrimaryLanguage[0].locale });

        // const response = await axios({
        //   url: `${process.env.SERVER_URL}/translate/readInfoByShopName?shopName=${shop}&&source=${shopPrimaryLanguage[0].locale}`,
        //   method: "GET",
        // });
        // const languages = response.data.response;

        const data = shopLanguagesWithoutPrimaryIndex.map((lang, i) => ({
          key: i,
          src: languageLocaleInfo[lang.locale].countries,
          name: lang.name,
          localeName: languageLocaleInfo[lang.locale].Local,
          locale: lang.locale,
          status:
            languages ? languages.find((language: any) => language.target === lang.locale)
              ?.status : 0,
          published: lang.published,
        }));

        const customApikeyData = await GetUserData({
          shop,
        });
        console.log("GetUserData: ", customApikeyData);

        const languageSetting = {
          primaryLanguage: shopPrimaryLanguage[0].name,
          primaryLanguageCode: shopPrimaryLanguage[0].locale,
          shopLanguagesWithoutPrimary: shopLanguagesWithoutPrimaryIndex,
          shopLanguageCodesWithoutPrimary: shopLocalesIndex,
        };
        console.log(`${shop}根路由正常加载`);

        return json({ data, languageSetting, shop, customApikeyData: customApikeyData?.response?.googleKey });
      } catch (error) {
        console.error("Error languageData app:", error);
        return json({ error: "Error languageData app" }, { status: 500 });
      }
    }

    if (nearTransaltedData) {
      const shopLanguagesIndex: ShopLocalesType[] = await queryShopLanguages({
        shop,
        accessToken: accessToken as string,
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

      const Cstarttime = new Date();
      const data = await GetTranslateDOByShopNameAndSource({ shop, source: shopPrimaryLanguage[0].locale });
      console.log("GetTranslateDOByShopNameAndSource: ", data);
      const Cendtime = new Date();
      const Ctime = Cendtime.getTime() - Cstarttime.getTime();
      console.log("Ctime: ", Ctime);

      if (shopLocalesIndex.includes(data.response?.target) && (data.response?.status !== 1 || !shopLanguagesWithoutPrimaryIndex.find((item) => item.locale === data.response?.target)?.published)) {
        return {
          translatingLanguage: {
            source: data.response?.source || shopPrimaryLanguage[0].locale,
            target: data.response?.target || "",
            status: data.response?.status || 0,
            resourceType: data.response?.resourceType || "",
          }
        }
      } else {
        return {
          translatingLanguage: {
            source: data.response?.source || shopPrimaryLanguage[0].locale,
            target: "",
            status: 0,
            resourceType: "",
          }
        };
      }
    }

    if (userData) {
      try {
        // const plan = await GetUserSubscriptionPlan({ shop });
        const words = await GetUserWords({ shop });
        const data = {
          // plan,
          chars: words?.chars || 0,
          totalChars: words?.totalChars || 0,
        };
        return json({ data });
      } catch (error) {
        console.error("Error userData app:", error);
        return json({ error: "Error userData app" }, { status: 500 });
      }
    }

    if (translation) {
      const source = translation.primaryLanguageCode;
      const target = translation.selectedLanguage;
      const data = await GetTranslate({
        shop,
        accessToken: accessToken as string,
        source,
        target,
        translateSettings1: translation.translateSettings1,
        translateSettings2: translation.translateSettings2,
        translateSettings3: translation.translateSettings3,
      });
      return json({ data: data });
    }

    if (statusData) {
      try {
        if (statusData) {
          const data = await GetLanguageStatus({
            shop,
            source: statusData.source,
            target: statusData.target,
          });
          console.log("GetLanguageStatus: ", data);
          return json({ data });
        }
      } catch (error) {
        console.error("Error statusData app:", error);
        return json({ error: "Error statusData app" }, { status: 500 });
      }
    }

    if (languageCode) {
      const totalWords = await GetTotalWords({ shop, accessToken: accessToken as string, target: languageCode });
      return json({ totalWords });
    }

    if (payInfo) {
      const returnUrl = new URL(
        `https://admin.shopify.com/store/${shop.split(".")[0]}/apps/ciwi-translator/app`,
      );
      const payData = await mutationAppPurchaseOneTimeCreate({
        shop,
        accessToken: accessToken as string,
        name: payInfo.name,
        price: payInfo.price,
        returnUrl,
        test: payInfo.test,
      });
      return json({ data: payData });
    }

    if (orderInfo) {
      const orderData = await InsertOrUpdateOrder({
        shop,
        id: orderInfo.id,
        amount: orderInfo.amount,
        name: orderInfo.name,
        createdAt: orderInfo.createdAt,
        status: orderInfo.status,
        confirmationUrl: orderInfo.confirmationUrl,
      });
      return json({ data: orderData });
    }

    if (credits) {
      const data = await getCredits({ shop, accessToken: accessToken!, target: credits.target, source: credits.source });
      return json({ data });
    }

    if (recalculate) {
      try {
        const data = await GetUserInitTokenByShopName({ shop });
        return json({ data });
      } catch (error) {
        console.error("Error recalculate app:", error);
        return json({
          data: {
            success: false,
            message: "Error recalculate app",
          }
        });
      }
    }

    if (typeof rate === 'number') {
      console.log(`商店${shop}的评分: ${rate}`)
    }

    return json({ success: false, message: "Invalid data" });
  } catch (error) {
    console.error("Error action app:", error);
    return json({ error: "Error action app" }, { status: 500 });
  }
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();
  const loadingFetcher = useFetcher<any>();
  const { t } = useTranslation();

  useEffect(() => {
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
            colorPrimary: "#007F61", // 设置主色
          },
        }}
      >
        <NavMenu>
          <Link to="/app" rel="home">
            Home
          </Link>
          {loadingFetcher.data && <Link to="/app/language">{t("Language")}</Link>}
          {loadingFetcher.data && <Link to="/app/manage_translation">{t("Manage Translation")}</Link>}
          {loadingFetcher.data && <Link to="/app/currency">{t("Currency")}</Link>}
          {loadingFetcher.data && <Link to="/app/glossary">{t("Glossary")}</Link>}
        </NavMenu>
        <Suspense>
          <Outlet />
        </Suspense>
      </ConfigProvider>
    </AppProvider >
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
