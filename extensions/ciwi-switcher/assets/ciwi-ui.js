// ui.js
import {
  fetchCurrencies,
  GetProductImageData,
  fetchAutoRate,
  GetShopImageData,
  ParseLiquidDataByShopNameAndLanguage,
  ReadTranslatedText,
} from "./ciwi-api.js";
import {
  asCacheableTranslationResponse,
  buildTranslationCacheKey,
  CIWI_TRANSLATION_TTL_MS,
} from "./ciwi-page.js";
import { useCacheThenRefresh } from "./ciwi-storage.js";
import { transformPrices } from "./ciwi-utils.js";

/**
 * Skip hidden nodes during translation without forcing style recalc on every walker step.
 */
const isElementHiddenForTranslation = (element) => {
  if (!element || !(element instanceof Element)) return false;
  if (typeof element.checkVisibility === "function") {
    return !element.checkVisibility({ checkOpacity: false });
  }
  return element.offsetParent === null && element !== document.body;
};

/**
 * 渲染货币选项
 */
export function renderCurrencyOptions({
  currencySelect,
  currencyData,
  selectedCurrencyCode,
}) {
  if (!currencySelect) return;

  currencySelect.innerHTML = "";
  currencyData.forEach((currency) => {
    const optionItem = document.createElement("option");
    optionItem.value = currency?.currencyCode || "";
    optionItem.textContent = currency?.symbol
      ? `${currency?.currencyCode} (${currency?.symbol})`
      : `${currency?.currencyCode}`;
    optionItem.selected = currency?.currencyCode === selectedCurrencyCode;
    currencySelect.appendChild(optionItem);
  });
}

/**
 * 初始化货币选择器
 */
export async function initializeCurrency({
  blockId,
  currencyData,
  shop,
  ciwiBlock,
}) {
  const selectedCurrencyCode = localStorage.getItem("ciwi_selected_currency");

  const moneyFormat = ciwiBlock.querySelector("#queryMoneyFormat").value;

  const selectedCurrency = currencyData?.find(
    (item) => item?.currencyCode == selectedCurrencyCode,
  );

  const isValueInCurrencies =
    selectedCurrency && !selectedCurrency?.primaryStatus;

  // 获取新的选择器元素
  const customSelector = ciwiBlock.querySelector(
    "#currency-switcher-container",
  );
  const currencySelect = customSelector?.querySelector(".currency_selector_header");
  const pageCurrencyCode = ciwiBlock.querySelector(
    'input[name="currency_code"]',
  )?.value;

  renderCurrencyOptions({
    currencySelect,
    currencyData,
    selectedCurrencyCode: selectedCurrencyCode || pageCurrencyCode,
  });

  if (isValueInCurrencies) {
    let rate = 1;
    if (selectedCurrency?.exchangeRate == "Auto") {
      const localRateJSON = localStorage.getItem("ciwi_selected_currency_rate");
      const localRate = JSON.parse(localRateJSON);
      if (localRate && localRate?.currencyCode == selectedCurrencyCode) {
        rate = localRate?.exchangeRate;
      } else {
        const autoRate = await fetchAutoRate({
          blockId,
          shop: shop,
          currencyCode: selectedCurrency.currencyCode,
        });
        if (typeof rate == "number") {
          rate = autoRate;
        }
        localStorage.setItem(
          "ciwi_selected_currency_rate",
          JSON.stringify({
            currencyCode: selectedCurrency.currencyCode,
            exchangeRate: rate,
          }),
        );
      }
    } else {
      rate = selectedCurrency.exchangeRate;
    }
    // 转换现有价格并开始观察整个文档 body
    // （initPriceObserver 内部会先执行一次全量转换，避免这里重复扫描整个文档）
    initPriceObserver({ rate, moneyFormat, selectedCurrency });
  }
}

/**
 * 观察 DOM 变化，动态处理新价格
 */
export function initPriceObserver({ rate, moneyFormat, selectedCurrency }) {
  const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1 && node.matches?.(".ciwi-money")) {
            transformPrices({ rate, moneyFormat, selectedCurrency });
          } else if (node.querySelectorAll) {
            if (node.querySelectorAll(".ciwi-money").length > 0) {
              transformPrices({ rate, moneyFormat, selectedCurrency });
            }
          }
        });
      }
    }
  });

  // 初始执行一次
  transformPrices({ rate, moneyFormat, selectedCurrency });

  // 开始观察
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

/**
 * 更新mainBox内容
 */
export function updateDisplayText(lang, cur, ciwiBlock) {
  let selectedLanguageText = "";
  let selectedCurrencyText = "";
  if (lang) {
    const languageSelect = ciwiBlock.querySelector(".language_selector_header");
    selectedLanguageText =
      languageSelect?.selectedOptions?.[0]?.textContent?.trim() || "";
  }

  if (cur) {
    const currencySelect = ciwiBlock.querySelector(".currency_selector_header");
    selectedCurrencyText =
      currencySelect?.value ||
      ciwiBlock.querySelector('input[name="currency_code"]')?.value ||
      "";
  }

  const displayTextElement = ciwiBlock.querySelector("#display-text");

  if (displayTextElement) {
    if (selectedLanguageText && selectedCurrencyText) {
      displayTextElement.textContent = `${selectedLanguageText} / ${selectedCurrencyText}`;
    } else if (selectedLanguageText) {
      displayTextElement.textContent = selectedLanguageText;
    } else if (selectedCurrencyText) {
      displayTextElement.textContent = selectedCurrencyText;
    }
  }
}

/**
 * 启用货币选择器
 */
export async function CurrencySelectorTakeEffect(
  blockId,
  isCurrencySelectorTakeEffect,
  shop,
  data,
  ciwiBlock,
) {
  if (!isCurrencySelectorTakeEffect) return;

  const localStorageCurrencyDataJSON =
    localStorage.getItem("ciwi_currency_data");
  let currencyData = [];

  if (localStorageCurrencyDataJSON) {
    try {
      currencyData = JSON.parse(localStorageCurrencyDataJSON);
    } catch {
      currencyData = [];
    }
  }
  if (!Array.isArray(currencyData) || !currencyData.length) {
    currencyData = await fetchCurrencies({ blockId, shop });
    localStorage.setItem("ciwi_currency_data", JSON.stringify(currencyData));
  }

  const currencySelector = ciwiBlock.querySelector(
    "#currency-switcher-container",
  );
  const currencySelectorHeader = ciwiBlock.querySelector(
    ".currency_selector_header",
  );
  const currencySelectorWrapper = currencySelectorHeader?.closest(".native-selector");

  if (currencySelectorWrapper) {
    currencySelectorWrapper.style.backgroundColor = data.backgroundColor;
    currencySelectorWrapper.style.border = `1px solid ${data.optionBorderColor}`;
  }
  currencySelectorHeader.style.backgroundColor = "transparent";
  currencySelectorHeader.style.border = "none";
  currencySelector.style.display = "block";

  initializeCurrency({ blockId, currencyData, shop, ciwiBlock });
}

/**
 * 启用语言选择器
 */
export async function LanguageSelectorTakeEffect(
  isLanguageSelectorTakeEffect,
  data,
  ciwiBlock,
) {
  if (!isLanguageSelectorTakeEffect) {
    return;
  }
  const languageSelector = ciwiBlock.querySelector(
    "#language-switcher-container",
  );
  languageSelector.style.display = "block";
  const languageSelectorHeader = ciwiBlock.querySelector(
    ".language_selector_header",
  );
  const languageSelectorWrapper = languageSelectorHeader?.closest(".native-selector");
  if (languageSelectorWrapper) {
    languageSelectorWrapper.style.backgroundColor = data.backgroundColor;
    languageSelectorWrapper.style.border = `1px solid ${data.optionBorderColor}`;
  }
  languageSelectorHeader.style.backgroundColor = "transparent";
  languageSelectorHeader.style.border = "none";
  const languageSelectorSelectedOption = ciwiBlock.querySelector(
    ".options-container[data-type='language']",
  );
  if (languageSelectorSelectedOption) {
    languageSelectorSelectedOption.style.backgroundColor = data.backgroundColor;
    languageSelectorSelectedOption.style.border = `1px solid ${data.optionBorderColor}`;
  }
  const selectorFlag = ciwiBlock.querySelector("#language-selector-flag");
  if (selectorFlag) {
    selectorFlag.dataset.enabled = data?.includedFlag ? "true" : "false";
  }
  if (data?.includedFlag) {
    const languageCode = ciwiBlock.querySelector('input[name="language_code"]')?.value;
    const flagUrl = window.languageLocaleData?.[languageCode]?.countries?.[0];
    updateLanguageSelectorFlag(ciwiBlock, flagUrl);
  } else {
    updateLanguageSelectorFlag(ciwiBlock, "");
  }
}

// 语言国旗渲染（依赖 24KB 的 languageLocaleData）。
// 从 LanguageSelectorTakeEffect 拆出，便于按需（空闲/交互）延迟渲染，
// 把 24KB 数据移出每页关键路径。
let _languageFlagsRendered = false;

export function updateLanguageSelectorFlag(ciwiBlock, flagUrl) {
  const selectorFlag = ciwiBlock.querySelector("#language-selector-flag");
  const languageSelect = ciwiBlock.querySelector(".language_selector_header");
  if (!selectorFlag || !languageSelect) return;

  if (selectorFlag.dataset.enabled !== "true") {
    selectorFlag.hidden = true;
    languageSelect.style.paddingLeft = "12px";
    return;
  }

  if (flagUrl) {
    selectorFlag.src = flagUrl;
    selectorFlag.hidden = false;
    languageSelect.style.paddingLeft = "40px";
  } else {
    selectorFlag.hidden = true;
    languageSelect.style.paddingLeft = "12px";
  }
}

export function renderLanguageFlags(data, ciwiBlock) {
  if (_languageFlagsRendered) return;
  if (!data?.includedFlag) return;
  const languageLocaleData = window.languageLocaleData || null;
  if (!languageLocaleData) return; // 数据尚未加载，稍后重试

  const language = ciwiBlock.querySelector('input[name="language_code"]')?.value;
  const countryCode = languageLocaleData?.[language]?.countries?.[0];
  const mainLanguageFlag = ciwiBlock.querySelector("#main-language-flag");
  const translateFloatBtnIcon = ciwiBlock.querySelector(
    "#translate-float-btn-icon",
  );

  updateLanguageSelectorFlag(ciwiBlock, countryCode);

  if (
    data?.includedFlag &&
    mainLanguageFlag &&
    countryCode &&
    (data.languageSelector || data.currencySelector)
  ) {
    mainLanguageFlag.src = countryCode;
    mainLanguageFlag.hidden = false;
  }
  if (
    data?.includedFlag &&
    translateFloatBtnIcon &&
    countryCode &&
    !data.languageSelector &&
    !data.currencySelector
  ) {
    translateFloatBtnIcon.src = countryCode;
    translateFloatBtnIcon.hidden = false;
  }
  const mainBoxText = ciwiBlock.querySelector(".main_box_text");
  if (mainBoxText && countryCode) {
    mainBoxText.style.margin = "0 20px 0px 25px";
  }

  _languageFlagsRendered = true;
}

// 按需注入 language-locale-data.js（单例 Promise）。URL 由 liquid 的 #ciwiLocaleDataUrl 提供。
let _localeDataPromise = null;

export function ensureLanguageLocaleData() {
  if (window.languageLocaleData)
    return Promise.resolve(window.languageLocaleData);
  if (_localeDataPromise) return _localeDataPromise;
  const url = document.querySelector("#ciwiLocaleDataUrl")?.value;
  if (!url) return Promise.resolve(null);
  _localeDataPromise = new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = url;
    s.onload = () => resolve(window.languageLocaleData || null);
    s.onerror = () => resolve(null);
    document.head.appendChild(s);
  });
  return _localeDataPromise;
}

// 保存所有我们替换过的 img 以及“替换后的最终值”
const monitoredImages = new WeakMap();

export function monitorImage(img, finalSrc, finalSrcset, finalAlt) {
  // 如果已经在监控，就先断开之前的观察
  if (monitoredImages.has(img)) {
    const old = monitoredImages.get(img);
    old?.observer.disconnect();
  }

  // 创建新的 MutationObserver
  const observer = new MutationObserver(() => {
    // 只要有人篡改了 src/srcset/alt，则立即恢复
    if (img.src !== finalSrc && finalSrc) img.src = finalSrc;
    if (img.srcset !== finalSrcset && finalSrcset) img.srcset = finalSrcset;
    if (img.alt !== finalAlt && finalAlt) img.alt = finalAlt;
  });

  // 监听属性变化
  observer.observe(img, {
    attributes: true,
    attributeFilter: ["src", "srcset", "alt"],
  });

  // 保存监控信息
  monitoredImages.set(img, {
    finalSrc,
    finalSrcset,
    finalAlt,
    observer,
  });
}

/**
 * 观察 DOM 变化，动态处理新图片
 */
export function initProductImgObserver({
  translateSourceArray = [],
  languageCode,
}) {
  if (!Array.isArray(translateSourceArray) || !languageCode) return;

  // 只监控图片相关节点的变化
  const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.type !== "childList" || mutation.addedNodes.length === 0)
        continue;

      mutation.addedNodes.forEach((node) => {
        // 只处理图片元素
        if (!(node instanceof HTMLImageElement)) return;

        const { src = "", srcset = "" } = node;
        if (!src && !srcset) return;

        // 在翻译数组中查找匹配项
        const matched = translateSourceArray.find((item) => {
          const key = item?.imageBeforeUrl?.split("/files/")[2];
          if (!key || item.languageCode !== languageCode) return false;

          return src.includes(key) || srcset.includes(key);
        });

        if (matched && matched.imageAfterUrl) {
          // 延迟执行替换
          observer.disconnect(); // 暂停观察以防止重复触发
          // 预加载替换图，等加载完成再替换 DOM
          const newImg = new Image();
          newImg.src = matched.imageAfterUrl;
          // 复制原节点的属性
          newImg.className = node.className;
          newImg.alt = node.alt || "";
          newImg.style.cssText = node.style.cssText;
          // 替换节点
          node.replaceWith(newImg);
          // 恢复监听
          observer.observe(document.body, { childList: true, subtree: true });

          newImg.onerror = () => {
            console.warn("❌ 图片加载失败:", matched.imageAfterUrl);
            observer.observe(document.body, { childList: true, subtree: true });
          };
        }
      });
    }
  });

  // 开始监听
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

/**
 * 根据数据库数据替换网页图片
 */
export async function ProductImgTranslate(blockId, shop, ciwiBlock) {
  const productIdInput = ciwiBlock.querySelector('input[name="product_id"]');
  const productId = productIdInput?.value?.trim();
  if (!productId) return;

  const languageInput = ciwiBlock.querySelector('input[name="language_code"]');
  const language = languageInput?.value;
  if (!language) return;

  const cacheKey = buildTranslationCacheKey("product_images", [
    shop.value,
    productId,
    language,
  ]);
  const productImageData = await useCacheThenRefresh(
    cacheKey,
    async () =>
      asCacheableTranslationResponse(
        await GetProductImageData({
          blockId,
          shopName: shop.value,
          productId,
          languageCode: language,
        }),
      ),
    CIWI_TRANSLATION_TTL_MS,
  );

  if (!productImageData?.response?.length) return;

  const imageDomList = document.querySelectorAll("img");
  imageDomList.forEach((img) => {
    const match = productImageData.response.find((item) => {
      const key = item?.imageBeforeUrl?.split("/files/")[2];
      if (!key || item.languageCode !== language) return false;

      return img?.src.includes(key) || img?.srcset.includes(key);
    });

    if (match) {
      if (match?.imageAfterUrl) {
        img.src = match?.imageAfterUrl;
        img.srcset = match?.imageAfterUrl;
      }
      if (match?.altAfterTranslation) {
        img.alt = match?.altAfterTranslation;
      }

      monitorImage(
        img,
        match?.imageAfterUrl,
        match?.imageAfterUrl,
        match?.altAfterTranslation,
      );
    }
  });

  initProductImgObserver({
    translateSourceArray: productImageData.response,
    languageCode: language,
  });
}

/**
 * 根据数据库数据替换网页文本（安全版）
 */
export async function CustomLiquidTextTranslate(blockId, shop, ciwiBlock) {
  const languageInput = ciwiBlock.querySelector('input[name="language_code"]');
  const language = languageInput?.value;
  if (!language) return;

  const cacheKey = buildTranslationCacheKey("liquid_translations", [
    shop.value,
    language,
  ]);
  const parseLiquidDataByShopNameAndLanguage = await useCacheThenRefresh(
    cacheKey,
    async () =>
      asCacheableTranslationResponse(
        await ParseLiquidDataByShopNameAndLanguage({
          blockId,
          shopName: shop.value,
          languageCode: language,
        }),
      ),
    CIWI_TRANSLATION_TTL_MS,
  );

  const translations = parseLiquidDataByShopNameAndLanguage?.response || [];
  if (!translations || Object.keys(translations).length === 0) return;

  // 🧮 辅助函数
  const escapeRegExp = (string) =>
    string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const normalizeText = (text) =>
    text?.trim()?.replace(/^["“”]+|["“”]+$/g, "") || "";

  const hasOuterQuote = (text) => /^["“”]/.test(text) && /["“”]$/.test(text);

  // ❌ 不应替换内容的标签
  const skipTags = new Set([
    "SCRIPT",
    "STYLE",
    "NOSCRIPT",
    "CODE",
    "PRE",
    "TEXTAREA",
    "SVG",
    "META",
    "LINK",
    "TITLE",
  ]);

  // 将 translations 拆分成精准匹配和模糊匹配
  const entries = Object.entries(translations).map(
    ([before, [after, isExact]]) => ({
      before,
      after,
      isExact: Boolean(isExact),
    }),
  );

  const exactEntries = entries.filter((e) => e.isExact);
  const fuzzyEntries = entries.filter((e) => !e.isExact);

  const looksLikeHtml = (text) => /<\/?[a-z][\s\S]*>/i.test(text || "");

  const debugLiquidTranslate = (() => {
    try {
      return (
        localStorage.getItem("ciwi_debug_liquid_translate") === "1" ||
        new URLSearchParams(window.location.search).has("ciwiDebugLiquid")
      );
    } catch {
      return false;
    }
  })();

  const debugLog = (...args) => {
    if (!debugLiquidTranslate) return;
    console.log("[ciwi-liquid-translate]", ...args);
  };

  const summarize = (text, max = 240) => {
    const str = String(text ?? "");
    return str.length > max ? `${str.slice(0, max)}…(${str.length})` : str;
  };

  const normalizeCollapsedText = (text) =>
    normalizeText(text).replace(/\s+/g, " ").trim();

  let debugReplaceTextCount = 0;

  const preserveBoundaryWhitespace = (original, replacement) => {
    const prefix = String(original ?? "").match(/^\s*/)?.[0] || "";
    const suffix = String(original ?? "").match(/\s*$/)?.[0] || "";
    return `${prefix}${String(replacement ?? "")}${suffix}`;
  };

  const shouldFlexibleWhitespaceMatch = (text) =>
    /[\n\r]/.test(text || "") || /\s{2,}/.test(text || "");

  debugLog("init", {
    blockId,
    language,
    total: entries.length,
    exact: exactEntries.length,
    fuzzy: fuzzyEntries.length,
  });

  if (debugLiquidTranslate) {
    const htmlCount = entries.filter(({ before, after }) => {
      try {
        return looksLikeHtml(before) || looksLikeHtml(after);
      } catch {
        return false;
      }
    }).length;
    const maxBeforeLen = entries.reduce((max, e) => {
      const len = String(e?.before ?? "").length;
      return len > max ? len : max;
    }, 0);
    debugLog("entriesSample", {
      htmlCount,
      maxBeforeLen,
      sample: entries.slice(0, 20).map((e) => ({
        isExact: e.isExact,
        beforeLen: String(e.before ?? "").length,
        afterLen: String(e.after ?? "").length,
        before: summarize(e.before, 320),
        after: summarize(e.after, 160),
      })),
    });
  }

  const decodeHtmlEntities = (html) => {
    if (!html) return "";
    const textarea = document.createElement("textarea");
    textarea.innerHTML = html;
    return textarea.value;
  };

  const normalizeHtml = (html) => {
    const raw = normalizeText(decodeHtmlEntities(html));
    if (!raw) return "";
    const template = document.createElement("template");
    template.innerHTML = raw;
    const serialized =
      template.content.childElementCount === 1
        ? template.content.firstElementChild.outerHTML
        : template.innerHTML;
    return serialized.replace(/\s+/g, " ").replace(/>\s+</g, "><").trim();
  };

  const parseSingleRootElement = (html) => {
    const raw = normalizeText(decodeHtmlEntities(html));
    if (!raw) return null;
    const template = document.createElement("template");
    template.innerHTML = raw;
    if (template.content.childElementCount !== 1) return null;
    return template.content.firstElementChild;
  };

  const replaceHtmlExactEntries = (entryList, root = document.body) => {
    if (!root?.isConnected) return;
    const htmlEntries = entryList
      .filter(({ before, after }) => looksLikeHtml(before) || looksLikeHtml(after))
      .map(({ before, after }) => {
        const beforeEl = parseSingleRootElement(before);
        const afterEl = parseSingleRootElement(after);
        return {
          normalizedBefore: normalizeHtml(before),
          normalizedAfter: normalizeText(decodeHtmlEntities(after)).trim(),
          normalizedBeforeInner: beforeEl ? normalizeHtml(beforeEl.innerHTML) : "",
          beforeEl,
          afterEl,
          rawBefore: before,
          rawAfter: after,
          beforeTag: beforeEl?.nodeName || null,
          afterTag: afterEl?.nodeName || null,
          beforeText: beforeEl ? normalizeCollapsedText(beforeEl.textContent) : "",
          afterInner: afterEl ? normalizeText(afterEl.innerHTML) : "",
          beforeClasses: beforeEl
            ? Array.from(beforeEl.classList || []).filter(Boolean)
            : [],
        };
      })
      .filter((e) => e.normalizedBefore && e.normalizedAfter);

    if (htmlEntries.length === 0) return;

    const htmlMap = new Map();
    const innerMap = new Map();
    const textCandidatesByKey = new Map();
    // 廉价预筛用的候选集合：任意 outer/inner/text 命中都要求
    //   node.nodeName === 某条 before 元素的标签名，且节点折叠文本 === 某条源文本。
    // hasEmptyBeforeTextCandidate 覆盖“含元素但无文本”(如仅图片)的内联条目这一例外。
    const candidateTags = new Set();
    const candidateTexts = new Set();
    let hasEmptyBeforeTextCandidate = false;
    htmlEntries.forEach((e) => {
      htmlMap.set(e.normalizedBefore, e);
      if (e.beforeTag) candidateTags.add(e.beforeTag);
      if (e.beforeText) candidateTexts.add(e.beforeText);
      else if (e.beforeEl) hasEmptyBeforeTextCandidate = true;
      if (e.beforeEl && e.afterEl && e.normalizedBeforeInner) {
        const innerKey = `${e.beforeEl.nodeName}\0${e.normalizedBeforeInner}`;
        if (!innerMap.has(innerKey)) innerMap.set(innerKey, e);
      }
      if (e.beforeEl && e.afterEl && e.beforeText) {
        const textKey = `${e.beforeEl.nodeName}\0${e.beforeText}`;
        const bucket = textCandidatesByKey.get(textKey);
        if (bucket) bucket.push(e);
        else textCandidatesByKey.set(textKey, [e]);
      }
    });

    const hitStats = new Map();
    htmlEntries.forEach((e) => {
      hitStats.set(e.normalizedBefore, { outer: 0, inner: 0, text: 0 });
    });

    debugLog("htmlEntries", {
      count: htmlEntries.length,
      sample: htmlEntries.slice(0, 5).map((e) => ({
        before: summarize(e.rawBefore),
        normalizedBefore: summarize(e.normalizedBefore),
        beforeTag: e.beforeEl?.nodeName || null,
        afterTag: e.afterEl?.nodeName || null,
      })),
    });

    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode(node) {
          const tag = node?.nodeName;
          if (skipTags.has(tag)) return NodeFilter.FILTER_REJECT;
          if (ciwiBlock && ciwiBlock.contains(node)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      },
    );

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    const replacements = [];
    nodes.forEach((node) => {
      if (isElementHiddenForTranslation(node)) return;

      // 预筛 1：标签名。任意命中都要求 node.nodeName 等于某条 before 元素标签名。
      if (candidateTags.size > 0 && !candidateTags.has(node.nodeName)) return;

      // 预筛 2：折叠文本。有文本时必须命中某条源文本；无文本时仅放行“仅含元素”的条目。
      // 通过后才做昂贵的 normalizeHtml，避免对全页每个元素都重解析 HTML。
      const nodeText = normalizeCollapsedText(node.textContent);
      if (nodeText) {
        if (!candidateTexts.has(nodeText)) return;
      } else if (!hasEmptyBeforeTextCandidate) {
        return;
      }

      const normalizedOuter = normalizeHtml(node.outerHTML);
      if (!normalizedOuter) return;
      const entry = htmlMap.get(normalizedOuter);
      if (entry) {
        replacements.push({ type: "outer", node, html: entry.normalizedAfter });
        const stats = hitStats.get(entry.normalizedBefore);
        if (stats) stats.outer += 1;
        debugLog("match:outer", {
          tag: node.nodeName,
          before: summarize(entry.rawBefore),
          nodeOuter: summarize(node.outerHTML),
        });
        return;
      }

      const normalizedInner = normalizeHtml(node.innerHTML);
      if (normalizedInner) {
        const innerCandidate = innerMap.get(`${node.nodeName}\0${normalizedInner}`);
        if (innerCandidate) {
          replacements.push({
            type: "inner",
            node,
            html: innerCandidate.afterInner,
          });
          const stats = hitStats.get(innerCandidate.normalizedBefore);
          if (stats) stats.inner += 1;
          debugLog("match:inner", {
            tag: node.nodeName,
            before: summarize(innerCandidate.rawBefore),
            nodeInner: summarize(node.innerHTML),
          });
          return;
        }
      }

      // nodeText 已在循环开头算好（且必为非空才能走到这里时命中文本路径）
      if (!nodeText) return;

      const textCandidates = textCandidatesByKey.get(`${node.nodeName}\0${nodeText}`);
      if (!textCandidates) return;

      for (const candidate of textCandidates) {
        if (candidate.beforeClasses.length > 0) {
          const ok = candidate.beforeClasses.every((c) => node.classList?.contains(c));
          if (!ok) continue;
        }

        replacements.push({
          type: "inner",
          node,
          html: candidate.afterInner,
        });
        const stats = hitStats.get(candidate.normalizedBefore);
        if (stats) stats.text += 1;
        debugLog("match:text", {
          tag: node.nodeName,
          before: summarize(candidate.rawBefore),
          nodeOuter: summarize(node.outerHTML),
        });
        return;
      }
    });

    replacements.forEach(({ type, node, html }) => {
      if (type === "outer") node.outerHTML = html;
      else node.innerHTML = html;
    });

    if (debugLiquidTranslate) {
      const missed = [];
      hitStats.forEach((stats, key) => {
        if (stats.outer === 0 && stats.inner === 0) missed.push(key);
      });
      debugLog("htmlSummary", {
        replaced: replacements.length,
        missed: missed.length,
        missedSample: missed.slice(0, 5).map((k) => summarize(k)),
      });
    }
  };

  const replaceFuzzyEntriesFast = (entryList, root = document.body) => {
    if (!root?.isConnected) return;
    const preparedEntries = [];
    entryList.forEach(({ before, after }) => {
      const trimmedBefore = before?.trim();
      const afterRaw = String(after ?? "");
      if (!trimmedBefore || afterRaw.trim() === "") return;
      const flexibleWhitespace = shouldFlexibleWhitespaceMatch(trimmedBefore);
      preparedEntries.push({
        trimmedBefore,
        afterRaw,
        flexibleWhitespace,
        collapsedBefore: flexibleWhitespace
          ? normalizeCollapsedText(trimmedBefore)
          : null,
        re: new RegExp(
          flexibleWhitespace
            ? escapeRegExp(trimmedBefore).replace(/\s+/g, "\\s+")
            : escapeRegExp(trimmedBefore),
          "g",
        ),
      });
    });

    if (preparedEntries.length === 0) return;

    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const parentTag = node.parentNode?.nodeName;
          if (skipTags.has(parentTag)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      },
    );

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    if (debugLiquidTranslate && entryList.length <= 50) {
      debugLog("textFuzzyFast", {
        entries: preparedEntries.length,
        nodes: nodes.length,
        root: root === document.body ? "body" : root.nodeName,
      });
    }

    nodes.forEach((node) => {
      if (isElementHiddenForTranslation(node.parentElement)) return;

      // 这些派生值只跟当前节点内容有关、与 entry 无关，因此每个节点只算一次；
      // collapsed 仅在遇到 flexibleWhitespace 的 entry 时按需计算。
      // 仅当本节点真正被替换后，才刷新缓存，保证多条 entry 命中同一节点时的级联替换行为不变。
      let original = node.nodeValue;
      let normalized = normalizeText(original);
      let collapsed = null;

      for (const entry of preparedEntries) {
        if (entry.flexibleWhitespace && collapsed === null) {
          collapsed = normalizeCollapsedText(normalized);
        }
        const matches = entry.flexibleWhitespace
          ? collapsed.includes(entry.collapsedBefore)
          : normalized.includes(entry.trimmedBefore);
        if (!matches) continue;

        const newValue = original.replace(entry.re, () => entry.afterRaw);
        const newValueWithWhitespace = preserveBoundaryWhitespace(original, newValue);
        const keepQuote = hasOuterQuote(original);
        if (debugLiquidTranslate && debugReplaceTextCount < 20) {
          debugReplaceTextCount += 1;
          debugLog("replace:text", {
            before: summarize(original, 200),
            after: summarize(newValueWithWhitespace, 200),
          });
        }
        node.nodeValue = keepQuote ? `"${newValueWithWhitespace}"` : newValueWithWhitespace;

        // 节点内容已变，刷新派生值供后续 entry 使用
        original = node.nodeValue;
        normalized = normalizeText(original);
        collapsed = null;
      }
    });
  };

  const replaceExactEntriesFast = (entryList, root = document.body) => {
    if (!root?.isConnected) return;
    const exactMap = new Map();
    entryList.forEach(({ before, after }) => {
      const trimmedBefore = before?.trim();
      const afterRaw = String(after ?? "");
      if (!trimmedBefore || afterRaw.trim() === "") return;
      const key = shouldFlexibleWhitespaceMatch(trimmedBefore)
        ? normalizeCollapsedText(trimmedBefore)
        : normalizeText(trimmedBefore);
      exactMap.set(key, {
        replacement: afterRaw,
        flexibleWhitespace: shouldFlexibleWhitespaceMatch(trimmedBefore),
      });
    });

    if (exactMap.size === 0) return;

    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const parentTag = node.parentNode?.nodeName;
          if (skipTags.has(parentTag)) return NodeFilter.FILTER_REJECT;
          if (ciwiBlock && node.parentElement && ciwiBlock.contains(node.parentElement))
            return NodeFilter.FILTER_REJECT;
          const strictKey = normalizeText(node.nodeValue);
          const collapsedKey = normalizeCollapsedText(node.nodeValue);
          if (exactMap.has(strictKey)) return NodeFilter.FILTER_ACCEPT;
          return exactMap.has(collapsedKey)
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT;
        },
      },
    );

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    if (debugLiquidTranslate && entryList.length <= 50) {
      debugLog("textExactFast", {
        keys: exactMap.size,
        nodes: nodes.length,
        root: root === document.body ? "body" : root.nodeName,
      });
    }

    nodes.forEach((node) => {
      if (isElementHiddenForTranslation(node.parentElement)) return;
      const original = node.nodeValue;
      const strictKey = normalizeText(original);
      const collapsedKey = normalizeCollapsedText(original);
      const entry = exactMap.get(strictKey) || exactMap.get(collapsedKey);
      if (!entry) return;
      const keepQuote = hasOuterQuote(original);
      const replacement = preserveBoundaryWhitespace(original, entry.replacement);
      if (debugLiquidTranslate && debugReplaceTextCount < 20) {
        debugReplaceTextCount += 1;
        debugLog("replace:text", {
          before: summarize(original, 200),
          after: summarize(replacement, 200),
        });
      }
      node.nodeValue = keepQuote ? `"${replacement}"` : replacement;
    });
  };

  const hasHtmlEntries = (entryList) =>
    entryList.some(
      ({ before, after }) => looksLikeHtml(before) || looksLikeHtml(after),
    );

  const shouldSkipTranslationRoot = (node) => {
    if (!node?.isConnected) return true;
    if (node.nodeType === Node.ELEMENT_NODE && skipTags.has(node.nodeName)) return true;
    if (ciwiBlock && node instanceof Element && ciwiBlock.contains(node)) return true;
    return false;
  };

  const collectMutationRoots = (mutations) => {
    const roots = [];
    for (const mutation of mutations) {
      if (mutation.type !== "childList") continue;
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (!shouldSkipTranslationRoot(node)) roots.push(node);
        } else if (node.nodeType === Node.TEXT_NODE) {
          const parent = node.parentElement;
          if (parent && !shouldSkipTranslationRoot(parent)) roots.push(parent);
        }
      }
    }
    return roots;
  };

  const pruneNestedRoots = (roots) => {
    return roots.filter(
      (root, index) =>
        !roots.some(
          (other, otherIndex) =>
            otherIndex !== index && other !== root && other.contains(root),
        ),
    );
  };

  const applyReplacementsToRoots = (roots = [document.body]) => {
    const targets = pruneNestedRoots(
      roots.filter((root) => root?.isConnected && !shouldSkipTranslationRoot(root)),
    );
    if (targets.length === 0) return;

    for (const root of targets) {
      if (hasHtmlEntries(exactEntries) || hasHtmlEntries(fuzzyEntries)) {
        replaceHtmlExactEntries(exactEntries, root);
        replaceHtmlExactEntries(fuzzyEntries, root);
      }
      replaceExactEntriesFast(exactEntries, root);
      replaceFuzzyEntriesFast(fuzzyEntries, root);
    }
  };

  applyReplacementsToRoots();

  if (typeof window !== "undefined") {
    const observerKey = "__ciwi_liquid_translate_observer__";
    if (!window[observerKey]) {
      const pendingRoots = new Set();
      let scheduled = false;
      let lastRunAt = 0;

      const scheduleIncrementalRun = () => {
        if (scheduled) return;
        scheduled = true;

        const now = Date.now();
        const delay = now - lastRunAt < 200 ? 200 : 0;

        setTimeout(() => {
          requestAnimationFrame(() => {
            try {
              const roots = pruneNestedRoots([...pendingRoots]);
              pendingRoots.clear();
              if (roots.length > 0) {
                applyReplacementsToRoots(roots);
              }
            } finally {
              lastRunAt = Date.now();
              scheduled = false;
              if (pendingRoots.size > 0) scheduleIncrementalRun();
            }
          });
        }, delay);
      };

      const observer = new MutationObserver((mutations) => {
        for (const root of collectMutationRoots(mutations)) {
          pendingRoots.add(root);
        }
        if (pendingRoots.size === 0) return;
        scheduleIncrementalRun();
      });

      observer.observe(document.body, { childList: true, subtree: true });
      window[observerKey] = observer;

      setTimeout(() => {
        try {
          observer.disconnect();
        } catch {}
        try {
          delete window[observerKey];
        } catch {
          window[observerKey] = null;
        }
      }, 15000);
    }
  }
}

/**
 * 根据数据库数据替换 PageFly 页面文本（精准替换）
 */
export async function PageFlyTextTranslate(blockId, shop, ciwiBlock) {
  const languageInput = ciwiBlock.querySelector('input[name="language_code"]');
  const language = languageInput?.value;
  if (!language) return;

  const cacheKey = buildTranslationCacheKey("pagefly_translations", [
    shop.value,
    language,
  ]);
  const readTranslatedText = await useCacheThenRefresh(
    cacheKey,
    async () =>
      asCacheableTranslationResponse(
        await ReadTranslatedText({
          blockId,
          shopName: shop.value,
          languageCode: language,
        }),
      ),
    CIWI_TRANSLATION_TTL_MS,
  );

  const translations = readTranslatedText?.response || [];
  if (!Array.isArray(translations) || translations.length === 0) return;

  const normalizeText = (text) =>
    text?.trim()?.replace(/^["“”]+|["“”]+$/g, "") || "";

  const hasOuterQuote = (text) => /^["“”]/.test(text) && /["“”]$/.test(text);

  // ❌ 不应替换内容的标签
  const skipTags = new Set([
    "SCRIPT",
    "STYLE",
    "NOSCRIPT",
    "CODE",
    "PRE",
    "TEXTAREA",
    "SVG",
    "META",
    "LINK",
    "TITLE",
  ]);

  // 🔄 遍历所有翻译项
  translations.forEach((item) => {
    const trimmedBefore = normalizeText(item?.sourceText);
    const trimmedAfter = normalizeText(item?.targetText);
    if (!trimmedBefore || !trimmedAfter) return;

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const parentTag = node.parentNode?.nodeName;

          // ⛔ 跳过不应替换的标签
          if (skipTags.has(parentTag)) return NodeFilter.FILTER_REJECT;

          const normalized = normalizeText(node.nodeValue);

          // ❗ 未包含待替换内容 → 跳过
          if (!normalized.includes(trimmedBefore)) {
            return NodeFilter.FILTER_REJECT;
          }

          // ✅ 可以替换
          return NodeFilter.FILTER_ACCEPT;
        },
      },
    );

    const nodesToReplace = [];
    while (walker.nextNode()) nodesToReplace.push(walker.currentNode);

    // ✏精准替换
    nodesToReplace.forEach((node) => {
      if (isElementHiddenForTranslation(node.parentElement)) return;
      const original = node.nodeValue;
      const normalized = normalizeText(original);

      if (normalized === trimmedBefore) {
        const keepQuote = hasOuterQuote(original);
        node.nodeValue = keepQuote ? `"${trimmedAfter}"` : trimmedAfter;
      }
    });
  });
}

/**
 * 批量替换主页图片
 */
export async function HomeImageTranslate(blockId) {
  const shop = document.querySelector("#queryCiwiId")?.value;
  const language = document.querySelector('input[name="language_code"]')?.value;
  if (!shop || !language) {
    console.warn("⚠️ [HomeImageTranslate] missing shop or language", {
      shop,
      language,
    });
    return;
  }

  const cacheKey = buildTranslationCacheKey("shop_images", [shop, language]);
  const translatedImages = await useCacheThenRefresh(
    cacheKey,
    async () =>
      asCacheableTranslationResponse(
        await GetShopImageData({
          shopName: shop,
          blockId,
          languageCode: language,
        }),
      ),
    CIWI_TRANSLATION_TTL_MS,
  );
  if (!translatedImages?.response?.length) {
    return;
  }
  // Step 3: 替换
  translatedImages.response.forEach((item) => {
    const key = item.imageBeforeUrl.split("/files/")[2];
    document.querySelectorAll(`img[src*="${key}"]`).forEach((img) => {
      if (item.imageAfterUrl) {
        img.src = item.imageAfterUrl;
        img.srcset = item.imageAfterUrl;
      }
      if (item.altAfterTranslation) {
        img.alt = item.altAfterTranslation;
      }
    });
  });
}

/**
 * Web Component：ciwiswitcher-form
 */
export class CiwiswitcherForm extends HTMLElement {
  constructor() {
    super();
    this.elements = {}; // 空对象，等 connectedCallback 再赋值
  }
  connectedCallback() {
    this.elements = {
      ciwiBlock: document.querySelector(
        `#shopify-block-${this.querySelector('input[name="block_id"]')?.value}`,
      ),
      ciwiContainer: this.querySelector("#ciwi-container"),
      selectorBox: this.querySelector("#selector-box"),
      selectorBackdrop: this.querySelector("#selector-backdrop"),
      languageInput: this.querySelector('input[name="language_code"]'),
      currencyInput: this.querySelector('input[name="currency_code"]'),
      countryInput: this.querySelector('input[name="country_code"]'),
      mainBox: this.querySelector("#main-box"),
      translateFloatBtn: this.querySelector("#translate-float-btn"),
      translateFloatBtnText: this.querySelector("#translate-float-btn-text"),
      languageSelect: this.querySelector(".language_selector_header"),
      currencySelect: this.querySelector(".currency_selector_header"),
      closeButton: this.querySelector(".selector_box_close_button"),
    };
    // 初始化所有事件监听
    this.initializeEventListeners();
  }
  initializeEventListeners() {
    // 阻止选择器框的点击事件冒泡
    this.elements.selectorBox?.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    this.elements.mainBox?.addEventListener(
      "click",
      this.toggleSelector.bind(this),
    );

    this.elements.translateFloatBtnText?.addEventListener(
      "click",
      this.toggleSelector.bind(this),
    );

    this.elements.languageSelect?.addEventListener(
      "change",
      this.handleSelectChange.bind(this),
    );

    this.elements.currencySelect?.addEventListener(
      "change",
      this.handleSelectChange.bind(this),
    );

    this.elements.closeButton?.addEventListener(
      "click",
      this.handleCancelClick.bind(this),
    );

    this.elements.selectorBackdrop?.addEventListener(
      "click",
      this.handleCancelClick.bind(this),
    );

    // 点击外部关闭
    document.addEventListener("click", this.handleOutsideClick.bind(this));
  }

  isDirectSelectorMode() {
    return this.elements.selectorBox?.dataset.mode === "direct";
  }

  isSidebarWidgetMode() {
    return this.elements.selectorBox?.dataset.layout === "sidebar-widget";
  }

  openSelectorPanel() {
    this.elements.selectorBox.style.display = "flex";
    if (this.isSidebarWidgetMode()) {
      this.elements.ciwiContainer?.classList.add("expanded");
    } else {
      this.updateSelectorPlacement();
    }
    this.rotateArrow("#mainbox-arrow-icon", 180);
  }

  closeSelectorPanel() {
    if (this.isSidebarWidgetMode()) {
      this.elements.ciwiContainer?.classList.remove("expanded");
    }
    this.elements.selectorBox.style.display = this.isDirectSelectorMode()
      ? "flex"
      : "none";
    if (this.elements.selectorBackdrop) {
      this.elements.selectorBackdrop.style.display = "none";
    }
    this.rotateArrow("#mainbox-arrow-icon", 0);
  }

  updateSelectorPlacement() {
    if (this.isDirectSelectorMode() || this.isSidebarWidgetMode()) return;

    const selectorBox = this.elements.selectorBox;
    const anchor =
      this.elements.mainBox?.style.display !== "none"
        ? this.elements.mainBox
        : this.elements.translateFloatBtn;

    if (!selectorBox || !anchor) return;

    const anchorRect = anchor.getBoundingClientRect();
    const selectorRect = selectorBox.getBoundingClientRect();
    const selectorHeight = selectorRect.height || selectorBox.scrollHeight || 0;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const spaceAbove = anchorRect.top;
    const spaceBelow = viewportHeight - anchorRect.bottom;
    const preferredPlacement = selectorBox.dataset.preferredPlacement || "down";

    let placement = preferredPlacement;
    if (spaceBelow < selectorHeight && spaceAbove > spaceBelow) {
      placement = "up";
    } else if (spaceAbove < selectorHeight && spaceBelow >= spaceAbove) {
      placement = "down";
    }

    selectorBox.dataset.placement = placement;
    selectorBox.style.top = placement === "down" ? "100%" : "auto";
    selectorBox.style.bottom = placement === "up" ? "100%" : "auto";
  }

  handleSelectChange(event) {
    const select = event.currentTarget;
    const value = select?.value;
    const selectorType = select?.dataset.type;
    const languageLocaleData = window.languageLocaleData || null;

    if (selectorType === "language") {
      if (!value || this.elements.languageInput.value == value) return;
      this.elements.languageInput.value = value;
      localStorage.setItem("ciwi_selected_language", value);
      const flag = languageLocaleData?.[value]?.countries?.[0];
      updateLanguageSelectorFlag(this.elements.ciwiBlock, flag);
      const mainBoxFlag = this.querySelector("#main-language-flag");
      const translateFloatBtnIcon = this.querySelector("#translate-float-btn-icon");
      if (mainBoxFlag && flag) {
        mainBoxFlag.src = flag;
        mainBoxFlag.hidden = false;
      }
      if (translateFloatBtnIcon && flag) {
        translateFloatBtnIcon.src = flag;
        translateFloatBtnIcon.hidden = false;
      }
    } else if (selectorType === "currency") {
      if (!value || this.elements.currencyInput.value == value) return;
      this.elements.currencyInput.value = value;
      localStorage.setItem("ciwi_selected_currency", value);
    }

    if (!this.isDirectSelectorMode()) {
      this.closeSelectorPanel();
    }
    event.preventDefault();

    const languageSelectorContainer = this.elements.ciwiBlock.querySelector(
      "#language-switcher-container",
    );
    const currencySelectorContainer = this.elements.ciwiBlock.querySelector(
      "#currency-switcher-container",
    );
    updateDisplayText(
      languageSelectorContainer?.style.display === "block",
      currencySelectorContainer?.style.display === "block",
      this.elements.ciwiBlock,
    );
    const form = this.querySelector("form");

    if (form) {
      form.submit();
    }
  }

  handleCancelClick(event) {
    event.preventDefault();
    if (this.isDirectSelectorMode()) return;
    this.closeSelectorPanel();
  }

  handleOutsideClick(event) {
    if (this.isDirectSelectorMode()) return;
    if (
      this.elements.ciwiContainer &&
      !this.elements.ciwiContainer.contains(event.target)
    ) {
      if (this.elements.selectorBox) this.closeSelectorPanel();
    }
  }

  toggleSelector(event) {
    event.preventDefault();
    if (this.isDirectSelectorMode()) return;
    const ciwiBlock = this.elements.ciwiBlock;
    if (!ciwiBlock) {
      console.error("ciwiBlock not found");
      return;
    }

    const isVisible = this.elements.selectorBox.style.display !== "none";
    if (isVisible) {
      this.closeSelectorPanel();
    } else {
      this.openSelectorPanel();
    }
  }

  rotateArrow(elementId, degrees) {
    const arrow = this.elements.ciwiBlock.querySelector(elementId);
    if (arrow) {
      arrow.style.transform = `rotate(${degrees}deg)`;
      arrow.style.transformOrigin = "center center"; // 确保旋转中心点在图标中心
    }
  }

  closeAllSelectors() {
    return;
  }
}
