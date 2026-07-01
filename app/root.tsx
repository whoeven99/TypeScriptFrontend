import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useFetcher,
  useLocation,
  useRouteError,
} from "@remix-run/react";
import { Provider } from "react-redux";
import store from "./store";
import { useEffect } from "react";
import { createHead } from "remix-island";

import "./styles.css";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function isNetworkFetchError(error: unknown): boolean {
  return (
    error instanceof TypeError &&
    typeof error.message === "string" &&
    /failed to fetch/i.test(error.message)
  );
}

function runWhenIdle(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  if ("requestIdleCallback" in window) {
    const id = window.requestIdleCallback(callback, { timeout: 3000 });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(callback, 1500);
  return () => window.clearTimeout(id);
}

function appendExternalScript(id: string, src: string) {
  if (document.getElementById(id)) return;
  const script = document.createElement("script");
  script.id = id;
  script.src = src;
  script.async = true;
  script.setAttribute("crossorigin", "*");
  document.body.appendChild(script);
}

function loadAnalyticsScripts() {
  if (document.getElementById("ciwi-gtm-loader")) return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
  window.gtag =
    window.gtag ||
    function gtag() {
      window.dataLayer.push(arguments);
    };
  window.gtag("js", new Date());
  window.gtag("config", "G-F1BN24YVJN");
  window.gtag("event", "conversion", {
    send_to: "AW-11460630366/7Dj1CNvO4cYaEN6u7dgq",
    value: 1.0,
    currency: "USD",
  });
  appendExternalScript(
    "ciwi-gtm-loader",
    "https://www.googletagmanager.com/gtm.js?id=GTM-NVPT5XDV",
  );
}

function loadSupportChatScript() {
  appendExternalScript(
    "ciwi-tawk-loader",
    "https://embed.tawk.to/6909a2c4f363bc1955661e51/1j96q7jtm",
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  console.error("Root Error:", error);
  let errorCode = "500";
  if (isRouteErrorResponse(error)) {
    errorCode = error.status.toString();
  } else if (isNetworkFetchError(error)) {
    errorCode = "503";
  }

  // 错误信息映射
  const errorMessages: {
    [key: string]: { title: string; message: string; solution: string };
  } = {
    "400": {
      title: "Bad Request",
      message:
        "The request could not be understood by the server due to malformed syntax.",
      solution: `Please click the Ciwi-Translator option in the app navigation bar again`,
    },
    "401": {
      title: "Unauthorized",
      message:
        "Authentication is required and has failed or has not been provided.",
      solution: `Please  click the Ciwi-Translator option in the app navigation bar again`,
    },
    "403": {
      title: "Forbidden",
      message: "You don't have permission to access this resource.",
      solution: `Please click the Ciwi-Translator option in the app navigation bar again`,
    },
    "404": {
      title: "Not Found",
      message: "The requested resource could not be found.",
      solution: `Please click the Ciwi-Translator option in the app navigation bar again`,
    },
    "500": {
      title: "Internal Server Error",
      message:
        "The server encountered an unexpected condition that prevented it from fulfilling the request.",
      solution: "Please refresh the page",
    },
    "502": {
      title: "Bad Gateway",
      message:
        "The server received an invalid response from the upstream server.",
      solution: "Please refresh the page",
    },
    "503": {
      title: "Service Unavailable",
      message: "The server is currently unavailable.",
      solution: "Please refresh the page",
    },
    "504": {
      title: "Gateway Timeout",
      message:
        "The server did not receive a timely response from the upstream server.",
      solution: "Please refresh the page",
    },
  };

  const currentError = errorMessages[errorCode] || errorMessages["500"];


  // 服务器端渲染时直接返回基础结构
  return (
    <>
      <Head />
      <div id="root">
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "100vh",
            background: "#f5f5f5",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 500,
              textAlign: "center",
              padding: "24px",
            }}
          >
            <h1 style={{ fontSize: 72, margin: "24px 0" }}>{errorCode}</h1>
            <h2 style={{ margin: "24px 0" }}>{currentError.title}</h2>
            <p
              style={{
                display: "block",
                marginBottom: "24px",
                fontSize: 16,
              }}
            >
              {currentError.message}
            </p>
            <p
              style={{
                display: "block",
                marginBottom: "24px",
                fontSize: 16,
              }}
            >
              Please click the "Ciwi-Translator" option in the app navigation
              bar again
            </p>
          </div>
        </div>
        <ScrollRestoration />
        <Scripts />
      </div>
    </>
  );
}

export default function App() {
  const fetcher = useFetcher<any>();
  const location = useLocation();

  // 从 loader 数据中获取国际化语言代码
  useEffect(() => {
    // GTM 初始化脚本
    return runWhenIdle(loadAnalyticsScripts);
  }, []);

  useEffect(() => {
    const callback = async (metrics: any) => {
      const data = JSON.stringify(metrics);
      fetcher.submit(
        {
          metrics: data,
        },
        {
          method: "POST",
          action: "/web-vitals-metrics",
        },
      );
    };
    // 确保 shopify 对象存在再调用
    if (typeof shopify !== "undefined" && shopify?.webVitals?.onReport) {
      shopify?.webVitals?.onReport(callback);
    }
  }, []);

  useEffect(() => {
    if (location.pathname.startsWith("/app/translate-v4")) {
      return;
    }
    return runWhenIdle(loadSupportChatScript);
  }, [location.pathname]);

  return (
    // 使用 Redux Provider 包装整个应用（用于状态管理，必须）,删除后很多功能无法使用
    <>
      <Provider store={store}>
        <Head />
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-NVPT5XDV"
            title="Google Tag Manager"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          ></iframe>
        </noscript>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </Provider>
    </>
  );
}

export const Head = createHead(() => (
  <>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <link rel="preconnect" href="https://cdn.shopify.com/" />
    <link
      rel="stylesheet"
      href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
    />
    <Meta />
    <Links />
  </>
));
