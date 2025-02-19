import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  isRouteErrorResponse,
  useRouteError,
  useSubmit,
  useNavigate,
} from "@remix-run/react";
import { Provider } from "react-redux";
import store from "./store";
import "./styles.css";
import "react-quill/dist/quill.snow.css";
import { json, LoaderFunctionArgs } from "@remix-run/node";
import { Button, Card, Typography } from "antd";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const getBrowserLanguage = () => {
      if (typeof window !== 'undefined') {
        // 优先使用 navigator.language
        const browserLang = navigator.language ||
          (navigator as any).userLanguage || // IE
          (navigator as any).browserLanguage; // 旧浏览器
        return browserLang.split(',')[0];
      }
      return null;
    };

    // 获取语言代码
    const language = getBrowserLanguage() ||
      request.headers.get("Accept-Language")?.split(",")[0] ||
      "en";

    console.log("Browser/Header language:", language);
    let i18nCode;
    switch (true) {
      case language == "fr":
        i18nCode = "fr";
        break;
      case language == "de":
        i18nCode = "de";
        break;
      case language == "es":
        i18nCode = "es";
        break;
      case language == "it":
        i18nCode = "it";
        break;
      case language == "nl":
        i18nCode = "nl";
        break;
      case language == "pt":
        i18nCode = "pt";
        break;
      case language == "sv":
        i18nCode = "sv";
        break;
      case language == "ja":
        i18nCode = "ja";
        break;
      case language == "zh-TW":
        i18nCode = "zh-TW";
        break;
      case language == "zh-CN" || language == "zh":
        i18nCode = "zh-CN";
        break;
      default:
        i18nCode = "en";
    }
    return json({ i18nCode: i18nCode });
  } catch (error) {
    console.error("Error during authentication:", error);
    throw new Response("Error during authentication", { status: 500 });
  }
}

export function ErrorBoundary() {
  const { Title, Text } = Typography;
  const error = useRouteError();
  console.error("Root Error:", error);
  const navigate = useNavigate();
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
          <Card
            style={{
              width: "100%",
              maxWidth: 500,
              textAlign: "center",
              padding: "24px",
            }}
          >
            <Title level={1} style={{ fontSize: 72, margin: "24px 0" }}>
              {errorCode}
            </Title>
            <Title level={2} style={{ margin: "24px 0" }}>
              {currentError.title}
            </Title>
            <Text
              type="secondary"
              style={{
                display: "block",
                marginBottom: "24px",
                fontSize: 16,
              }}
            >
              {currentError.message}
            </Text>
            <Text
              style={{
                display: "block",
                marginBottom: "24px",
                fontSize: 16,
              }}
            >
              Please click the "Translate Language AI Adapt" option in the app
              navigation bar again
            </Text>
          </Card>
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
  console.log("i18nCode:", i18nCode);

  return (
    <Provider store={store}>
      <html lang={i18nCode}>
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <meta name="shopify-debug" content="web-vitals" />
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
