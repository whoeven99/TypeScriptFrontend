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
} from "~/api/JavaServer";
import { ShopLocalesType } from "./app.language/route";
import {
  mutationAppPurchaseOneTimeCreate,
  queryShopLanguages,
} from "~/api/admin";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { ConfigProvider } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { setUserConfig } from "~/store/modules/userConfig";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async () => {
  return json({
    apiKey: process.env.SHOPIFY_API_KEY || "",
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;

  try {
    const formData = await request.formData();
    const loading = JSON.parse(formData.get("loading") as string);
    const languageInit = JSON.parse(formData.get("languageInit") as string);
    const languageData = JSON.parse(formData.get("languageData") as string);
    const plan = JSON.parse(formData.get("plan") as string);
    const customApikeyData = JSON.parse(formData.get("customApikeyData") as string);
    const nearTransaltedData = JSON.parse(formData.get("nearTransaltedData") as string);
    const userData = JSON.parse(formData.get("userData") as string);
    const languageCode = JSON.parse(formData.get("languageCode") as string);
    const statusData = JSON.parse(formData.get("statusData") as string);
    const payInfo = JSON.parse(formData.get("payInfo") as string);
    const orderInfo = JSON.parse(formData.get("orderInfo") as string);
    const rate = JSON.parse(formData.get("rate") as string);
    const credits = JSON.parse(formData.get("credits") as string);
    const recalculate = JSON.parse(formData.get("recalculate") as string);

    if (loading) {
      try {
        const init = await InitializationDetection({ shop });
        await UserAdd({ shop, accessToken: accessToken as string, init: init?.add });
        if (!init?.insertCharsByShopName) {
          await InsertCharsByShopName({ shop, accessToken: accessToken as string });
        }
        if (!init?.addUserFreeSubscription) {
          await AddUserFreeSubscription({ shop });
        }
        if (!init?.addDefaultLanguagePack) {
          await AddDefaultLanguagePack({ shop });
        }
        return true;
      } catch (error) {
        console.error("Error loading app:", error);
        return json({ error: "Error loading app" }, { status: 500 });
      }
    }

    if (languageInit) {
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

        await InsertTargets({
          shop,
          accessToken: accessToken!,
          source: shopPrimaryLanguage[0].locale,
          targets: shopLocalesIndex,
        });

        return null;
      } catch (error) {
        console.error("Error languageInit app:", error);
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
        const [languageLocaleInfo, languages] = await Promise.all([
          GetLanguageLocaleInfo({ locale: shopLocalesIndex }),
          GetLanguageList({ shop, source: shopPrimaryLanguage[0].locale }),
        ]);

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

        const languageSetting = {
          primaryLanguage: shopPrimaryLanguage[0].name,
          primaryLanguageCode: shopPrimaryLanguage[0].locale,
          // shopLanguagesWithoutPrimary: shopLanguagesWithoutPrimaryIndex,
          // shopLanguageCodesWithoutPrimary: shopLocalesIndex,
        };

        console.log("languageData: ", {
          data,
          languageSetting,
        });

        return json({ data, languageSetting, shop });
      } catch (error) {
        console.error("Error languageData app:", error);
        return json({ error: "Error languageData app" }, { status: 500 });
      }
    }

    if (plan) {
      try {
        const planData = await GetUserSubscriptionPlan({ shop });
        return json({ plan: planData });
      } catch (error) {
        console.error("Error plan app:", error);
        return json({
          plan: {
            userSubscriptionPlan: 2,
            updateTime: "",
          },
        });
      }
    }

    if (customApikeyData) {
      try {
        const customApikeyData = await GetUserData({
          shop,
        });
        return json({ customApikeyData: customApikeyData?.response?.googleKey });
      } catch (error) {
        console.error("Error customApikeyData app:", error);
        return json({ error: "Error customApikeyData app" }, { status: 500 });
      }
    }

    if (nearTransaltedData) {
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

        const data = await GetTranslateDOByShopNameAndSource({ shop, source: shopPrimaryLanguage[0].locale });

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
      } catch (error) {
        console.error("Error nearTransaltedData app:", error);
        return json({ error: "Error nearTransaltedData app" }, { status: 500 });
      }
    }

    if (userData) {
      try {
        const words = await GetUserWords({ shop });
        const data = {
          chars: words?.chars || 0,
          totalChars: words?.totalChars || 0,
        };
        return json({ data });
      } catch (error) {
        console.error("Error userData app:", error);
        return json({ error: "Error userData app" }, { status: 500 });
      }
    }

    if (statusData) {
      try {
        const data = await GetLanguageStatus({
          shop,
          source: statusData.source,
          target: statusData.target,
        });
        console.log("GetLanguageStatus: ", data);
        return json({ data });
      } catch (error) {
        console.error("Error statusData app:", error);
        return json({ error: "Error statusData app" }, { status: 500 });
      }
    }

    if (languageCode) {
      try {
        const totalWords = await GetTotalWords({ shop, accessToken: accessToken as string, target: languageCode });
        return json({ totalWords });
      } catch (error) {
        console.error("Error languageCode app:", error);
        return json({ error: "Error languageCode app" }, { status: 500 });
      }
    }

    if (payInfo) {
      try {
        const returnUrl = new URL(
          `https://admin.shopify.com/store/${shop.split(".")[0]}/apps/ciwi-translator/app`,
        );
        const payData = await mutationAppPurchaseOneTimeCreate({
          shop,
          accessToken: accessToken as string,
          name: payInfo.name,
          price: payInfo.price,
          returnUrl,
          test: process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test",
        });
        return json({ data: payData });
      } catch (error) {
        console.error("Error payInfo app:", error);
        return json({ error: "Error payInfo app" }, { status: 500 });
      }
    }

    if (orderInfo) {
      try {
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
      } catch (error) {
        console.error("Error orderInfo app:", error);
        return json({ error: "Error orderInfo app" }, { status: 500 });
      }
    }

    if (credits) {
      try {
        const data = await getCredits({ shop, accessToken: accessToken!, target: credits.target, source: credits.source });
        return json({ data });
      } catch (error) {
        console.error("Error credits app:", error);
        return json({ error: "Error credits app" }, { status: 500 });
      }
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
  const [isClient, setIsClient] = useState(false);

  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { plan, updateTime } = useSelector((state: any) => state.userConfig);
  const planFetcher = useFetcher<any>();
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
    planFetcher.submit({ plan: JSON.stringify(true) }, {
      method: "post",
      action: "/app",
    });
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (planFetcher.data && (!plan || !updateTime)) {
      dispatch(setUserConfig({ plan: planFetcher.data?.plan?.userSubscriptionPlan || "" }));
      dispatch(setUserConfig({ updateTime: planFetcher.data?.plan?.updateTime || "" }));
    }
  }, [planFetcher.data]);

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: "var(--p-color-bg-fill-brand)",
          },
          components: {
            Table: {
              rowSelectedBg: "rgba(217, 217, 217, 0.7)",
              rowSelectedHoverBg: "rgba(217, 217, 217, 0.7)",
            },
          },
        }}
      >
        <NavMenu>
          <Link to="/app" rel="home">
            Home
          </Link>
          {isClient &&
            <>
              <Link to="/app/language">{t("Language")}</Link>
              <Link to="/app/manage_translation">{t("Manage Translation")}</Link>
              <Link to="/app/currency">{t("Currency")}</Link>
              <Link to="/app/switcher">{t("Switcher")}</Link>
              <Link to="/app/glossary">{t("Glossary")}</Link>
              <Link to="/app/pricing">{t("Pricing")}</Link>
            </>
          }
        </NavMenu>
        <Outlet />
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
