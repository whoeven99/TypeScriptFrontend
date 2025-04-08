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
import { useDispatch } from "react-redux";
import { setTableData } from "~/store/modules/languageTableData";

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
    const languageInit = JSON.parse(formData.get("languageInit") as string);
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
        const loadingDataStart = new Date();
        const loadingDataAStart = new Date();
        const init = await InitializationDetection({ shop });
        const loadingDataAEnd = new Date();
        const loadingDataA = loadingDataAEnd.getTime() - loadingDataAStart.getTime();
        console.log("loadingDataA: ", loadingDataA);

        const loadingDataBStart = new Date();
        await UserAdd({ shop, accessToken: accessToken as string, init: init?.add });
        const loadingDataBEnd = new Date();
        const loadingDataB = loadingDataBEnd.getTime() - loadingDataBStart.getTime();
        console.log("loadingDataB: ", loadingDataB);

        if (!init?.insertCharsByShopName) {
          const loadingDataCStart = new Date();
          await InsertCharsByShopName({ shop, accessToken: accessToken as string });
          const loadingDataCEnd = new Date();
          const loadingDataC = loadingDataCEnd.getTime() - loadingDataCStart.getTime();
          console.log("loadingDataC: ", loadingDataC);
        }

        if (!init?.addUserFreeSubscription) {
          const loadingDataDStart = new Date();
          await AddUserFreeSubscription({ shop });
          const loadingDataDEnd = new Date();
          const loadingDataD = loadingDataDEnd.getTime() - loadingDataDStart.getTime();
          console.log("loadingDataD: ", loadingDataD);
        }
        const loadingDataEnd = new Date();
        const loadingData = loadingDataEnd.getTime() - loadingDataStart.getTime();
        console.log("loadingData: ", loadingData);
        // const data = shopLanguagesWithoutPrimaryIndex.map((lang, i) => ({
        //   key: i,
        //   src: [],
        //   name: lang.name,
        //   localeName: "",
        //   locale: lang.locale,
        //   status: 0,
        //   published: lang.published,
        // }));

        // return json({ data, success: true });
        return true;
      } catch (error) {
        console.error("Error loading app:", error);
        return json({ error: "Error loading app" }, { status: 500 });
      }
    }

    if (languageInit) {
      try {
        const languageInitStart = new Date();
        const languageInitAStart = new Date();
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
        const languageInitAEnd = new Date();
        const languageInitA = languageInitAEnd.getTime() - languageInitAStart.getTime();
        console.log("languageInitA: ", languageInitA);

        const languageInitBStart = new Date();
        await InsertTargets({
          shop,
          accessToken: accessToken!,
          source: shopPrimaryLanguage[0].locale,
          targets: shopLocalesIndex,
        });
        const languageInitBEnd = new Date();
        const languageInitB = languageInitBEnd.getTime() - languageInitBStart.getTime();
        console.log("languageInitB: ", languageInitB);

        const languageInitEnd = new Date();
        const languageInit = languageInitEnd.getTime() - languageInitStart.getTime();
        console.log("languageInit: ", languageInit);

        return null;
      } catch (error) {
        console.error("Error languageInit app:", error);
      }
    }
    if (languageData) {
      try {
        const languageDataStart = new Date();
        const languageDataAStart = new Date();
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
        const languageDataAEnd = new Date();
        const languageDataA = languageDataAEnd.getTime() - languageDataAStart.getTime();
        console.log("languageDataA: ", languageDataA);

        const languageDataBStart = new Date();
        const languages = await GetLanguageList({ shop, source: shopPrimaryLanguage[0].locale });
        // const languages = response.data.response;

        const data = shopLanguagesWithoutPrimaryIndex.map((lang, i) => ({
          key: i,
          src: languageLocaleInfo ? languageLocaleInfo[lang.locale]?.countries : [],
          name: lang.name,
          localeName: languageLocaleInfo ? languageLocaleInfo[lang.locale]?.Local : "",
          locale: lang.locale,
          status:
            languages ? languages.find((language: any) => language.target === lang.locale)
              ?.status : 0,
          published: lang.published,
        }));
        const languageDataBEnd = new Date();
        const languageDataB = languageDataBEnd.getTime() - languageDataBStart.getTime();
        console.log("languageDataB: ", languageDataB);

        const languageDataCStart = new Date();
        const customApikeyData = await GetUserData({
          shop,
        });
        const languageDataC = languageDataCStart.getTime() - languageDataCStart.getTime();
        console.log("languageDataC: ", languageDataC);

        const languageSetting = {
          primaryLanguage: shopPrimaryLanguage[0].name,
          primaryLanguageCode: shopPrimaryLanguage[0].locale,
          shopLanguagesWithoutPrimary: shopLanguagesWithoutPrimaryIndex,
          shopLanguageCodesWithoutPrimary: shopLocalesIndex,
        };
        console.log(`${shop}根路由正常加载`);
        const languageDataEnd = new Date();
        const languageData = languageDataEnd.getTime() - languageDataStart.getTime();
        console.log("languageData: ", languageData);

        return json({ data, languageSetting, shop, customApikeyData: customApikeyData?.response?.googleKey });
      } catch (error) {
        console.error("Error languageData app:", error);
        return json({ error: "Error languageData app" }, { status: 500 });
      }
    }

    if (nearTransaltedData) {
      const nearTransaltedDataStart = new Date();
      const nearTransaltedDataAStart = new Date();
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
      const nearTransaltedDataAEnd = new Date();
      const nearTransaltedDataA = nearTransaltedDataAEnd.getTime() - nearTransaltedDataAStart.getTime();
      console.log("nearTransaltedDataA: ", nearTransaltedDataA);

      const nearTransaltedDataBStart = new Date();
      const data = await GetTranslateDOByShopNameAndSource({ shop, source: shopPrimaryLanguage[0].locale });
      const nearTransaltedDataBEnd = new Date();
      const nearTransaltedDataB = nearTransaltedDataBEnd.getTime() - nearTransaltedDataBStart.getTime();
      console.log("nearTransaltedDataB: ", nearTransaltedDataB);

      const nearTransaltedDataEnd = new Date();
      const nearTransaltedData = nearTransaltedDataEnd.getTime() - nearTransaltedDataStart.getTime();
      console.log("nearTransaltedData: ", nearTransaltedData);

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
        test: process.env.NODE_ENV === "development",
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
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const loadingFetcher = useFetcher<any>();
  const languageFetcher = useFetcher<any>();

  useEffect(() => {
    loadingFetcher.submit({ loading: JSON.stringify(true) }, {
      method: "post",
      action: "/app",
    });
    languageFetcher.submit({ languageInit: JSON.stringify(true) }, {
      method: "post",
      action: "/app",
    });
  }, []);

  useEffect(() => {
    if (loadingFetcher.data) {
      if (loadingFetcher.data?.success) {
        console.log("loadingFetcher.data", loadingFetcher.data);
        dispatch(setTableData(loadingFetcher.data.data));
      }
    }
  }, [loadingFetcher.data]);

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
          {loadingFetcher.data && <Link to="/app/pricing">{t("Pricing")}</Link>}
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
