// main.js
import * as API from "./ciwi-api.js";
import { useCacheThenRefresh, setWithTTL } from "./ciwi-storage.js";
import {
  CiwiswitcherForm,
  updateDisplayText,
  ProductImgTranslate,
  CurrencySelectorTakeEffect,
  LanguageSelectorTakeEffect,
  HomeImageTranslate,
  CustomLiquidTextTranslate,
  PageFlyTextTranslate,
} from "./ciwi-ui.js";
import { updateLocalization } from "./ciwi-utils.js";

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

async function ciwiOnload() {
  const click_point1 = Date.now();
  console.log("click point1: ", new Date(click_point1).toLocaleString());

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
  const click_point2 = Date.now();
  console.log("click point2: ", new Date(click_point2).toLocaleString());
  console.log(
    "click point2 - click point1: ",
    `${click_point2 - click_point1}ms`,
  );

  // 产品图片翻译（非阻塞）
  ProductImgTranslate(blockId, shop, ciwiBlock);
  const click_point3 = Date.now();
  console.log("click point3: ", new Date(click_point3).toLocaleString());
  console.log(
    "click point3 - click point2: ",
    `${click_point3 - click_point2}ms`,
  );

  // 网页custom liquid 文本翻译
  CustomLiquidTextTranslate(blockId, shop, ciwiBlock);
  const click_point4 = Date.now();
  console.log("click point4: ", new Date(click_point4).toLocaleString());
  console.log(
    "click point4 - click point3: ",
    `${click_point4 - click_point3}ms`,
  );

  //延时5s后再次执行
  setTimeout(() => CustomLiquidTextTranslate(blockId, shop, ciwiBlock), 5000);
  const click_point5 = Date.now();
  console.log("click point5: ", new Date(click_point5).toLocaleString());
  console.log(
    "click point5 - click point4: ",
    `${click_point5 - click_point4}ms`,
  );

  //PageFly翻译
  PageFlyTextTranslate(blockId, shop, ciwiBlock);
  const click_point6 = Date.now();
  console.log("click point6: ", new Date(click_point6).toLocaleString());
  console.log(
    "click point6 - click point5: ",
    `${click_point6 - click_point5}ms`,
  );

  // 主页图片替换
  HomeImageTranslate(blockId);
  const click_point7 = Date.now();
  console.log("click point7: ", new Date(click_point7).toLocaleString());
  console.log(
    "click point7 - click point6: ",
    `${click_point7 - click_point6}ms`,
  );

  // 加载配置（缓存 + 后台刷新，保留“最多两次”语义）
  const configKey = `ciwi_switcher_config`;
  const configData = await useCacheThenRefresh(
    configKey,
    async () => API.fetchSwitcherConfig({ blockId, shop: shop.value }),
    1000 * 60 * 60,
  );
  const click_point8 = Date.now();
  console.log("click point8: ", new Date(click_point8).toLocaleString());
  console.log(
    "click point8 - click point7: ",
    `${click_point8 - click_point7}ms`,
  );

  // RTL 判断
  const selectedTextElement = ciwiBlock.querySelector(
    '.selected-option[data-type="language"] .selected-text',
  );
  const currentLanguage = selectedTextElement?.textContent?.trim();
  const isRtlLanguage = rtlLanguages.includes(currentLanguage);
  const click_point9 = Date.now();
  console.log("click point9: ", new Date(click_point9).toLocaleString());
  console.log(
    "click point9 - click point8: ",
    `${click_point9 - click_point8}ms`,
  );

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
  const click_point10 = Date.now();
  console.log("click point10: ", new Date(click_point10).toLocaleString());
  console.log(
    "click point10 - click point9: ",
    `${click_point10 - click_point9}ms`,
  );

  // 初始化语言/货币选择器
  const isCurrencySelectorTakeEffect =
    configData.currencySelector ||
    (!configData.languageSelector && !configData.currencySelector);
  const isLanguageSelectorTakeEffect =
    configData.languageSelector ||
    (!configData.languageSelector && !configData.currencySelector);
  const click_point11 = Date.now();
  console.log("click point11: ", new Date(click_point11).toLocaleString());
  console.log(
    "click point11 - click point10: ",
    `${click_point11 - click_point10}ms`,
  );

  LanguageSelectorTakeEffect(
    isLanguageSelectorTakeEffect,
    configData,
    ciwiBlock,
  );
  const click_point12 = Date.now();
  console.log("click point12: ", new Date(click_point12).toLocaleString());
  console.log(
    "click point12 - click point11: ",
    `${click_point12 - click_point11}ms`,
  );

  CurrencySelectorTakeEffect(
    blockId,
    isCurrencySelectorTakeEffect,
    shop.value,
    configData,
    ciwiBlock,
  );
  const click_point13 = Date.now();
  console.log("click point13: ", new Date(click_point13).toLocaleString());
  console.log(
    "click point13 - click point12: ",
    `${click_point13 - click_point12}ms`,
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
  const click_point14 = Date.now();
  console.log("click point14: ", new Date(click_point14).toLocaleString());
  console.log(
    "click point14 - click point13: ",
    `${click_point14 - click_point13}ms`,
  );

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
  const click_point15 = Date.now();
  console.log("click point15: ", new Date(click_point15).toLocaleString());
  console.log(
    "click point15 - click point14: ",
    `${click_point15 - click_point14}ms`,
  );

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
        setWithTTL("ciwi_switcher_config", fresh);
      }
    })
    .catch(() => {});
  const click_point16 = Date.now();
  console.log("click point16: ", new Date(click_point16).toLocaleString());
  console.log(
    "click point16 - click point15: ",
    `${click_point16 - click_point15}ms`,
  );

  if (isCurrencySelectorTakeEffect) {
    API.fetchCurrencies({ blockId, shop: shop.value })
      .then((fresh) => {
        if (fresh) {
          localStorage.setItem("ciwi_currency_data", JSON.stringify(fresh));
        }
      })
      .catch(() => {});
  }
  const click_point17 = Date.now();
  console.log("click point17: ", new Date(click_point17).toLocaleString());
  console.log(
    "click point17 - click point16: ",
    `${click_point17 - click_point16}ms`,
  );

  // 刷新缓存
  console.log("onload end (modular+full)");
}

window.addEventListener("load", ciwiOnload);
