import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import { Provider } from "react-redux";
import store from "./store";
import "./styles.css";
import "react-quill/dist/quill.snow.css";
import { useEffect } from "react";

export default function App() {
  useEffect(() => {
    const callback = async (metrics: any) => {
      const monitorUrl = "https://typescriptfrontend.onrender.com/web-vitals-metrics";
      const data = JSON.stringify(metrics);

      navigator.sendBeacon(monitorUrl, data);
    };

    // Register the callback
  }, []);

  return (
    <Provider store={store}>
      <html>
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <meta name="shopify-debug" content="web-vitals" />
          <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js" />
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
