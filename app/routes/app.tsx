import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Link,
  Outlet,
  useLoaderData,
  useRouteError,
} from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate } from "../shopify.server";
import {
  GetUserWords,
  AddUserFreeSubscription,
  InitializationDetection,
  UserInitialization,
  AddDefaultLanguagePack,
  InsertCharsByShopName,
  InsertTargets,
  GoogleAnalyticClickReport,
  GetUnTranslatedWords,
} from "~/api/JavaServer";
import {
  bootstrapLocalesFromLoaded,
  type AppBootstrapJavaData,
} from "~/server/appBootstrap.server";
import { resolveBillingBinding } from "~/server/billing/index.server";
import { BILLING_SYSTEM } from "~/server/billing/types.server";
import { loadShopLocalesForTranslation } from "~/server/translateV4/shopLocales.server";
import { Suspense, lazy, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useIdleReady } from "~/hooks/useIdleReady";

import { ConfigProvider } from "antd";
import { useDispatch } from "react-redux";
import type { Dispatch } from "@reduxjs/toolkit";
import {
  setChars,
  setIsNew,
  setPlan,
  setSource,
  setShop,
  setTotalChars,
  setUpdateTime,
  setUserConfigIsLoading,
} from "~/store/modules/userConfig";
import { setLanguageTableData } from "~/store/modules/languageTableData";
import { globalStore } from "~/globalStore";
import { shouldRevalidateAppShell } from "~/lib/routeShouldRevalidate";
import { appAntdTheme } from "~/ui/theme";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

const LazySupportChatWidget = lazy(() =>
  import("~/components/SupportChatWidget").then((module) => ({
    default: module.SupportChatWidget,
  })),
);

type AppBootstrapData = {
  source: { code: string; name: string };
  targets: Array<{
    locale: string;
    name: string;
    primary: boolean;
    published: boolean;
  }>;
};

const logGraphQLErrorDetail = (context: string, error: unknown) => {
  const e = error as any;
  const response = e?.response;
  const responseHeaders =
    typeof response?.headers?.get === "function"
      ? {
          requestId: response.headers.get("x-request-id"),
          apiVersion: response.headers.get("x-shopify-api-version"),
          apiVersionWarning: response.headers.get("x-shopify-api-version-warning"),
        }
      : undefined;

  const graphQLErrorList =
    (Array.isArray(e?.graphQLErrors) && e.graphQLErrors) ||
    (Array.isArray(e?.errors?.graphQLErrors) && e.errors.graphQLErrors) ||
    (Array.isArray(e?.body?.errors) && e.body.errors) ||
    [];

  const graphQLErrors = graphQLErrorList.map((gqlError: any) => ({
    message: gqlError?.message,
    path: gqlError?.path,
    extensions: gqlError?.extensions,
    locations: gqlError?.locations,
  }));
  console.error(`[${context}] GraphQL request failed`, {
    name: e?.name,
    message: e?.message,
    networkStatusCode: e?.networkStatusCode ?? e?.errors?.networkStatusCode,
    response: response
      ? {
          status: response?.status,
          statusText: response?.statusText,
          url: response?.url,
          headers: responseHeaders,
        }
      : undefined,
    stack: e?.stack,
  });
  console.error(
    `[${context}] graphQLErrors_full=${JSON.stringify(graphQLErrors, null, 2)}`,
  );
  graphQLErrors.forEach((item: any, index: number) => {
    console.error(`[${context}] graphQLError[${index}]`, item);
  });
  console.error(
    `[${context}] rawError_full=${JSON.stringify(
      e,
      Object.getOwnPropertyNames(e || {}),
      2,
    )}`,
  );
  console.error(`[${context}] rawError`, e);
};

async function runAppInitialization({
  shop,
  accessToken,
  source,
  targets,
}: {
  shop: string;
  accessToken?: string;
  source: string;
  targets: string[];
}) {
  try {
    // 判定并锁定账本归属；新用户（tsf）建账户 + 赠送安装试用额度
    const binding = await resolveBillingBinding(shop);
    const isTsf = binding.billingSystem === BILLING_SYSTEM.TSF;

    // 保留：翻译流水线仍依赖 Java Users.access_token（billing 归属与翻译解耦）
    if (accessToken) {
      await UserInitialization({ shop, accessToken });
    }
    const init = await InitializationDetection({ shop });
    if (init?.success && accessToken) {
      // 老系统计费初始化：仅 legacy 用户执行（tsf 用户走 Turso 分池）
      if (!isTsf) {
        if (!init?.response?.insertCharsByShopName) {
          await InsertCharsByShopName({ shop, accessToken });
        }
        if (!init?.response?.addUserFreeSubscription) {
          await AddUserFreeSubscription({ shop });
        }
      }
      // 翻译配置（与计费无关），所有用户保留
      if (!init?.response?.addDefaultLanguagePack) {
        await AddDefaultLanguagePack({ shop });
      }
    }
    if (accessToken && source && targets.length > 0) {
      await InsertTargets({ shop, accessToken, source, targets });
    }
  } catch (error) {
    logGraphQLErrorDetail("Error app bootstrap initialization", error);
  }
}

async function loadAppBootstrapLocales({
  shop,
  accessToken,
}: {
  shop: string;
  accessToken?: string;
}): Promise<AppBootstrapData> {
  let source = { code: "", name: "" };
  let targets: AppBootstrapData["targets"] = [];

  try {
    if (accessToken) {
      const loaded = await loadShopLocalesForTranslation({ shop, accessToken });
      const mapped = bootstrapLocalesFromLoaded(loaded);
      source = mapped.source;
      targets = mapped.targets;
    }
  } catch (error) {
    logGraphQLErrorDetail("Error app bootstrap languages", error);
  }

  return { source, targets };
}

function applyBootstrapJavaToStore(
  dispatch: Dispatch,
  bootstrap: AppBootstrapJavaData,
) {
  dispatch(setPlan({ plan: bootstrap.plan }));
  if (bootstrap.updateTime) {
    dispatch(setUpdateTime({ updateTime: bootstrap.updateTime }));
  }
  dispatch(setChars({ chars: bootstrap.chars }));
  dispatch(setTotalChars({ totalChars: bootstrap.totalChars }));
  if (bootstrap.isNew !== null) {
    dispatch(setIsNew({ isNew: bootstrap.isNew }));
  }
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  const server = process.env.SERVER_URL || "";
  const bootstrap = await loadAppBootstrapLocales({
    shop,
    accessToken: accessToken as string | undefined,
  });

  void runAppInitialization({
    shop,
    accessToken: accessToken as string | undefined,
    source: bootstrap.source.code,
    targets: bootstrap.targets.map((item) => item.locale),
  });

  return json({
    shop,
    server,
    apiKey: process.env.SHOPIFY_API_KEY || "",
    bootstrap,
  });
};

export const shouldRevalidate = shouldRevalidateAppShell;

export const action = async ({ request }: ActionFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  const { admin } = adminAuthResult;

  try {
    const formData = await request.formData();
    const init = JSON.parse(formData.get("init") as string);
    const languageInit = JSON.parse(formData.get("languageInit") as string);
    const languageData = JSON.parse(formData.get("languageData") as string);
    const googleAnalytics = JSON.parse(
      formData.get("googleAnalytics") as string,
    );
    const qualityEvaluation = JSON.parse(
      formData.get("qualityEvaluation") as string,
    );
    const findWebPixelId = JSON.parse(formData.get("findWebPixelId") as string);
    const unTranslated = JSON.parse(formData.get("unTranslated") as string);
    if (init) {
      try {
        await UserInitialization({
          shop,
          accessToken: accessToken as string,
        });
        const init = await InitializationDetection({ shop });
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
        logGraphQLErrorDetail("Error loading app", error);
        return null;
      }
    }

    if (languageInit) {
      try {
        await InsertTargets({
          shop,
          accessToken: accessToken!,
          source: languageInit?.source,
          targets: languageInit?.targets,
        });
        return null;
      } catch (error) {
        logGraphQLErrorDetail("Error languageInit app", error);
        return null;
      }
    }

    if (languageData) {
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

        return {
          success: true,
          errorCode: 0,
          errorMsg: "",
          response: {
            source: shopPrimaryLanguage[0] || undefined,
            targets: shopLanguagesWithoutPrimaryIndex || [],
          },
        };
      } catch (error) {
        logGraphQLErrorDetail("Error languageData app", error);
        return {
          success: false,
          errorCode: 10001,
          errorMsg: "SERVER_ERROR",
          response: null,
        };
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
        logGraphQLErrorDetail("Error googleAnalytics app", error);
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
        logGraphQLErrorDetail(`${shop} getOrderData failed`, error);
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
        logGraphQLErrorDetail(`${shop} findWebPixel failed`, error);
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
        logGraphQLErrorDetail(`${shop} get unTranslated words failed`, error);
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
    logGraphQLErrorDetail("Error action app", error);
    return json({ error: "Error action app" }, { status: 500 });
  }
};

export default function App() {
  const { apiKey, shop, server, bootstrap } = useLoaderData<typeof loader>();
  const [isClient, setIsClient] = useState(false);
  const supportChatReady = useIdleReady();

  const { t } = useTranslation();
  const dispatch = useDispatch();

  useEffect(() => {
    setIsClient(true);
    globalStore.shop = shop as string;
    globalStore.server = server as string;
    globalStore.translateV4ExpressBeta = true;
    globalStore.source = bootstrap.source.code;

    dispatch(setShop({ shop }));
    dispatch(setSource({ source: bootstrap.source }));
    dispatch(setLanguageTableData(
      bootstrap.targets.map((language) => ({
        ...language,
        key: language.locale,
      })),
    ));

    let cancelled = false;
    dispatch(setUserConfigIsLoading({ isLoading: true }));

    void fetch("/api/app-bootstrap")
      .then(async (res) => {
        const data = (await res.json()) as {
          ok?: boolean;
          bootstrap?: AppBootstrapJavaData;
        };
        if (cancelled || !data?.ok || !data.bootstrap) return;
        applyBootstrapJavaToStore(dispatch, data.bootstrap);
      })
      .catch((err) => {
        console.error("[app] bootstrap java fetch failed:", err);
      })
      .finally(() => {
        if (!cancelled) {
          dispatch(setUserConfigIsLoading({ isLoading: false }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [bootstrap, dispatch, server, shop]);

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <ConfigProvider
        theme={appAntdTheme}
        getPopupContainer={() => document.body}
      >
        <NavMenu>
          <Link to="/app/translate-v4" rel="home">
            {t("v4.title")}
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
        {isClient && supportChatReady ? (
          <Suspense fallback={null}>
            <LazySupportChatWidget />
          </Suspense>
        ) : null}
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
