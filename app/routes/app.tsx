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
  useLocation,
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
  GoogleAnalyticClickReport,
  IsOpenFreePlan,
  GetUnTranslatedWords,
  GetAllProgressData,
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
  setIsNew,
  setPlan,
  setShop,
  setTotalChars,
  setUpdateTime,
  setUserConfigIsLoading,
} from "~/store/modules/userConfig";
import { globalStore } from "~/globalStore";

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
  const { admin } = adminAuthResult;

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
    const statusData = JSON.parse(formData.get("statusData") as string);
    const payInfo = JSON.parse(formData.get("payInfo") as string);
    const orderInfo = JSON.parse(formData.get("orderInfo") as string);
    const stopTranslate = JSON.parse(formData.get("stopTranslate") as string);
    const googleAnalytics = JSON.parse(
      formData.get("googleAnalytics") as string,
    );
    const qualityEvaluation = JSON.parse(
      formData.get("qualityEvaluation") as string,
    );
    const findWebPixelId = JSON.parse(formData.get("findWebPixelId") as string);
    const unTranslated = JSON.parse(formData.get("unTranslated") as string);
    const conversionRate = JSON.parse(formData.get("conversionRate") as string);
    const getAssessmentScoreFetcher = JSON.parse(
      formData.get("getAssessmentScoreFetcher") as string,
    );
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

        const translatingData = await GetAllProgressData({
          shop,
          server: process.env.SERVER_URL as string,
          source: shopPrimaryLanguage[0]?.locale,
        });

        return {
          ...translatingData,
          response: {
            list: translatingData?.response?.list || [],
            source: shopPrimaryLanguage[0]?.locale,
          },
        };
      } catch (error) {
        console.error("Error nearTransaltedData app:", error);
        return {
          success: false,
          errorCode: 0,
          errorMsg: "",
          response: {
            list: [],
            source: "",
          },
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
          `https://admin.shopify.com/store/${shop.split(".")[0]}/apps/${process.env.HANDLE}/app/pricing`,
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
        const response = await GoogleAnalyticClickReport(
          { ...data, eventType, timestamp, shopName: shop },
          name,
        );
        return json({
          data: {
            success: response,
            message: `${name} ${eventType} success googleAnalytics`,
          },
        });
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

    if (qualityEvaluation) {
      try {
        console.log("quailtyEvaluation1");

        const mutationResponse = await admin.graphql(
          `
        #graphql
          mutation webPixelCreate($webPixel: WebPixelInput!){
            webPixelCreate(webPixel: $webPixel) {
              userErrors {
                code
                field
                message
              }
              webPixel {
                id
                settings
              }
            }
          }
        `,
          {
            variables: {
              webPixel: {
                settings: JSON.stringify({
                  shopName: shop,
                  server: process.env.SERVER_URL,
                }),
              },
            },
          },
        );
        if (!mutationResponse.ok) {
          console.error("Request failed", mutationResponse);
          return;
        }
        const data = (await mutationResponse.json()) as any;
        if (data.errors) {
          console.error("GraphQL 错误: ", data.errors);
          return {
            success: false,
            response: {
              errorCode: 2,
            },
          };
        }

        if (data.data.webPixelCreate.userErrors.length > 0) {
          console.error("业务错误: ", data.data.webPixelCreate.userErrors);
          return {
            success: false,
            response: {
              errorCode: 3,
            },
          };
        }
        return {
          success: true,
          response: data,
        };
      } catch (error) {
        console.log(`${shop} getOrderData failed`, error);
        return {
          success: false,
          response: {
            errorCode: 1,
          },
        };
      }
    }

    if (findWebPixelId) {
      try {
        const query = `
          query {
            webPixel {
              id
              settings
            }
          }
        `;
        const response = await admin.graphql(query);
        if (!response.ok) {
          return {
            success: false,
            errorCode: response.status,
            errorMsg: response.statusText,
            response: null,
          };
        }

        const data = (await response.json()) as any;
        console.log("findWebPixelId data", data);

        // 再看 GraphQL 层面是否有错误
        if (data.errors) {
          return {
            success: false,
            errorCode: 10002,
            errorMsg: data.errors.map((e: any) => e.message).join(", "),
            response: data,
          };
        }

        return {
          success: true,
          response: data,
        };
      } catch (error) {
        console.log(`${shop} findWebPixel failed`, error);
        return {
          success: false,
          errorCode: 10001,
          errorMsg: "SERVER_ERROR",
          response: null,
        };
      }
    }

    if (unTranslated) {
      try {
        const mutationResponse = await admin.graphql(
          `query MyQuery {
            shopLocales(published: true) {
              locale
              name
              primary
              published
            }
          }`,
        );
        const data = (await mutationResponse.json()) as any;
        let source = "en";
        if (data.data.shopLocales.length > 0) {
          data.data.shopLocales.forEach((item: any) => {
            if (item.primary === true) {
              source = item.locale;
            }
          });
        }
        const { resourceModules } = unTranslated;
        let totalWords = 0;
        const results = await Promise.all(
          resourceModules.map((module: string) =>
            GetUnTranslatedWords({
              shop,
              module,
              accessToken: accessToken as string,
              source,
            }),
          ),
        );

        results.forEach((res) => {
          if (res.success && res.response) {
            totalWords += res.response;
          }
        });
        console.log(`${shop} unTranslate words is ${totalWords}`);
        return {
          success: true,
          response: {
            totalWords,
          },
        };
      } catch (error) {
        console.log(`${shop} get unTranslated words failed`, error);
        return {
          success: false,
          errorCode: 10001,
          errorMsg: "SERVER_ERROR",
          response: null,
        };
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
  const location = useLocation();

  const { plan, chars, totalChars, isNew } = useSelector(
    (state: any) => state.userConfig,
  );
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
    setIsClient(true);
    globalStore.shop = shop as string;
    globalStore.server = server as string;
  }, []);

  useEffect(() => {
    // 当 URL 改变时调用这两个函数
    if (!plan?.id) {
      getPlan();
    }
    if (!chars || !totalChars) {
      getWords();
    }
    if (isNew === null) {
      checkFreeUsed();
    }
  }, [location]); // 监听 URL 的变化

  const getPlan = async () => {
    const data = await GetUserSubscriptionPlan({
      shop: shop,
      server: server as string,
    });
    if (data?.success) {
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
  };

  const getWords = async () => {
    const data = await GetUserWords({
      shop,
      server: server as string,
    });
    if (data?.success) {
      dispatch(setChars({ chars: data?.response?.chars }));
      dispatch(
        setTotalChars({
          totalChars: data?.response?.totalChars,
        }),
      );
      dispatch(setUserConfigIsLoading({ isLoading: false }));
    }
  };

  const checkFreeUsed = async () => {
    const data = await IsOpenFreePlan({
      shop,
      server: server as string,
    });
    if (data?.success) {
      dispatch(setIsNew({ isNew: !data?.response }));
    }
  };

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
