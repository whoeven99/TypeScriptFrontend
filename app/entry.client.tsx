import { RemixBrowser } from "@remix-run/react";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import i18n from "./i18n";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import Backend from "i18next-http-backend";
import { createCache, StyleProvider } from "@ant-design/cssinjs";
import { ConfigProvider } from "antd";
import { appAntdTheme } from "./ui/theme";
import { readI18nBoot } from "./lib/i18nBoot";

function mount() {
  const cache = createCache();
  startTransition(() => {
    hydrateRoot(
      document.getElementById("root")!,
      <I18nextProvider i18n={i18next}>
        <StyleProvider cache={cache}>
          <ConfigProvider
            theme={appAntdTheme}
            getPopupContainer={() => document.body}
          >
            <StrictMode>
              <RemixBrowser />
            </StrictMode>
          </ConfigProvider>
        </StyleProvider>
      </I18nextProvider>,
    );
  });
}

async function hydrate() {
  const boot = readI18nBoot();

  if (boot) {
    // SSR already inlined bundles — init is local-only (no /locales round-trip).
    await i18next.use(initReactI18next).init({
      ...i18n,
      lng: boot.lng,
      resources: boot.resources,
    });
    mount();
    return;
  }

  // Fallback when boot script is missing (non-document navigations / older HTML).
  await i18next
    .use(Backend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      ...i18n,
      backend: {
        loadPath: "/locales/{{lng}}/{{ns}}.json",
        requestOptions: {
          cache: "default",
        },
      },
      detection: {
        order: ["htmlTag"],
        caches: [],
      },
    });
  mount();
}

void hydrate();
