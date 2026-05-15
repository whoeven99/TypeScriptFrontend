// ui.js
import {
  fetchCurrencies,
  GetProductImageData,
  fetchAutoRate,
  GetShopImageData,
  ParseLiquidDataByShopNameAndLanguage,
  ReadTranslatedText,
} from "./ciwi-api.js";
import { transformPrices } from "./ciwi-utils.js";

/**
 * 渲染货币选项
 */
export function renderCurrencyOptions({
  optionsList,
  selectedOption,
  currencyData,
  selectedCurrencyCode,
}) {
  optionsList.innerHTML = "";
  currencyData.forEach((currency) => {
    const optionItem = document.createElement("div");
    optionItem.className = `option-item ${currency?.currencyCode == selectedCurrencyCode ? "selected" : ""}`;
    optionItem.dataset.value = currency?.currencyCode;
    optionItem.dataset.type = "currency";
    optionItem.innerHTML = `
          <span class="option-text">${currency?.currencyCode}</span> 
          <span class="currency-symbol">(${currency?.symbol})</span>
        `;

    // 为新创建的选项添加点击事件监听器
    optionItem.addEventListener("click", function (e) {
      // 获取 CiwiswitcherForm 实例
      const form = document.querySelector("ciwiswitcher-form");
      if (form) {
        form.handleOptionClick(e);
      }
    });

    optionsList.appendChild(optionItem);

    if (currency?.currencyCode === selectedCurrencyCode && selectedOption) {
      selectedOption.innerHTML = `
        <span class="selected-text" data-type="currency">${currency?.currencyCode}</span>
        <span class="currency-symbol">(${currency?.symbol})</span>
      `;
    }

    // 如果是选中项，更新选择器头部显示
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
  const selectedOption = customSelector?.querySelector(".selected-option");
  const optionsList = customSelector?.querySelector(".options-list");
  const pageCurrencyCode = ciwiBlock.querySelector(
    'input[name="currency_code"]',
  )?.value;

  renderCurrencyOptions({
    optionsList,
    selectedOption,
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
    console.log("selectedCurrency: ", selectedCurrency);

    // 初始执行一次
    transformPrices({ rate, moneyFormat, selectedCurrency });

    // 开始观察整个文档 body
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
  // 获取货币选择器中当前选中的值
  if (lang) {
    // 获取语言选择器中当前选中的值
    const languageSelector = ciwiBlock.querySelector(
      '.custom-selector[data-type="language"]',
    );
    selectedLanguageText =
      languageSelector?.querySelector(".selected-text")?.textContent || "";
  }

  if (cur) {
    const currencyCode = ciwiBlock.querySelector('input[name="currency_code"]');
    const storedCurrency = localStorage.getItem("ciwi_selected_currency");
    selectedCurrencyText =
      storedCurrency && typeof storedCurrency == "string"
        ? storedCurrency
        : currencyCode?.value;
  }
  // 更新显示文本
  const displayTextElement = ciwiBlock.querySelector("#display-text");
  console.log("selectedLanguageText: ", selectedLanguageText);
  console.log("ciwiBlock: ", ciwiBlock);

  if (displayTextElement) {
    // 如果已经有语言文本，添加货币文本
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

  currencySelectorHeader.style.backgroundColor = data.backgroundColor;
  currencySelectorHeader.style.border = `1px solid ${data.optionBorderColor}`;
  const currencySelectorSelectedOption = ciwiBlock.querySelector(
    ".options-container[data-type='currency']",
  );
  currencySelectorSelectedOption.style.backgroundColor = data.backgroundColor;
  currencySelectorSelectedOption.style.border = `1px solid ${data.optionBorderColor}`;
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
    console.log("languageSelector function false");
    return;
  }
  const languageInput = ciwiBlock.querySelector('input[name="language_code"]');
  const language = languageInput.value;
  const languageSelector = ciwiBlock.querySelector(
    "#language-switcher-container",
  );
  languageSelector.style.display = "block";
  const languageSelectorHeader = ciwiBlock.querySelector(
    ".language_selector_header",
  );
  languageSelectorHeader.style.backgroundColor = data.backgroundColor;
  languageSelectorHeader.style.border = `1px solid ${data.optionBorderColor}`;
  const languageSelectorSelectedOption = ciwiBlock.querySelector(
    ".options-container[data-type='language']",
  );
  languageSelectorSelectedOption.style.backgroundColor = data.backgroundColor;
  languageSelectorSelectedOption.style.border = `1px solid ${data.optionBorderColor}`;

  const mainLanguageFlag = ciwiBlock.querySelector("#main-language-flag");
  const translateFloatBtnIcon = ciwiBlock.querySelector(
    "#translate-float-btn-icon",
  );
  if (data?.includedFlag) {
    //获取所有语言代码
    const languageLocaleData = window.languageLocaleData
      ? window.languageLocaleData
      : null;
    const languageOptions = ciwiBlock.querySelectorAll(
      ".option-item[data-type='language']",
    );
    languageOptions.forEach((option) => {
      const langCode = option.dataset.value;
      const countryCode = languageLocaleData[langCode]?.countries[0];
      if (countryCode) {
        // 创建并插入国旗图片
        const flagImg = document.createElement("img");
        flagImg.className = "option-country-flag";
        flagImg.src = countryCode;
        flagImg.alt = "";
        // 将图片插入到选项的最前面
        option.insertBefore(flagImg, option.firstChild);
      }
    });
    // 为当前选中的语言添加国旗
    const selectedOption = ciwiBlock.querySelector(
      ".language_selector_header[data-type='language'] .selected-option",
    );
    if (selectedOption) {
      const countryCode = languageLocaleData[language]?.countries[0];
      const optionFlagImg = document.createElement("img");
      optionFlagImg.className = "option-country-flag";
      optionFlagImg.src = countryCode;
      optionFlagImg.alt = "";
      if (countryCode) {
        selectedOption.insertBefore(optionFlagImg, selectedOption.firstChild);
      }
      if (
        mainLanguageFlag &&
        (data.languageSelector || data.currencySelector)
      ) {
        mainLanguageFlag.src = countryCode;
        mainLanguageFlag.hidden = false;
      }
      if (
        translateFloatBtnIcon &&
        !data.languageSelector &&
        !data.currencySelector
      ) {
        translateFloatBtnIcon.src = countryCode;
        translateFloatBtnIcon.hidden = false;
      }
    }
    const mainBoxText = ciwiBlock.querySelector(".main_box_text");
    if (mainBoxText) {
      mainBoxText.style.margin = "0 20px 0px 25px";
    }
  }
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
          console.log("🕓 延迟替换图片:", matched.imageAfterUrl);
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
  const productId = productIdInput.value;
  if (productId) {
    const languageInput = ciwiBlock.querySelector(
      'input[name="language_code"]',
    );
    const language = languageInput.value;
    const productImageData = await GetProductImageData({
      blockId,
      shopName: shop.value,
      productId: productId,
      languageCode: language,
    });

    if (productImageData.response.length > 0) {
      const imageDomList = document.querySelectorAll("img");
      // 遍历所有img
      imageDomList.forEach((img) => {
        // 在response数组中查找匹配项
        const match = productImageData.response.find((item) => {
          const key = item?.imageBeforeUrl?.split("/files/")[2];
          if (!key || item.languageCode !== language) return false;

          return img?.src.includes(key) || img?.srcset.includes(key);
        });

        if (match) {
          // 如果imageAfterUrl或altBeforeTranslation存在，则替换
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
  }
}

/**
 * 根据数据库数据替换网页文本（安全版）
 */
export async function CustomLiquidTextTranslate(blockId, shop, ciwiBlock) {
  const languageInput = ciwiBlock.querySelector('input[name="language_code"]');
  const language = languageInput?.value;

  // 🧩 获取数据库翻译数据
  const parseLiquidDataByShopNameAndLanguage =
    await ParseLiquidDataByShopNameAndLanguage({
      blockId,
      shopName: shop.value,
      languageCode: language,
    });

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

  const replaceHtmlExactEntries = (entryList) => {
    const htmlEntries = entryList
      .filter(({ before, after }) => looksLikeHtml(before) || looksLikeHtml(after))
      .map(({ before, after }) => ({
        normalizedBefore: normalizeHtml(before),
        normalizedAfter: normalizeText(decodeHtmlEntities(after)).trim(),
        beforeEl: parseSingleRootElement(before),
        afterEl: parseSingleRootElement(after),
        rawBefore: before,
        rawAfter: after,
        beforeTag: parseSingleRootElement(before)?.nodeName || null,
        afterTag: parseSingleRootElement(after)?.nodeName || null,
        beforeText: (() => {
          const el = parseSingleRootElement(before);
          return el ? normalizeCollapsedText(el.textContent) : "";
        })(),
        afterInner: (() => {
          const el = parseSingleRootElement(after);
          return el ? normalizeText(el.innerHTML) : "";
        })(),
        beforeClasses: (() => {
          const el = parseSingleRootElement(before);
          if (!el) return [];
          return Array.from(el.classList || []).filter(Boolean);
        })(),
      }))
      .filter((e) => e.normalizedBefore && e.normalizedAfter);

    if (htmlEntries.length === 0) return;

    const htmlMap = new Map();
    htmlEntries.forEach((e) => {
      htmlMap.set(e.normalizedBefore, e);
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
      document.body,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode(node) {
          const tag = node?.nodeName;
          if (skipTags.has(tag)) return NodeFilter.FILTER_REJECT;
          if (ciwiBlock && ciwiBlock.contains(node)) return NodeFilter.FILTER_REJECT;
          if (window.getComputedStyle(node).display === "none")
            return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      },
    );

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    const replacements = [];
    nodes.forEach((node) => {
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
      if (!normalizedInner) return;

      for (const candidate of htmlEntries) {
        if (
          candidate.beforeEl &&
          candidate.afterEl &&
          node.nodeName === candidate.beforeEl.nodeName &&
          node.nodeName === candidate.afterEl.nodeName &&
          normalizedInner === normalizeHtml(candidate.beforeEl.innerHTML)
        ) {
          replacements.push({
            type: "inner",
            node,
            html: normalizeText(candidate.afterEl.innerHTML),
          });
          const stats = hitStats.get(candidate.normalizedBefore);
          if (stats) stats.inner += 1;
          debugLog("match:inner", {
            tag: node.nodeName,
            before: summarize(candidate.rawBefore),
            nodeInner: summarize(node.innerHTML),
          });
          return;
        }
      }

      const nodeText = normalizeCollapsedText(node.textContent);
      if (!nodeText) return;

      for (const candidate of htmlEntries) {
        if (!candidate.beforeEl || !candidate.afterEl) continue;
        if (node.nodeName !== candidate.beforeEl.nodeName) continue;
        if (candidate.beforeClasses.length > 0) {
          const ok = candidate.beforeClasses.every((c) => node.classList?.contains(c));
          if (!ok) continue;
        }
        if (!candidate.beforeText || nodeText !== candidate.beforeText) continue;

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

  /**
   * 🔄 通用替换函数
   */
  const replaceForEntries = (entryList, matcherFn, replacerFn) => {
    entryList.forEach(({ before, after }) => {
      const trimmedBefore = before?.trim();
      const afterRaw = String(after ?? "");
      if (!trimmedBefore || afterRaw.trim() === "") return;

      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode(node) {
            // ⛔ 跳过不应替换的标签
            const parentTag = node.parentNode?.nodeName;
            if (skipTags.has(parentTag)) return NodeFilter.FILTER_REJECT;

            // ⛔ 跳过隐藏元素（如 display:none 或 visibility:hidden）
            if (
              node.parentElement &&
              window.getComputedStyle(node.parentElement).display === "none"
            )
              return NodeFilter.FILTER_REJECT;

            // ✅ 普通节点匹配逻辑
            const normalized = normalizeText(node.nodeValue);
            return matcherFn(normalized, trimmedBefore)
              ? NodeFilter.FILTER_ACCEPT
              : NodeFilter.FILTER_REJECT;
          },
        },
      );

      const textNodes = [];
      while (walker.nextNode()) textNodes.push(walker.currentNode);

      if (debugLiquidTranslate && entryList.length <= 50) {
        debugLog("textEntry", {
          before: summarize(trimmedBefore, 240),
          nodes: textNodes.length,
        });
      }

      textNodes.forEach((node) => {
        const original = node.nodeValue;
        const keepQuote = hasOuterQuote(original);
        const newValue = replacerFn(original, trimmedBefore, afterRaw);
        const newValueWithWhitespace = preserveBoundaryWhitespace(original, newValue);
        if (debugLiquidTranslate && debugReplaceTextCount < 20) {
          debugReplaceTextCount += 1;
          debugLog("replace:text", {
            before: summarize(original, 200),
            after: summarize(newValueWithWhitespace, 200),
          });
        }
        node.nodeValue = keepQuote ? `"${newValueWithWhitespace}"` : newValueWithWhitespace;
      });
    });
  };

  const replaceExactEntriesFast = (entryList) => {
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
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const parentTag = node.parentNode?.nodeName;
          if (skipTags.has(parentTag)) return NodeFilter.FILTER_REJECT;
          if (ciwiBlock && node.parentElement && ciwiBlock.contains(node.parentElement))
            return NodeFilter.FILTER_REJECT;
          if (
            node.parentElement &&
            window.getComputedStyle(node.parentElement).display === "none"
          )
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
      debugLog("textExactFast", { keys: exactMap.size, nodes: nodes.length });
    }

    nodes.forEach((node) => {
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

  const applyAllReplacements = () => {
    replaceHtmlExactEntries(exactEntries);
    replaceHtmlExactEntries(fuzzyEntries);

    replaceExactEntriesFast(exactEntries);

    replaceForEntries(
      fuzzyEntries,
      (normalized, trimmedBefore) => {
        if (shouldFlexibleWhitespaceMatch(trimmedBefore)) {
          return normalizeCollapsedText(normalized).includes(
            normalizeCollapsedText(trimmedBefore),
          );
        }
        return normalized.includes(trimmedBefore);
      },
      (original, trimmedBefore, trimmedAfter) => {
        const re = new RegExp(
          shouldFlexibleWhitespaceMatch(trimmedBefore)
            ? escapeRegExp(trimmedBefore).replace(/\s+/g, "\\s+")
            : escapeRegExp(trimmedBefore),
          "g",
        );
        return original.replace(re, () => trimmedAfter);
      },
    );
  };

  applyAllReplacements();

  if (typeof window !== "undefined") {
    const observerKey = "__ciwi_liquid_translate_observer__";
    if (!window[observerKey]) {
      let scheduled = false;
      let lastRunAt = 0;
      const observer = new MutationObserver(() => {
        if (scheduled) return;
        scheduled = true;

        const now = Date.now();
        const delay = now - lastRunAt < 200 ? 200 : 0;

        setTimeout(() => {
          requestAnimationFrame(() => {
            try {
              applyAllReplacements();
            } finally {
              lastRunAt = Date.now();
              scheduled = false;
            }
          });
        }, delay);
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

  // 🧩 获取数据库翻译数据
  const readTranslatedText = await ReadTranslatedText({
    blockId,
    shopName: shop.value,
    languageCode: language,
  });

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

          // ⛔ 隐藏节点也跳过
          if (
            node.parentElement &&
            window.getComputedStyle(node.parentElement).display === "none"
          ) {
            return NodeFilter.FILTER_REJECT;
          }

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

  // Step 2: 获取翻译图片数据
  const translatedImages = await GetShopImageData({
    shopName: shop,
    blockId,
    languageCode: language,
  });
  if (!translatedImages?.response?.length) {
    console.log("ℹ️ [HomeImageTranslate] no translated images found");
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
      languageInput: this.querySelector('input[name="language_code"]'),
      currencyInput: this.querySelector('input[name="currency_code"]'),
      countryInput: this.querySelector('input[name="country_code"]'),
      mainBox: this.querySelector("#main-box"),
      translateFloatBtn: this.querySelector("#translate-float-btn"),
      translateFloatBtnText: this.querySelector("#translate-float-btn-text"),
      languageSelector: this.querySelector(
        ".custom-selector[data-type='language']",
      ),
      currencySelector: this.querySelector(
        ".custom-selector[data-type='currency']",
      ),
      languageHeader: this.querySelector(".language_selector_header"),
      currencyHeader: this.querySelector(".currency_selector_header"),
      languageOptionsContainer: this.querySelector(
        ".options-container[data-type='language']",
      ),
      currencyOptionsContainer: this.querySelector(
        ".options-container[data-type='currency']",
      ),
      selectedFlag: this.querySelector(".selected-option .country-flag"),
      selectedLanguageText: this.querySelector(
        ".selected-option .selected-text[data-type='language']",
      ),
      options: this.querySelectorAll(".option-item"),
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

    // 修改语言选择器的点击事件
    this.elements.languageHeader?.addEventListener("click", () => {
      // 关闭货币选择器
      this.elements.currencySelector?.classList.remove("open");
      // 切换语言选择器
      this.elements.languageSelector?.classList.toggle("open");
    });

    // 修改货币选择器的点击事件
    this.elements.currencyHeader?.addEventListener("click", () => {
      // 关闭语言选择器
      this.elements.languageSelector?.classList.remove("open");
      // 切换货币选择器
      this.elements.currencySelector?.classList.toggle("open");
    });

    // 修改选项点击事件
    this.elements.options?.forEach((option) => {
      option.addEventListener("click", (e) => {
        this.handleOptionClick(e);
        // 关闭所有选择器
        this.closeAllSelectors();
      });
    });

    this.elements.closeButton?.addEventListener(
      "click",
      this.handleCancelClick.bind(this),
    );

    // 点击外部关闭
    document.addEventListener("click", this.handleOutsideClick.bind(this));
  }

  handleOptionClick(event) {
    const languageOptions = this.querySelectorAll(
      ".option-item[data-type='language']",
    );
    const currencyOptions = this.querySelectorAll(
      ".option-item[data-type='currency']",
    );
    const selectedCurrencyText = this.querySelector(
      ".selected-option .selected-text[data-type='currency']",
    );
    const selectedCurrencySymbol = this.querySelector(
      ".selected-option .currency-symbol",
    );
    const selectedFlag = this.querySelector(
      ".selected-option .option-country-flag",
    );
    const option = event.currentTarget;
    const value = option.dataset.value;
    const text = option.querySelector(".option-text")?.textContent;
    const flag = option.querySelector(".option-country-flag")?.src;
    const selectorType = option.closest(".custom-selector")?.dataset.type; // 获取选择器类型
    if (this.elements.languageInput.value == value) return;

    if (selectorType === "language") {
      // 更新选中项显示
      if (selectedFlag) {
        selectedFlag.src = flag;
      }
      if (this.elements.selectedLanguageText) {
        this.elements.selectedLanguageText.textContent = text;
      }
      // 更新选中状态
      languageOptions?.forEach((opt) => opt.classList.remove("selected"));
      option.classList.add("selected");
      this.elements.languageInput.value = value;
      localStorage.setItem("ciwi_selected_language", value);
    } else if (selectorType === "currency") {
      const symbol = option.querySelector(".currency-symbol")?.textContent;
      if (selectedCurrencySymbol) {
        selectedCurrencySymbol.textContent = symbol;
      }
      if (selectedCurrencyText) {
        selectedCurrencyText.textContent = text;
      }
      // 更新选中状态
      currencyOptions?.forEach((opt) => opt.classList.remove("selected"));
      option.classList.add("selected");
      localStorage.setItem("ciwi_selected_currency", value);
    }
    // 关闭所有选择器
    this.closeAllSelectors();
    this.elements.languageSelector?.classList.remove("open");
    this.elements.currencySelector?.classList.remove("open");
    this.elements.selectorBox.style.display = "none";
    if (
      this.elements.translateFloatBtn.style.justifyContent &&
      this.elements.mainBox.style.display === "none"
    ) {
      this.elements.translateFloatBtn.style.display = "flex";
    }
    this.rotateArrow("#mainbox-arrow-icon", 0);
    event.preventDefault();
    // 更新 main-box 显示文本
    const mainBoxFlag = this.querySelector("#main-language-flag");

    if (mainBoxFlag && flag) {
      mainBoxFlag.src = flag;
    }
    const displayText = this.elements.ciwiBlock.querySelector("#display-text");
    if (displayText) {
      const selectedLanguage =
        this.elements.languageSelector?.querySelector(".selected-text")
          ?.textContent || "";
      const selectedCurrency =
        this.elements.currencySelector?.querySelector(".selected-text")
          ?.textContent || "";

      const languageSelectorContainer = this.elements.ciwiBlock.querySelector(
        "#language-switcher-container",
      );
      const currencySelectorContainer = this.elements.ciwiBlock.querySelector(
        "#currency-switcher-container",
      );

      if (
        languageSelectorContainer.style.display === "block" &&
        currencySelectorContainer.style.display === "block"
      ) {
        displayText.textContent = `${selectedLanguage} / ${selectedCurrency}`;
      } else if (languageSelectorContainer.style.display === "block") {
        displayText.textContent = selectedLanguage;
      } else if (currencySelectorContainer.style.display === "block") {
        displayText.textContent = selectedCurrency;
      }
    }
    const form = this.querySelector("form");

    // 提交表单
    if (form) {
      // 判断语言的iso_code，动态点击确定按钮的时候，修改dir的属性
      // 根据语言选择更新页面方向
      form.submit();
    }
  }

  handleCancelClick(event) {
    event.preventDefault();
    this.elements.languageSelector?.classList.remove("open");
    this.elements.currencySelector?.classList.remove("open");
    this.elements.selectorBox.style.display = "none";
    if (
      this.elements.translateFloatBtn.style.justifyContent &&
      this.elements.mainBox.style.display === "none"
    ) {
      this.elements.translateFloatBtn.style.display = "flex";
    }
    this.rotateArrow("#mainbox-arrow-icon", 0);
  }

  handleOutsideClick(event) {
    if (
      this.elements.ciwiContainer &&
      !this.elements.ciwiContainer.contains(event.target)
    ) {
      if (this.elements.selectorBox) {
        this.elements.languageSelector?.classList.remove("open");
        this.elements.currencySelector?.classList.remove("open");
        this.elements.selectorBox.style.display = "none";
        if (
          this.elements.translateFloatBtn.style.justifyContent &&
          this.elements.mainBox.style.display === "none"
        ) {
          this.elements.translateFloatBtn.style.display = "flex";
        }
      }
      this.rotateArrow("#mainbox-arrow-icon", 0);
    }
  }

  toggleSelector(event) {
    event.preventDefault();
    console.log("点击block");
    const ciwiBlock = this.elements.ciwiBlock;
    if (!ciwiBlock) {
      console.error("ciwiBlock not found");
      return;
    }

    const isVisible = this.elements.selectorBox.style.display !== "none";
    this.elements.selectorBox.style.display = isVisible ? "none" : "flex";
    if (
      this.elements.translateFloatBtn.style.justifyContent &&
      this.elements.mainBox.style.display === "none"
    ) {
      this.elements.translateFloatBtn.style.display = isVisible
        ? "flex"
        : "none";
    }
    // // 移动端适配
    // if (window.innerWidth <= 768) {
    //   const mainBox = ciwiBlock.querySelector("main-box");
    //   mainBox.style.display = isVisible ? "block" : "none";
    //   this.elements.ciwiContainer.classList.toggle("expanded", !isVisible);
    // }

    // 旋转箭头
    this.rotateArrow("#mainbox-arrow-icon", isVisible ? 0 : 180);
  }

  rotateArrow(elementId, degrees) {
    const arrow = this.elements.ciwiBlock.querySelector(elementId);
    if (arrow) {
      arrow.style.transform = `rotate(${degrees}deg)`;
      arrow.style.transformOrigin = "center center"; // 确保旋转中心点在图标中心
    }
  }

  // 添加一个关闭所有选择器的方法
  closeAllSelectors() {
    this.elements.languageSelector?.classList.remove("open");
    this.elements.currencySelector?.classList.remove("open");
  }
}
