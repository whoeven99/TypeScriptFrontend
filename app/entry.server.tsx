import { PassThrough } from "stream";
import { renderToPipeableStream } from "react-dom/server";
import { RemixServer, useLoaderData } from "@remix-run/react";
import {
  createReadableStreamFromReadable,
  json,
  LoaderFunctionArgs,
  type EntryContext,
} from "@remix-run/node";
import { isbot } from "isbot";
import { addDocumentResponseHeaders } from "./shopify.server";
import { I18nextProvider, initReactI18next } from "react-i18next";
import i18n from "./i18n";
import { createInstance } from "i18next";
import Backend from "i18next-fs-backend";
import { resolve } from "node:path";

const ABORT_DELAY = 5000;

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
) {
  const language =
    request.headers.get("Accept-Language")?.split(",")[0] || "en";
  console.log("trans: ", language);
  let i18nCode;

  switch (true) {
    case language == "en-US":
      //     // i18n.changeLanguage("zh");
      i18nCode = "en";
    case language == "en-GB":
      //     // i18n.changeLanguage("zh");
      i18nCode = "en";
    case language == "zh-CN":
      //     // i18n.changeLanguage("zh");
      i18nCode = "zh";
  }

  addDocumentResponseHeaders(request, responseHeaders);
  const userAgent = request.headers.get("user-agent");
  const callbackName = isbot(userAgent ?? "") ? "onAllReady" : "onShellReady";

  let instance = createInstance();
  await instance
    .use(Backend) // Setup our backend
    .use(initReactI18next) // Tell our instance to use react-i18next
    .init({
      ...i18n, // spread the configuration
      fallbackLng: i18nCode,
      backend: { loadPath: resolve("./public/locales/{{lng}}/{{ns}}.json") },
    });

  return new Promise((resolve, reject) => {
    const { pipe, abort } = renderToPipeableStream(
      <I18nextProvider i18n={instance}>
        <RemixServer
          context={remixContext}
          url={request.url}
          abortDelay={ABORT_DELAY}
        />
      </I18nextProvider>,
      {
        [callbackName]: () => {
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          );
          pipe(body);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          console.error(error);
        },
      },
    );

    setTimeout(abort, ABORT_DELAY);
  });
}
