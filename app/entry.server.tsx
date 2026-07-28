import { renderToPipeableStream } from "react-dom/server";
import { RemixServer } from "@remix-run/react";
import {
  type EntryContext,
  createReadableStreamFromReadable,
} from "@remix-run/node";
import { PassThrough, Writable } from "node:stream";
import { isbot } from "isbot";
import { addDocumentResponseHeaders } from "./shopify.server";
import { I18nextProvider, initReactI18next } from "react-i18next";
import i18n from "./i18n";
import { createInstance } from "i18next";
import Backend from "i18next-fs-backend";
import { resolve } from "node:path";
import { ConfigProvider } from "antd";
import { createCache, extractStyle, StyleProvider } from "@ant-design/cssinjs";
import { renderHeadToString } from 'remix-island';
import { Head } from './root'
import { appAntdTheme } from "./ui/theme";
import { resolveAppI18nCode } from "./lib/resolveAppI18nCode";

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
) {
  const i18nCode = resolveAppI18nCode(request.headers.get("Accept-Language"));

  addDocumentResponseHeaders(request, responseHeaders);
  const userAgent = request.headers.get("user-agent");
  const isABot = isbot(userAgent ?? "");

  let instance = createInstance();
  await instance
    .use(Backend)
    .use(initReactI18next)
    .init({
      ...i18n,
      lng: i18nCode,
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
          <ConfigProvider theme={appAntdTheme}>
            <RemixServer
              context={remixContext}
              url={request.url}
            />
          </ConfigProvider>
        </StyleProvider>
      </I18nextProvider>
    );
  }

  const head = renderHeadToString({ request, remixContext, Head });
  responseHeaders.set("Content-Type", "text/html");

  const buildStreamingResponse = (streamReadyCallback: () => void) => {
    let didError = false;

    return new Promise<Response>((resolve, reject) => {
      const { pipe, abort } = renderToPipeableStream(<MainApp />, {
        onShellReady() {
          if (isABot) return; // 爬虫走 onAllReady 获取完整 HTML
          streamReadyCallback();
          resolve(buildStreamResponse(pipe, abort));
        },
        onAllReady() {
          if (!isABot) return;
          streamReadyCallback();
          resolve(buildStreamResponse(pipe, abort));
        },
        onShellError(error: unknown) {
          reject(error);
        },
        onError(error: unknown) {
          didError = true;
          console.error("[entry.server] stream error:", error);
        },
      });

      function buildStreamResponse(
        pipe: (destination: Writable) => void,
        abort: () => void,
      ) {
        const body = new PassThrough();
        body.write(
          `<!DOCTYPE html><html lang="${i18nCode}">${head}<body><div id="root">`,
        );

        const reactSink = new Writable({
          write(chunk, _encoding, callback) {
            body.write(chunk, callback);
          },
          final(callback) {
            try {
              const styleText = extractStyle(cache);
              body.write(`</div>${styleText}</body></html>`);
              body.end();
              callback();
            } catch (err) {
              callback(err as Error);
            }
          },
        });

        pipe(reactSink);

        body.once("close", () => abort());

        const stream = createReadableStreamFromReadable(body);

        return new Response(stream, {
          status: didError ? 500 : responseStatusCode,
          headers: responseHeaders,
        });
      }
    });
  };

  return buildStreamingResponse(() => {
    // 流式响应已就绪，此处可记录性能日志
  });
}
