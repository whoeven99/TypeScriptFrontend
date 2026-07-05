// main.js
import * as API from "./ciwi-api.js";
import { useCacheThenRefresh, setWithTTL, getWithTTL } from "./ciwi-storage.js";
import {
  CiwiswitcherForm,
  updateDisplayText,
  syncCompactSwitcherLayout,
  ProductImgTranslate,
  CurrencySelectorTakeEffect,
  LanguageSelectorTakeEffect,
  HomeImageTranslate,
  CustomLiquidTextTranslate,
  PageFlyTextTranslate,
  renderLanguageFlags,
  ensureLanguageLocaleData,
} from "./ciwi-ui.js";
import {
  getManualLocalizationPreference,
  updateLocalization,
} from "./ciwi-utils.js";
import { getCiwiPageContext } from "./ciwi-page.js";

customElements.define("ciwiswitcher-form", CiwiswitcherForm);

// 原 isLikelyBotByUA 逻辑（简化版）
function isLikelyBotByUA() {
  const ua = navigator.userAgent.toLowerCase();
  const botKeywords = [
    "bot",
    "spider",
    "crawl",
    "slurp",
    "bingpreview",
    "facebookexternalhit",
    "monitor",
    "headless",
    "wget",
    "curl",
    "python-requests",
  ];
  const matched = botKeywords.filter((k) => ua.includes(k));
  if (matched.length) return `ua 包含: ${matched.join(", ")}`;
  const error = [];
  if (navigator.webdriver) error.push("webdriver");
  if (!(navigator.languages && navigator.languages.length > 0))
    error.push("without languages");
  if (window.outerWidth === 0 || window.outerHeight === 0)
    error.push("window undefined");
  if (!window.__JS_EXECUTED__) error.push("js not executed");
  return error.length >= 2 ? error.join(",") : undefined;
}

// RTL 语言列表
const rtlLanguages = [
  "العربية",
  "فارسی",
  "اُردُو",
  "עברית",
  "ܣܘܪܝܝܐ",
  "پښتو",
  "دری",
  "کوردی",
  "ئۇيغۇرچە",
];

async function ciwiOnload() {
  const blockId = document.querySelector('input[name="block_id"]')?.value;
  if (!blockId) return console.warn("blockId not found");
  const ciwiBlock = document.querySelector(`#shopify-block-${blockId}`);
  if (!ciwiBlock) return console.warn("ciwiBlock not found");
  const shop = ciwiBlock.querySelector("#queryCiwiId");
  // 爬虫检测（仅拦截，不上报日志）
  const reason = isLikelyBotByUA();
  if (reason) {
    console.warn("⚠️ 疑似爬虫访问", reason);
    return;
  }

  // 按页面类型门控翻译请求，避免 cart/collection 等页面发起无关 API 调用
  const pageContext = getCiwiPageContext(ciwiBlock);

  // 主题 custom liquid 文本：全站需要
  CustomLiquidTextTranslate(blockId, shop, ciwiBlock);

  const translationTasks = [];
  if (pageContext.isProductPage) {
    translationTasks.push(ProductImgTranslate(blockId, shop, ciwiBlock));
  }
  if (pageContext.hasPageFly) {
    translationTasks.push(PageFlyTextTranslate(blockId, shop, ciwiBlock));
  }
  if (pageContext.isHomePage) {
    translationTasks.push(HomeImageTranslate(blockId));
  }
  if (translationTasks.length > 0) {
    Promise.allSettled(translationTasks).catch(() => {});
  }

  // 加载配置（缓存 + 后台刷新，保留“最多两次”语义）
  const configKey = `ciwi_switcher_config`;
  // 记录本次是否命中缓存：仅命中缓存时才在末尾后台刷新，
  // 避免首次访问（无缓存）背靠背发两次相同的 config 请求
  const hadConfigCache = !!getWithTTL(configKey);
  const fetchSwitcherConfig = await useCacheThenRefresh(
    configKey,
    async () => API.fetchSwitcherConfig({ shop: shop.value }),
    1000 * 60 * 60,
  );

  const configData = fetchSwitcherConfig?.success
    ? fetchSwitcherConfig?.response
    : null;

  //获取当前语言和地区
  const languageValue = ciwiBlock.querySelector(
    'input[name="language_code"]',
  )?.value;
  const countryValue = ciwiBlock.querySelector(
    'input[name="country_code"]',
  )?.value;
  const manualLocalizationPreference = getManualLocalizationPreference();
  const shouldSkipIpDetection =
    Boolean(manualLocalizationPreference?.country || manualLocalizationPreference?.language);

  //浏览器语言
  let browserLanguage = navigator.language || navigator.userLanguage;

  // 如果语言包含 'q=xx' 或类似的内容，提取前面的部分
  browserLanguage = browserLanguage.split(";")[0];

  if (!browserLanguage.includes("zh")) {
    browserLanguage = browserLanguage.split("-")[0]; // 只保留语言部分
  }

  let detectedCountry = countryValue;
  let detectedLanguage = browserLanguage;

  //所有可用语言
  const availableLanguages = Array.from(
    ciwiBlock.querySelectorAll(".language_selector_header option"),
  ).map((opt) => opt.value);

  //所有可用地区
  const availableCountries = Array.from(
    ciwiBlock.querySelectorAll('ul[role="list"] a[data-value]'),
  ).map((link) => link.getAttribute("data-value"));

  // IP 定位：每次进入都重新请求，不使用 localStorage 缓存
  if (configData?.ipOpen && !shouldSkipIpDetection) {
    const iptokenValue = ciwiBlock.querySelector(
      'input[name="iptoken"]',
    )?.value;

    if (!iptokenValue) return;

    const IpData = await API.fetchUserCountryInfo(iptokenValue);
    if (IpData?.countryCode) {
      detectedCountry = IpData.countryCode;
    }
  }

  //判断语言是否可用
  detectedLanguage = availableLanguages.includes(detectedLanguage)
    ? detectedLanguage
    : languageValue;

  //判断地区是否可用
  detectedCountry = availableCountries.includes(detectedCountry)
    ? detectedCountry
    : countryValue;

  //判断是否在主题编辑器内
  const isInThemeEditor = document.documentElement.classList.contains(
    "shopify-design-mode",
  );

  //不在主题编辑器内
  if (!isInThemeEditor && configData?.ipOpen && !shouldSkipIpDetection) {
    //需要定位逻辑
    if (
      detectedCountry &&
      detectedLanguage &&
      (detectedCountry !== countryValue || detectedLanguage !== languageValue)
    ) {
      updateLocalization({
        country: detectedCountry || countryValue,
        language: detectedLanguage || languageValue,
      });
    }
  }

  // 初始化语言/货币选择器
  const isCurrencySelectorTakeEffect =
    configData.currencySelector ||
    (!configData.languageSelector && !configData.currencySelector);

  const isLanguageSelectorTakeEffect =
    configData.languageSelector ||
    (!configData.languageSelector && !configData.currencySelector);

  const activeSelectorCount =
    Number(Boolean(isLanguageSelectorTakeEffect)) +
    Number(Boolean(isCurrencySelectorTakeEffect));

  LanguageSelectorTakeEffect(
    isLanguageSelectorTakeEffect,
    configData,
    ciwiBlock,
  );

  // 国旗数据（24KB）按需加载：浏览器空闲时加载并渲染国旗；
  // 若用户在此之前先接触切换器，则立即加载（先于 idle）。两条路径都只渲染一次。
  if (isLanguageSelectorTakeEffect && configData?.includedFlag) {
    const loadFlags = () =>
      ensureLanguageLocaleData().then(() =>
        renderLanguageFlags(configData, ciwiBlock),
      );
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(loadFlags, { timeout: 3000 });
    } else {
      setTimeout(loadFlags, 1200);
    }
    const mainBox = ciwiBlock.querySelector("#main-box");
    const languageSelect = ciwiBlock.querySelector(".language_selector_header");
    mainBox?.addEventListener("mouseenter", loadFlags, { once: true });
    languageSelect?.addEventListener("mouseenter", loadFlags, { once: true });
    languageSelect?.addEventListener("focus", loadFlags, { once: true });
  }

  CurrencySelectorTakeEffect(
    blockId,
    isCurrencySelectorTakeEffect,
    shop.value,
    configData,
    ciwiBlock,
  );

  // UI 样式控制（top/bottom left/right）
  const switcher = ciwiBlock.querySelector("#ciwi-container");
  const mainBox = ciwiBlock.querySelector("#main-box");
  const selectedLanguageText = ciwiBlock.querySelector(
    "#translate-float-btn-text",
  );
  const translateFloatBtn = ciwiBlock.querySelector("#translate-float-btn");
  const translateFloatBtnIcon = ciwiBlock.querySelector(
    "#translate-float-btn-icon",
  );
  const selectorBox = ciwiBlock.querySelector("#selector-box");
  const selectorBackdrop = ciwiBlock.querySelector("#selector-backdrop");
  const closeButtonWrapper = ciwiBlock.querySelector(".close_button_wrapper");
  const shouldUseSidebarWidget =
    !configData.languageSelector && !configData.currencySelector;
  const isDirectSelectorMode = activeSelectorCount === 1 && !shouldUseSidebarWidget;
  const isTransparentMode = Boolean(configData?.isTransparent);

  if (switcher) {
    switcher.style.visibility = isTransparentMode ? "hidden" : "visible";
    switcher.style.opacity = isTransparentMode ? "0" : "1";
    switcher.style.pointerEvents = isTransparentMode ? "none" : "auto";
    if (selectorBackdrop) {
      selectorBackdrop.style.display = "none";
    }

    if (!configData?.isTransparent) {
      const translateFloatBtnText = ciwiBlock.querySelector(
        "#translate-float-btn-text",
      );
      selectorBox.style.backgroundColor = configData.backgroundColor;
      switcher.style.color = configData.fontColor;
      translateFloatBtn.style.pointerEvents = "auto";

      // 四个方向处理（保持原始逻辑）
      switch (configData.selectorPosition) {
        case "top_left":
          switcher.style.top = configData.positionData + "%" || "10%";
          switcher.style.bottom = "auto";
          translateFloatBtnText.style.borderRadius = "8px 8px 0 0";
          translateFloatBtn.style.justifyContent = "flex-end";
          selectorBox.style.left = "0";
          selectorBox.style.top = "100%";
          selectorBox.style.bottom = "auto";
          break;
        case "bottom_left":
          switcher.style.bottom = configData.positionData + "%" || "10%";
          switcher.style.top = "auto";
          translateFloatBtnText.style.borderRadius = "8px 8px 0 0";
          translateFloatBtn.style.justifyContent = "flex-end";
          selectorBox.style.left = "0";
          selectorBox.style.bottom = "100%";
          selectorBox.style.top = "auto";
          break;
        case "top_right":
          switcher.style.top = configData.positionData + "%" || "10%";
          switcher.style.right = "0";
          switcher.style.bottom = "auto";
          translateFloatBtnText.style.borderRadius = "0 0 8px 8px";
          translateFloatBtn.style.justifyContent = "flex-start";
          selectorBox.style.right = "0";
          selectorBox.style.top = "100%";
          selectorBox.style.bottom = "auto";
          break;
        case "bottom_right":
          switcher.style.bottom = configData.positionData + "%" || "10%";
          switcher.style.right = "0";
          switcher.style.top = "auto";
          translateFloatBtnText.style.borderRadius = "0 0 8px 8px";
          translateFloatBtn.style.justifyContent = "flex-start";
          selectorBox.style.right = "0";
          selectorBox.style.bottom = "100%";
          selectorBox.style.top = "auto";
          break;
      }
      selectorBox.style.border = `1px solid ${configData.optionBorderColor}`;
      selectorBox.dataset.mode = isDirectSelectorMode ? "direct" : "overlay";
      selectorBox.dataset.layout = shouldUseSidebarWidget
        ? "sidebar-widget"
        : "floating";
      selectorBox.dataset.preferredPlacement =
        configData.selectorPosition?.startsWith("bottom") ? "up" : "down";
      selectorBox.classList.toggle("direct-select-mode", isDirectSelectorMode);
      selectorBox.classList.remove("mobile-sidebar-mode");
      switcher.classList.remove("mobile-sidebar-widget");
      if (selectorBackdrop) {
        selectorBackdrop.classList.remove("mobile-sidebar-backdrop");
        selectorBackdrop.style.display = "none";
      }
      if (closeButtonWrapper) {
        closeButtonWrapper.style.display = isDirectSelectorMode ? "none" : "flex";
      }

      if (isDirectSelectorMode) {
        selectorBox.style.removeProperty("width");
        selectorBox.style.border = "none";
        selectorBox.style.backgroundColor = "transparent";
        selectorBox.style.display = "flex";
        mainBox.style.display = "none";
        translateFloatBtn.style.display = "none";
      } else if (shouldUseSidebarWidget) {
        selectorBox.style.removeProperty("width");
        selectorBox.style.backgroundColor = configData.backgroundColor;
        selectorBox.style.display = "none";
        mainBox.style.display = "none";
        translateFloatBtnText.style.backgroundColor =
          configData.backgroundColor;
        translateFloatBtn.style.display = "flex";
      } else if (activeSelectorCount > 0) {
        selectorBox.style.backgroundColor = configData.backgroundColor;
        mainBox.style.backgroundColor = configData.backgroundColor;
        mainBox.style.border = `1px solid ${configData.optionBorderColor}`;
        updateDisplayText(
          configData.languageSelector,
          configData.currencySelector,
          ciwiBlock,
        );
        mainBox.style.display = "flex";
      } else {
        selectorBox.style.removeProperty("width");
        selectorBox.style.display = "none";
        mainBox.style.display = "none";
        translateFloatBtn.style.display = "none";
      }
    }
  }

  // RTL 判断
  const selectedTextElement = ciwiBlock.querySelector(".language_selector_header");
  const currentLanguage = selectedTextElement?.selectedOptions?.[0]?.textContent?.trim();
  const isRtlLanguage = rtlLanguages.includes(currentLanguage);

  if (isRtlLanguage && selectedLanguageText) {
    selectorBox.style.right = "0";
  }

  syncCompactSwitcherLayout(ciwiBlock);

  // 仅在命中缓存时后台刷新 config（异步，不阻塞）；
  // 首次无缓存时 useCacheThenRefresh 已经拉取并缓存，无需再请求一次
  if (hadConfigCache) {
    API.fetchSwitcherConfig({ shop: shop.value })
      .then((fresh) => {
        if (fresh) {
          setWithTTL("ciwi_switcher_config", fresh);
        }
      })
      .catch(() => {});
  }

  if (isCurrencySelectorTakeEffect) {
    API.fetchCurrencies({ blockId, shop: shop.value })
      .then((fresh) => {
        if (fresh) {
          localStorage.setItem("ciwi_currency_data", JSON.stringify(fresh));
        }
      })
      .catch(() => {});
  }

}

// 尽早初始化：DOM 就绪即可运行，无需等待整页所有图片/字体等资源（原 window load）。
// 三个数据脚本在 liquid 中改用 defer，保证在 DOMContentLoaded 前按序加载完，
// 因此此处运行时 window.countryCurMap 等已就绪。
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", ciwiOnload);
} else {
  ciwiOnload();
}
