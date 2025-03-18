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
import { universalLanguageDetect } from '@unly/universal-language-detector';

const ABORT_DELAY = 5000;

// 定义支持的语言列表
const SUPPORTED_LANGUAGES = ['en', 'fr', 'de', 'es', 'it', 'nl', 'pt', 'sv', 'ja', 'ko', 'ru', 'tr', 'uk', 'zh-TW', 'zh-CN'];
const FALLBACK_LANG = 'en';

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
) {
  const cookieStr = request.headers.get('cookie') || '';
  const cookiesObj = cookieStr.split(';').reduce((acc: Record<string, string>, cookie) => {
    const [key, value] = cookie.split('=').map(c => c.trim());
    if (key && value) {
      acc[key] = value;
    }
    return acc;
  }, {});

  const i18nCode = universalLanguageDetect({
    supportedLanguages: SUPPORTED_LANGUAGES, // Whitelist of supported languages, will be used to filter out languages that aren't supported
    fallbackLanguage: FALLBACK_LANG, // Fallback language in case the user's language cannot be resolved
    acceptLanguageHeader: request.headers.get("Accept-Language")?.split(",")[0] || 'en', // Optional - Accept-language header will be used when resolving the language on the server side
    serverCookies: cookiesObj, // Optional - Cookie "i18next" takes precedence over navigator configuration (ex: "i18next: fr"), will only be used on the server side
    errorHandler: (error, level, origin, context) => { // Optional - Use you own logger here, Sentry, etc.
      console.log('Custom error handler:');
      console.error(error);

      // Example if using Sentry in your app:
      // Sentry.withScope((scope): void => {
      //   scope.setExtra('level', level);
      //   scope.setExtra('origin', origin);
      //   scope.setContext('context', context);
      //   Sentry.captureException(error);
      // });
    },
  });

  console.log('Server i18nCode: ', i18nCode);
  
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
