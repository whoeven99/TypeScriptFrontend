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
  // useEffect(() => {
  //   // Create the script element for Shopify App Bridge
  //   const script = document.createElement("script");
  //   script.src = "https://cdn.shopify.com/shopifycloud/app-bridge.js";
  //   script.async = true;
  //   script.onload = () => {
  //     // Define the processWebVitals function after the script is loaded
  //     const processWebVitals = (metrics: any) => {
  //       const monitorUrl =
  //         "https://sorry-lbs-abraham-barn.trycloudflare.com/web-vitals-metrics";
  //       const data = JSON.stringify(metrics);
  //       navigator.sendBeacon(monitorUrl, data);
  //     };
  //   };
  //   document.head.appendChild(script);
  // }, []);

  return (
    <Provider store={store}>
      <html>
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          {/* <meta name="shopify-debug" content="web-vitals" />
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
