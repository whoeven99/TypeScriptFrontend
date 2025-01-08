import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";
import { Provider } from "react-redux";
import store from "./store";
import "./styles.css";
import "react-quill/dist/quill.snow.css";
import { json, LoaderFunctionArgs } from "@remix-run/node";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const language =
      request.headers.get("Accept-Language")?.split(",")[0] || "en";
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
      case language == "zh-CN":
        i18nCode = "zh";
        break;
      default:
        i18nCode = "en";
    }
    return json({ i18nCode: i18nCode });
  } catch (error) {
    console.error("Error during authentication:", error);
    throw new Response("Error during authentication", { status: 500 });
  }
};

export default function App() {
  const { i18nCode } = useLoaderData<typeof loader>();

  return (
    <Provider store={store}>
      <html lang={i18nCode}>
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          {/* <meta name="shopify-debug" content="web-vitals" />
          <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js" />
          <meta
            name="shopify-api-key"
            content="4b05c1caefa9e0761a0538b64159b627"
          /> */}
          <link rel="preconnect" href="https://cdn.shopify.com/" />
          <link
            rel="stylesheet"
            href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
          />
          <Meta />
          <Links />
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
