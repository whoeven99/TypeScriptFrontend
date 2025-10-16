// main.js
import * as API from "./ciwi-api.js";
import { useCacheThenRefresh } from "./ciwi-storage.js";
import {
  CiwiswitcherForm,
  updateDisplayText,
  ProductImgTranslate,
  CurrencySelectorTakeEffect,
  LanguageSelectorTakeEffect,
  HomeImageTranslate
} from "./ciwi-ui.js";

// 在 window.onload 里

console.log("welcome to use Ciwi.ai Language Switcher (modular)");

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

window.onload = async () => {
  console.log("onload start (modular+full)");
  const blockId = document.querySelector('input[name="block_id"]')?.value;
  if (!blockId) return console.warn("blockId not found");
  const ciwiBlock = document.querySelector(`#shopify-block-${blockId}`);
  if (!ciwiBlock) return console.warn("ciwiBlock not found"); 
  const shop = ciwiBlock.querySelector("#queryCiwiId");
  // 爬虫检测
  const reason = isLikelyBotByUA();
  if (reason) {
    console.warn("⚠️ 疑似爬虫访问", reason);
    API.CrawlerDDetectionReport({
      shop: shop.value,
      blockId,
      ua: navigator.userAgent,
      reason,
    });
    return;
  }
  // 产品图片翻译（非阻塞）
  await ProductImgTranslate(blockId, shop, ciwiBlock);
  // 主页图片替换
  await HomeImageTranslate(blockId);
  setTimeout(() => {
    const observer = new MutationObserver(async (mutations) => {
      for (const m of mutations) {
        if (m.addedNodes.length > 0) {
          await ProductImgTranslate(blockId, shop, ciwiBlock);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }, 100);
  console.log('switcher image replace');
  
  // 加载配置（缓存 + 后台刷新，保留“最多两次”语义）
  const configKey = `ciwi_switcher_config`;
  const configData = await useCacheThenRefresh(
    configKey,
    async () => API.fetchSwitcherConfig({ blockId, shop: shop.value }),
    1000 * 60 * 60,
  );
  // RTL 判断
  const selectedTextElement = ciwiBlock.querySelector(
    '.selected-option[data-type="language"] .selected-text',
  );
  const currentLanguage = selectedTextElement?.textContent?.trim();
  const isRtlLanguage = rtlLanguages.includes(currentLanguage);
  // IP 定位逻辑
  if (configData?.ipOpen) {
    const iptokenInput = ciwiBlock.querySelector('input[name="iptoken"]');
    const iptokenValue = iptokenInput?.value;
    if (iptokenValue) {
      const storedCountry = localStorage.getItem("ciwi_selected_country");
      const storedCurrency = localStorage.getItem("ciwi_selected_currency");
      const languageInput = ciwiBlock.querySelector(
        'input[name="language_code"]',
      );
      const countryInput = ciwiBlock.querySelector(
        'input[name="country_code"]',
      );
      const language = languageInput?.value;
      const country = countryInput?.value;
      const availableLanguages = Array.from(
        ciwiBlock.querySelectorAll(".option-item[data-type='language']"),
      ).map((opt) => opt.dataset.value);
      const availableCountries = Array.from(
        ciwiBlock.querySelectorAll('ul[role="list"] a[data-value]'),
      ).map((link) => link.getAttribute("data-value"));
      let browserLanguage = navigator.language;
      if (!browserLanguage.includes("zh")) {
        browserLanguage = browserLanguage.split("-")[0];
      }
      let detectedLanguage = availableLanguages.includes(browserLanguage)
        ? browserLanguage
        : null;
      if (!storedCountry && !storedCurrency) {
        const checkUserIpStart = Date.now();
        const userIp = await API.checkUserIp({ blockId, shop: shop.value });
        const checkUserIpCost = Date.now() - checkUserIpStart;
        if (userIp) {
          const fetchCountryStart = Date.now();
          const IpData = await API.fetchUserCountryInfo(iptokenValue);
          const fetchCountryCost = Date.now() - fetchCountryStart;
          const ip = IpData?.ip;
          const currencyCode = IpData?.currency?.code;
          const countryCode = IpData?.country_code;
          API.FrontEndPrinting({
            blockId,
            shop: shop.value,
            ip,
            languageCode: browserLanguage,
            langInclude: availableLanguages.includes(browserLanguage),
            countryCode,
            counInclude: availableCountries.includes(countryCode),
            currencyCode,
            checkUserIpCostTime: checkUserIpCost,
            fetchUserCountryInfoCostTime: fetchCountryCost,
            status: IpData?.status,
            error: IpData?.ip ? "" : JSON.stringify(IpData),
          });
          if (currencyCode) {
            localStorage.setItem("ciwi_selected_currency", currencyCode);
          }
          let detectedCountry;
          if (countryCode && availableCountries.includes(countryCode)) {
            detectedCountry = countryCode;
            localStorage.setItem("ciwi_selected_country", countryCode);
          } else {
            localStorage.setItem("ciwi_selected_country", "false");
          }
          const isInThemeEditor = document.documentElement.classList.contains(
            "shopify-design-mode",
          );
          if (
            detectedCountry &&
            detectedLanguage &&
            (detectedCountry !== country || detectedLanguage !== language) &&
            !isInThemeEditor
          ) {
            updateLocalization({
              country: detectedCountry,
              language: detectedLanguage,
            });
          }
        }
      }
    }
  }
  // 初始化语言/货币选择器
  const isCurrencySelectorTakeEffect =
    configData.currencySelector ||
    (!configData.languageSelector && !configData.currencySelector);
  const isLanguageSelectorTakeEffect =
    configData.languageSelector ||
    (!configData.languageSelector && !configData.currencySelector);
  await LanguageSelectorTakeEffect(
    isLanguageSelectorTakeEffect,
    configData,
    ciwiBlock,
  );
  await CurrencySelectorTakeEffect(
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
  if (switcher) {
    if (!configData?.isTransparent) {
      const translateFloatBtnText = ciwiBlock.querySelector(
        "#translate-float-btn-text",
      );
      const optionsContainer = ciwiBlock.querySelectorAll(".options-container");
      selectorBox.style.backgroundColor = configData.backgroundColor;
      switcher.style.color = configData.fontColor;
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
          optionsContainer.forEach((item) => {
            item.style.top = "-135px";
            item.style.marginTop = "-4px";
          });
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
          optionsContainer.forEach((item) => {
            item.style.top = "-135px";
            item.style.marginTop = "-4px";
          });
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

      if (configData.languageSelector || configData.currencySelector) {
        mainBox.style.backgroundColor = configData.backgroundColor;
        mainBox.style.border = `1px solid ${configData.optionBorderColor}`;
        updateDisplayText(
          configData.languageSelector,
          configData.currencySelector,
          ciwiBlock,
        );
        mainBox.style.display = "flex";
      } else {
        selectorBox.style.width = "150px";
        translateFloatBtnText.style.backgroundColor =
          configData.backgroundColor;
        translateFloatBtn.style.display = "flex";
      }
    }
  }
  // RTL 样式微调
  if (isRtlLanguage && selectedLanguageText) {
    selectedLanguageText.style.transform = "rotate(90deg)";
    selectedLanguageText.style.right = "0";
    translateFloatBtnIcon.style.right = "10px";
    selectorBox.style.right = "0";
  }
  // 最后一次刷新 config（异步，不阻塞）
  API.fetchSwitcherConfig({ blockId, shop: shop.value })
    .then((fresh) => {
      if (fresh) {
        localStorage.setItem("ciwi_switcher_config", JSON.stringify(fresh));
      }
    })
    .catch(() => {});

  if (isCurrencySelectorTakeEffect) {
    API.fetchCurrencies({ blockId, shop: shop.value })
      .then((fresh) => {
        if (fresh) {
          localStorage.setItem("ciwi_currency_data", JSON.stringify(fresh));
        }
      })
      .catch(() => {});
  }
  // 刷新缓存
  console.log("onload end (modular+full)");
};
