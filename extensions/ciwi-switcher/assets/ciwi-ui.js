// ui.js
import {
  fetchCurrencies,
  GetProductImageData,
  fetchAutoRate,
  GetShopImageData,
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
  console.log("currency: ", currencyData);

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

/**
 * 观察 DOM 变化，动态处理新价格
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
    console.log("productImageData: ", productImageData);

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
      if (item.altBeforeTranslation) {
        img.alt = item.altBeforeTranslation;
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

  updateLanguage(event) {
    const selectedLanguage = event.target.value;
    if (this.elements.languageInput) {
      this.elements.languageInput.value = selectedLanguage;
    }
  }

  updateCurrency(event) {
    const selectedCurrency = event.target.value;
    if (this.elements.currencyInput) {
      this.elements.currencyInput.value = selectedCurrency;
    }
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
