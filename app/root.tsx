import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  isRouteErrorResponse,
  useRouteError,
} from "@remix-run/react";
import { Provider } from "react-redux";
import store from "./store";
import "./styles.css";
import { json, LoaderFunctionArgs } from "@remix-run/node";
import { useEffect } from "react";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const language =
      request.headers.get("Accept-Language")?.split(",")[0] || "en";
    const languageCode = language.split("-")[0];
    let i18nCode;
    console.log("Root language: ", language);
    console.log("Root request.headers.get('Accept-Language'): ", request.headers.get("Accept-Language"));
    switch (true) {
      case language === "fr" || (languageCode && languageCode === "fr"):
        i18nCode = "fr";
        break;
      case language === "de" || (languageCode && languageCode === "de"):
        i18nCode = "de";
        break;
      case language === "es" || (languageCode && languageCode === "es"):
        i18nCode = "es";
        break;
      case language === "it" || (languageCode && languageCode === "it"):
        i18nCode = "it";
        break;
      case language === "nl" || (languageCode && languageCode === "nl"):
        i18nCode = "nl";
        break;
      case language === "pt" || (languageCode && languageCode === "pt"):
        i18nCode = "pt";
        break;
      case language === "sv" || (languageCode && languageCode === "sv"):
        i18nCode = "sv";
        break;
      case language === "ja" || (languageCode && languageCode === "ja"):
        i18nCode = "ja";
        break;
      case language === "ko" || (languageCode && languageCode === "ko"):
        i18nCode = "ko";
        break;
      case language === "ru" || (languageCode && languageCode === "ru"):
        i18nCode = "ru";
        break;
      case language === "tr" || (languageCode && languageCode === "tr"):
        i18nCode = "tr";
        break;
      case language === "uk" || (languageCode && languageCode === "uk"):
        i18nCode = "uk";
        break;
      case language === "zh-TW":
        i18nCode = "zh-TW";
        break;
      case language === "zh-CN" || language === "zh":
        i18nCode = "zh-CN";
        break;
      default:
        i18nCode = "en";
    }
    console.log("Root i18nCode: ", i18nCode);

    return json({ i18nCode: i18nCode });
  } catch (error) {
    console.error("Error get the default language: ", error);
    return json({ i18nCode: "en" });
  }
}

export function ErrorBoundary() {
  const error = useRouteError();
  console.error("Root Error:", error);
  let errorCode = "500";
  if (isRouteErrorResponse(error)) {
    errorCode = error.status.toString();
  }
  // 错误信息映射
  const errorMessages: {
    [key: string]: { title: string; message: string; solution: string };
  } = {
    "400": {
      title: "Bad Request",
      message:
        "The request could not be understood by the server due to malformed syntax.",
      solution: `Please click the ${"Translate Language AI Adapt"} option in the app navigation bar again`,
    },
    "401": {
      title: "Unauthorized",
      message:
        "Authentication is required and has failed or has not been provided.",
      solution: `Please click the ${"Translate Language AI Adapt"} option in the app navigation bar again`,
    },
    "403": {
      title: "Forbidden",
      message: "You don't have permission to access this resource.",
      solution: `Please click the ${"Translate Language AI Adapt"} option in the app navigation bar again`,
    },
    "404": {
      title: "Not Found",
      message: "The requested resource could not be found.",
      solution: `Please click the ${"Translate Language AI Adapt"} option in the app navigation bar again`,
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

  const currentError = errorMessages[errorCode] || errorMessages["400"];

  // 服务器端渲染时直接返回基础结构
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <Meta />
        <Links />
        {typeof document === "undefined" ? "__ANTD__" : ""}
      </head>
      <body>
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
            <h1 style={{ fontSize: 72, margin: "24px 0" }}>
              {errorCode}
            </h1>
            <h2 style={{ margin: "24px 0" }}>
              {currentError.title}
            </h2>
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
              Please click the "Translate Language AI Adapt" option in the app
              navigation bar again
            </p>
          </div>
        </div>
        <ScrollRestoration />
        <Scripts />
        <script
          src="//code.tidio.co/inl4rrmds8vvbldv1k6gyc2nzxongl3p.js"
          async
        ></script>
      </body>
    </html>
  );
}

export default function App() {
  const { i18nCode } = useLoaderData<typeof loader>();
  return (
    <Provider store={store}>
      <html lang={i18nCode}>
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <link rel="preconnect" href="https://cdn.shopify.com/" />
          <link
            rel="stylesheet"
            href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
          />
          <Meta />
          <Links />
          {typeof document === "undefined" ? "__ANTD__" : ""}
        </head>
        <body>
          <Outlet />
          <ScrollRestoration />
          <Scripts />
          <script
            src="//code.tidio.co/inl4rrmds8vvbldv1k6gyc2nzxongl3p.js"
            async
          ></script>
        </body>
      </html>
    </Provider>
  );
}
