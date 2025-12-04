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
  console.log("onload start (modular+full)");

  const languageInputs = document.querySelectorAll(
    'input[name="language_code"], input[name="locale_code"]',
  );
  const countryInputs = document.querySelectorAll('input[name="country_code"]');

  console.log("languageInputs: ", languageInputs);
  console.log("countryInputs: ", countryInputs);

  // 创建 MutationObserver 监听器
  const observeValueChange = (inputElement, storageKey) => {
    const observer = new MutationObserver((mutationsList) => {
      mutationsList.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "value"
        ) {
          console.log(`value has changed: `, inputElement.value);
          localStorage.setItem(storageKey, inputElement.value);
        }
      });
    });

    observer.observe(inputElement, { attributes: true });
  };

  // 为每个语言输入字段添加 MutationObserver
  languageInputs.forEach((languageInput) => {
    observeValueChange(languageInput, "ciwi_selected_language");
  });

  // 为每个地区输入字段添加 MutationObserver
  countryInputs.forEach((countryInput) => {
    observeValueChange(countryInput, "ciwi_selected_country");
  });

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
  ProductImgTranslate(blockId, shop, ciwiBlock);

  // 网页custom liquid 文本翻译
  CustomLiquidTextTranslate(blockId, shop, ciwiBlock);

  //延时5s后再次执行
  setTimeout(() => CustomLiquidTextTranslate(blockId, shop, ciwiBlock), 5000);

  //PageFly翻译
  PageFlyTextTranslate(blockId, shop, ciwiBlock);

  // 主页图片替换
  HomeImageTranslate(blockId);

  // 加载配置（缓存 + 后台刷新，保留“最多两次”语义）
  const configKey = `ciwi_switcher_config`;
  const fetchSwitcherConfig = await useCacheThenRefresh(
    configKey,
    async () => API.fetchSwitcherConfig({ blockId, shop: shop.value }),
    1000 * 60 * 60,
  );

  const configData = fetchSwitcherConfig?.success
    ? fetchSwitcherConfig?.response
    : null;

  //获取语言信息、地区信息和货币信息的缓存，用来判断是否需要ip定位
  const storedLanguage = localStorage.getItem("ciwi_selected_language");
  const storedCurrency = localStorage.getItem("ciwi_selected_currency");
  const storedCountry = localStorage.getItem("ciwi_selected_country");

  //获取当前语言和地区
  const languageValue = ciwiBlock.querySelector(
    'input[name="language_code"]',
  )?.value;
  const countryValue = ciwiBlock.querySelector(
    'input[name="country_code"]',
  )?.value;

  //用户自定义ip配置数据
  const ipRedirections = configData?.ipRedirections;

  //需要ip定位判断，为true则需要
  let needRedirection = !storedCountry && !storedCurrency;

  //浏览器语言
  let browserLanguage = navigator.language;
  if (!browserLanguage.includes("zh")) {
    browserLanguage = browserLanguage.split("-")[0];
  }

  //获取地区对应货币数据
  const countryCurMap = window.countryCurMap ? window.countryCurMap : null;

  let detectedCountry = countryValue;
  let detectedLanguage = browserLanguage;
  let detectedCurrency = countryCurMap[countryValue];

  //所有可用语言
  const availableLanguages = Array.from(
    ciwiBlock.querySelectorAll(".option-item[data-type='language']"),
  ).map((opt) => opt.dataset.value);

  //所有可用地区
  const availableCountries = Array.from(
    ciwiBlock.querySelectorAll('ul[role="list"] a[data-value]'),
  ).map((link) => link.getAttribute("data-value"));

  // IP 定位逻辑
  if (needRedirection && configData?.ipOpen) {
    const iptokenValue = ciwiBlock.querySelector(
      'input[name="iptoken"]',
    )?.value;

    if (!iptokenValue) return;

    const checkUserIpStart = Date.now();

    //获取是否能够ip定位
    const userIp = await API.checkUserIp({ blockId, shop: shop.value });
    const checkUserIpCost = Date.now() - checkUserIpStart;

    //能够定位则开始调用ipapi接口
    if (Array.isArray(userIp?.response)) {
      const fetchCountryStart = Date.now();

      //调用ipapi接口
      const IpData = await API.fetchUserCountryInfo(iptokenValue);

      const fetchCountryCost = Date.now() - fetchCountryStart;

      //ip信息
      const ip = IpData?.ip;

      //暂存默认数据
      detectedCountry = IpData?.country_code;

      //地区对应货币符号
      const ipCurrency = countryCurMap[countryValue];

      //打印日志
      API.FrontEndPrinting({
        blockId,
        shop: shop.value,
        ip,
        languageCode: browserLanguage,
        langInclude: availableLanguages.includes(browserLanguage),
        countryCode: detectedCountry,
        counInclude: availableCountries.includes(detectedCountry),
        currencyCode: ipCurrency,
        checkUserIpCostTime: checkUserIpCost,
        fetchUserCountryInfoCostTime: fetchCountryCost,
        status: IpData?.status,
        error: IpData?.ip ? "" : JSON.stringify(IpData),
      });
    }
  }

  //查询当前或者需要定位的地区的语言货币配置
  const ipRedirection = ipRedirections?.find(
    (item) => item?.region == detectedCountry,
  );

  //语言货币配置
  const ipRedirectionLanguageValue = ipRedirection?.languageCode || "auto";
  const ipRedirectionCurrencyValue = ipRedirection?.currencyCode || "auto";

  //更新应当跳转的货币和语言
  detectedLanguage = storedLanguage
    ? storedLanguage
    : ipRedirectionLanguageValue == "auto"
      ? browserLanguage
      : ipRedirectionLanguageValue;
  detectedCurrency = storedCurrency
    ? storedCurrency
    : ipRedirectionCurrencyValue == "auto"
      ? detectedCurrency
      : ipRedirectionCurrencyValue;

  //判断语言是否可用
  detectedLanguage = availableLanguages.includes(detectedLanguage)
    ? detectedLanguage
    : languageValue;

  localStorage.setItem("ciwi_selected_language", detectedLanguage);

  //缓存货币数据
  if (detectedCurrency != storedCountry && detectedCurrency) {
    localStorage.setItem("ciwi_selected_currency", detectedCurrency);
  }

  //判断地区是否可用
  detectedCountry = availableCountries.includes(detectedCountry)
    ? detectedCountry
    : countryValue;

  localStorage.setItem("ciwi_selected_country", detectedCountry);

  //判断是否在主题编辑器内
  const isInThemeEditor = document.documentElement.classList.contains(
    "shopify-design-mode",
  );

  console.log("detectedCountry: ", detectedCountry);
  console.log("detectedLanguage: ", detectedLanguage);
  console.log("countryValue: ", countryValue);
  console.log("languageValue: ", languageValue);
  console.log(
    "detectedCountry !== countryValue: ",
    detectedCountry !== countryValue,
  );
  console.log(
    "detectedLanguage !== languageValue: ",
    detectedLanguage !== languageValue,
  );
  console.log("isInThemeEditor: ", isInThemeEditor);
  console.log("needRedirection: ", needRedirection);

  //不在主题编辑器内
  if (!isInThemeEditor && configData?.ipOpen) {
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

  LanguageSelectorTakeEffect(
    isLanguageSelectorTakeEffect,
    configData,
    ciwiBlock,
  );

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

  // RTL 判断
  const selectedTextElement = ciwiBlock.querySelector(
    '.selected-option[data-type="language"] .selected-text',
  );
  const currentLanguage = selectedTextElement?.textContent?.trim();
  const isRtlLanguage = rtlLanguages.includes(currentLanguage);

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
}

window.addEventListener("load", ciwiOnload);
