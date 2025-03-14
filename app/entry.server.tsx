import { PassThrough } from "stream";
import { renderToPipeableStream, renderToString } from "react-dom/server";
import { RemixServer } from "@remix-run/react";
import {
  createReadableStreamFromReadable,
  type EntryContext,
} from "@remix-run/node";
import { isbot } from "isbot";
import { addDocumentResponseHeaders } from "./shopify.server";
import { I18nextProvider, initReactI18next } from "react-i18next";
import i18n from "./i18n";
import { createInstance } from "i18next";
import Backend from "i18next-fs-backend";
import { resolve } from "node:path";
import { ConfigProvider } from "antd";
import { createCache, extractStyle, StyleProvider } from "@ant-design/cssinjs";

const ABORT_DELAY = 5000;

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
) {
  const language =
    request.headers.get("Accept-Language")?.split(",")[0] || "en";
  const languageCode = language.split("-")[0];
  let i18nCode;
  console.log("Server language: ", language);
  console.log("Server request.headers.get('Accept-Language'): ", request.headers.get("Accept-Language"));
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
    case language === "zh-TW":
      i18nCode = "zh-TW";
      break;
    case language === "zh-CN" || language === "zh":
      i18nCode = "zh-CN";
      break;
    default:
      i18nCode = "en";
  }
  console.log("Server i18nCode: ", i18nCode);

  addDocumentResponseHeaders(request, responseHeaders);
  const userAgent = request.headers.get("user-agent");
  const callbackName = isbot(userAgent ?? "") ? "onAllReady" : "onShellReady";

  let instance = createInstance();
  await instance
    .use(Backend)
    .use(initReactI18next)
    .init({
      ...i18n,
      fallbackLng: i18nCode,
      backend: {
        loadPath: resolve("./public/locales/{{lng}}/{{ns}}.json"),
        requestOptions: {
          cache: 'no-store',
        },
      },
    });
  const cache = createCache();

  function MainApp() {
    return (
      <I18nextProvider i18n={instance}>
        <StyleProvider cache={cache}>
          <ConfigProvider
            theme={{
              token: {
                colorPrimary: "#007F61", // 设置主色
              },
            }}
          >
            <RemixServer
              context={remixContext}
              url={request.url}
              abortDelay={ABORT_DELAY}
            />
          </ConfigProvider>
        </StyleProvider>
      </I18nextProvider>
    );
  }

  let markup = renderToString(<MainApp />);
  const styleText = extractStyle(cache);

  markup = markup.replace("__ANTD__", styleText);

  responseHeaders.set("Content-Type", "text/html");

  return new Response("<!DOCTYPE html>" + markup, {
    status: responseStatusCode,
    headers: responseHeaders,
  });
}
