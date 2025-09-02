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
  GetUserWords,
  GetLanguageStatus,
  AddUserFreeSubscription,
  InsertOrUpdateOrder,
  InitializationDetection,
  UserAdd,
  AddDefaultLanguagePack,
  InsertCharsByShopName,
  InsertTargets,
  GetTranslateDOByShopNameAndSource,
  GetUserData,
  StopTranslatingTask,
  GetUserSubscriptionPlan,
  GoogleAnalyticClickReport
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
import {
  setChars,
  setPlan,
  setShop,
  setTotalChars,
  setUpdateTime,
  setUserConfigIsLoading,
} from "~/store/modules/userConfig";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop } = adminAuthResult.session;

  return json({
    shop,
    server: process.env.SERVER_URL,
    apiKey: process.env.SHOPIFY_API_KEY || "",
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;

  try {
    const formData = await request.formData();
    const init = JSON.parse(formData.get("init") as string);
    const languageInit = JSON.parse(formData.get("languageInit") as string);
    const languageData = JSON.parse(formData.get("languageData") as string);
    const customApikeyData = JSON.parse(
      formData.get("customApikeyData") as string,
    );
    const nearTransaltedData = JSON.parse(
      formData.get("nearTransaltedData") as string,
    );
    const userData = JSON.parse(formData.get("userData") as string);
    const statusData = JSON.parse(formData.get("statusData") as string);
    const payInfo = JSON.parse(formData.get("payInfo") as string);
    const orderInfo = JSON.parse(formData.get("orderInfo") as string);
    const stopTranslate = JSON.parse(formData.get("stopTranslate") as string);
    const googleAnalytics = JSON.parse(formData.get("googleAnalytics") as string);
    if (init) {
      try {
        const init = await InitializationDetection({ shop });
        await UserAdd({
          shop,
          accessToken: accessToken as string,
          init: init?.add,
        });
        if (init?.success) {
          if (!init?.response?.insertCharsByShopName) {
            await InsertCharsByShopName({
              shop,
              accessToken: accessToken as string,
            });
          }
          if (!init?.response?.addUserFreeSubscription) {
            await AddUserFreeSubscription({ shop });
          }
          if (!init?.response?.addDefaultLanguagePack) {
            await AddDefaultLanguagePack({ shop });
          }
        }
        return null;
      } catch (error) {
        console.error("Error loading app:", error);
        return null;
      }
    }

    if (languageInit) {
      try {
        const shopLanguagesIndex: ShopLocalesType[] = await queryShopLanguages({
          shop,
          accessToken: accessToken as string,
        });
        const shopPrimaryLanguage = shopLanguagesIndex?.filter(
          (language) => language?.primary,
        );
        const shopLanguagesWithoutPrimaryIndex = shopLanguagesIndex?.filter(
          (language) => !language.primary,
        );
        const shopLocalesIndex = shopLanguagesWithoutPrimaryIndex?.map(
          (item) => item.locale,
        );

        if (shopLocalesIndex.length && shopPrimaryLanguage[0].locale) {
          await InsertTargets({
            shop,
            accessToken: accessToken!,
            source: shopPrimaryLanguage[0].locale,
            targets: shopLocalesIndex,
          });
        } else {
          console.warn(`${shop} shopLanguagesIndex: `, shopLanguagesIndex);
        }

        return null;
      } catch (error) {
        console.error("Error languageInit app:", error);
        return null;
      }
    }

    if (languageData) {
      try {
        const data: ShopLocalesType[] = await queryShopLanguages({
          shop,
          accessToken: accessToken as string,
        });
        return {
          success: true,
          errorCode: 0,
          errorMsg: "",
          response: data,
        };
      } catch (error) {
        console.error("Error languageData app:", error);
        return {
          success: true,
          errorCode: 0,
          errorMsg: "",
          response: [],
        };
      }
    }

    if (customApikeyData) {
      try {
        const apiNames = [0, 1]; // 对应 google, openai, deepl, deepseek
        const results = await Promise.all(
          apiNames.map((apiName) =>
            GetUserData({
              shop,
              apiName,
            }),
          ),
        );
        return json({
          customApikeyData: results,
        });
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
        const shopPrimaryLanguage = shopLanguagesIndex?.filter(
          (language) => language?.primary,
        );
        const shopLanguagesWithoutPrimaryIndex = shopLanguagesIndex?.filter(
          (language) => !language?.primary,
        );
        const shopLocalesIndex = shopLanguagesWithoutPrimaryIndex?.map(
          (item) => item?.locale,
        );

        const translatingData = await GetTranslateDOByShopNameAndSource({
          shop,
          source: shopPrimaryLanguage[0]?.locale,
        });

        const data = translatingData.response?.filter(
          (translatingDataItem: any) =>
            shopLocalesIndex.includes(translatingDataItem?.target) &&
            (translatingDataItem?.status !== 1 ||
              !shopLanguagesWithoutPrimaryIndex.find(
                (item) => item.locale === translatingDataItem?.target,
              )?.published),
        );

        console.log(`应用日志: ${shop} 进度条返回数据 ${data}`);
        console.log(`应用日志: ${shop} 主页面数据加载完毕`);

        return {
          success: true,
          errorCode: 0,
          errorMsg: "",
          response:
            data.length > 0
              ? data.map((item: any) => ({
                  source: item?.source || shopPrimaryLanguage[0].locale,
                  target: item?.target || "",
                  status: item?.status || 0,
                  resourceType: item?.resourceType || "",
                }))
              : [
                  {
                    source: "",
                    target: "",
                    status: 0,
                    resourceType: "",
                  },
                ],
        };
      } catch (error) {
        console.error("Error nearTransaltedData app:", error);
        return {
          success: false,
          errorCode: 0,
          errorMsg: "",
          response: [
            {
              source: "",
              target: "",
              status: 0,
              resourceType: "",
            },
          ],
        };
      }
    }

    if (statusData) {
      try {
        const data = await GetLanguageStatus({
          shop,
          source: statusData.source,
          target: statusData.target,
        });
        return data;
      } catch (error) {
        console.error("Error statusData app:", error);
        return {
          success: false,
          errorCode: 0,
          errorMsg: "",
          response: [],
        };
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
          test:
            process.env.NODE_ENV === "development" ||
            process.env.NODE_ENV === "test",
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

    if (stopTranslate) {
      try {
        const data = await StopTranslatingTask({
          shopName: shop,
          accessToken: accessToken as string,
          source: stopTranslate.source,
        });
        return data;
      } catch (error) {
        console.error("Error stopTranslate app:", error);
        return json({
          data: {
            success: false,
            message: "Error stopTranslate app",
          },
        });
      }
    }

    if (googleAnalytics) {
      try {
        const { data, eventType, timestamp, name } = googleAnalytics;
        console.log('app data',googleAnalytics);
        
        const response = await GoogleAnalyticClickReport(
          { ...data, eventType, timestamp, shopName:shop },
          name
        );
        return json({ data: { success: response, message: `${name} ${eventType} success googleAnalytics` } });
      } catch (error) {
        console.error("Error googleAnalytics app:", error);
        return json({
          data: {
            success: false,
            message: "Error googleAnalytics app",
          },
        });
      }
    }

    return json({ success: false, message: "Invalid data" });
  } catch (error) {
    console.error("Error action app:", error);
    return json({ error: "Error action app" }, { status: 500 });
  }
};

export default function App() {
  const { apiKey, shop, server } = useLoaderData<typeof loader>();
  const [isClient, setIsClient] = useState(false);

  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { plan, updateTime } = useSelector((state: any) => state.userConfig);
  const initFetcher = useFetcher<any>();
  const languageFetcher = useFetcher<any>();

  useEffect(() => {
    initFetcher.submit(
      { init: JSON.stringify(true) },
      {
        method: "post",
        action: "/app",
      },
    );
    languageFetcher.submit(
      { languageInit: JSON.stringify(true) },
      {
        method: "post",
        action: "/app",
      },
    );
    const getPlan = async () => {
      const data = await GetUserSubscriptionPlan({
        shop: shop,
        server: server as string,
      });
      if (data?.success) {
        if (!plan || !updateTime) {
          dispatch(
            setPlan({
              plan: {
                id: data?.response?.userSubscriptionPlan || 2,
                feeType: data?.response?.feeType || 0,
              },
            }),
          );
          if (data?.response?.currentPeriodEnd) {
            const date = new Date(data?.response?.currentPeriodEnd)
              .toLocaleDateString("zh-CN", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              })
              .replace(/\//g, "-");
            dispatch(setUpdateTime({ updateTime: date }));
          }
        }
      }
    };
    getPlan();

    const getWords = async () => {
      const data = await GetUserWords({
        shop,
        server: server as string,
      });
      dispatch(setChars({ chars: data?.response?.chars }));
      dispatch(
        setTotalChars({
          totalChars: data?.response?.totalChars,
        }),
      );
      dispatch(setUserConfigIsLoading({ isLoading: false }));
    };
    getWords();
    dispatch(setShop({ shop: shop as string }));
    setIsClient(true);
    const shopName = localStorage.getItem("shop");
    if (!shopName) {
      localStorage.setItem("shop", (shop as string) || "");
    }
  }, []);

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
            Button: {
              primaryShadow: "none",
            },
            Select: {
              optionSelectedBg: "rgba(217, 217, 217, 0.7)",
            },
            Menu: {
              itemSelectedBg: "rgba(217, 217, 217, 0.7)",
            },
            Card: {
              headerHeight: 42,
            },
          },
        }}
      >
        <NavMenu>
          <Link to="/app" rel="home">
            Home
          </Link>
          {isClient && (
            <>
              <Link to="/app/language">{t("Language")}</Link>
              <Link to="/app/manage_translation">
                {t("Manage Translation")}
              </Link>
              <Link to="/app/currency">{t("Currency")}</Link>
              <Link to="/app/switcher">{t("Switcher")}</Link>
              <Link to="/app/glossary">{t("Glossary")}</Link>
              <Link to="/app/pricing">{t("Pricing")}</Link>
            </>
          )}
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
