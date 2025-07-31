async function GetProductImageData({ shopName, productId, languageCode }) {
  try {
    const response = await axios({
      url: `https://springbackendservice-e3hgbjgqafb9cpdh.canadacentral-01.azurewebsites.net/picture/getPictureDataByShopNameAndResourceIdAndPictureId?shopName=${shopName}`,
      method: "POST",
      data: {
        shopName: shopName,
        imageId: `gid://shopify/Product/${productId}`,
        languageCode: languageCode,
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error GetProductImageData:", error);
  }
}

async function fetchSwitcherConfig(shop) {
  const response = await axios({
    url: `https://springbackendservice-e3hgbjgqafb9cpdh.canadacentral-01.azurewebsites.net/widgetConfigurations/getData`,
    method: "POST",
    data: {
      shopName: shop,
    },
  });

  const data = response.data;
  const initData = {
    shopName: shop,
    includedFlag: true,
    languageSelector: true,
    currencySelector: true,
    ipOpen: false,
    fontColor: "#000000",
    backgroundColor: "#ffffff",
    buttonColor: "#ffffff",
    buttonBackgroundColor: "#000000",
    optionBorderColor: "#ccc",
    selectorPosition: "bottom_left",
    positionData: 10,
  };
  if (
    data.success &&
    typeof data.response === "object" &&
    data.response !== null
  ) {
    const filteredResponse = Object.fromEntries(
      Object.entries(data.response).filter(([_, value]) => value !== null),
    );
    const res = {
      ...initData,
      ...filteredResponse,
    };
    return res;
  } else {
    return initData;
  }
}

async function fetchCurrencies(shop) {
  const response = await axios({
    url: `https://springbackendservice-e3hgbjgqafb9cpdh.canadacentral-01.azurewebsites.net/currency/getCurrencyByShopName?shopName=${shop}`,
    method: "GET",
  });

  const res = response.data.response;
  if (res) {
    const data = res.map((item) => ({
      key: item.id,
      symbol: item.symbol || "$",
      rounding: item.rounding,
      exchangeRate: item.exchangeRate,
      currencyCode: item.currencyCode,
      primaryStatus: item.primaryStatus,
    }));
    return data;
  } else {
    return undefined;
  }
}

async function fetchAutoRate(shop, currencyCode) {
  const response = await axios({
    url: `https://springbackendservice-e3hgbjgqafb9cpdh.canadacentral-01.azurewebsites.net/currency/getCacheData`,
    method: "POST",
    data: {
      shopName: shop,
      currencyCode: currencyCode,
    },
  });

  const res = response.data.response;
  return res.exchangeRate;
}

async function checkUserIp(shop) {
  try {
    const response = await axios({
      url: `https://springbackendservice-e3hgbjgqafb9cpdh.canadacentral-01.azurewebsites.net/userIp/checkUserIp?shopName=${shop}`,
      method: "POST",
    });
    return response.data?.response;
  } catch (error) {
    console.error("Error checkUserIp:", error);
    return null;
  }
}

async function fetchUserCountryInfo(access_key) {
  try {
    const response = await axios.get(
      `http://api.ipapi.com/api/check?access_key=${access_key}`,
    );
    return response.data;
  } catch (error) {
    console.error("Error fetchUserCountryInfo:", error);
    return null;
  }
}

async function fetchLanguageLocaleInfo(locale) {
  // 使用 map 方法遍历数组并替换每个字符串中的 '-' 为 '_'
  const updatedLocales = locale.map((item) => item.replace(/-/g, "_"));
  try {
    const response = await axios({
      url: `https://springbackendservice-e3hgbjgqafb9cpdh.canadacentral-01.azurewebsites.net/shopify/getImageInfo`,
      method: "POST",
      data: updatedLocales,
    });
    const data = response.data.response;
    console.log("Fetched language locale info:", data);
    const res = Object.keys(data).reduce((acc, key) => {
      // 将 key 中的 "_" 替换为 "-"
      const newKey = key.replace("_", "-");
      // 保持原来的值，重新赋值给新键
      acc[newKey] = data[key];
      return acc;
    }, {});
    return res;
  } catch (error) {
    console.error("Error occurred in the languageData:", error);
  }
}

async function initializeCurrency(data, shop, ciwiBlock) {
  let value = localStorage.getItem("selectedCurrency");
  let moneyFormat = ciwiBlock.querySelector("#queryMoneyFormat").value;

  console.log("moneyFormat: ", moneyFormat);

  const selectedCurrency = data.find(
    (currency) => currency?.currencyCode === value,
  );

  console.log("data: ", data);
  console.log("selectedCurrency: ", selectedCurrency);

  const isValueInCurrencies =
    selectedCurrency && !selectedCurrency.primaryStatus;

  // 获取新的选择器元素
  const customSelector = ciwiBlock.querySelector(
    "#currency-switcher-container",
  );
  const selectedOption = customSelector?.querySelector(".selected-option");
  const optionsList = customSelector?.querySelector(".options-list");
  const currencyInput = ciwiBlock.querySelector('input[name="currency_code"]');

  if (isValueInCurrencies) {
    customSelector.style.display = "block";
    let rate = selectedCurrency.exchangeRate;
    if (selectedCurrency.exchangeRate == "Auto") {
      rate = await fetchAutoRate(shop.value, selectedCurrency.currencyCode);
      if (typeof rate != "number") {
        rate = 1;
      }
    }

    // 更新价格显示
    const prices = document.querySelectorAll(".ciwi-money");

    prices.forEach((price) => {
      const priceText = price.innerText;
      const transformedPrice = transform(
        priceText,
        rate,
        moneyFormat,
        selectedCurrency.symbol,
        selectedCurrency.currencyCode,
        selectedCurrency.rounding,
      );

      if (transformedPrice) {
        price.innerHTML = transformedPrice;
      }
    });

    // 更新输入值和选中项
    currencyInput.value = value;

    // 清空并重新生成选项
    if (optionsList) {
      optionsList.innerHTML = "";
      data.forEach((currency) => {
        const optionItem = document.createElement("div");
        optionItem.className = `option-item ${currency.currencyCode === value ? "selected" : ""}`;
        optionItem.dataset.value = currency.currencyCode;
        optionItem.dataset.type = "currency";
        optionItem.innerHTML = `
          <span class="option-text">${currency.currencyCode}</span> 
          <span class="currency-symbol">(${currency.symbol})</span>
        `;

        // 为新创建的选项添加点击事件监听器
        optionItem.addEventListener("click", function (e) {
          // 获取 CiwiswitcherForm 实例
          const form = ciwiBlock.querySelector("ciwiswitcher-form");
          if (form) {
            form.handleOptionClick(e);
          }
        });

        optionsList.appendChild(optionItem);

        // 如果是选中项，更新选择器头部显示
        if (currency.currencyCode === value && selectedOption) {
          selectedOption.innerHTML = `
            <span class="selected-text" data-type="currency">${currency.currencyCode}</span>
            <span class="currency-symbol">(${currency.symbol})</span>
          `;
        }
      });
    }
  } else if (data.length) {
    customSelector.style.display = "block";
    const primaryCurrency =
      data.find((currency) => currency.primaryStatus) || data[0];
    currencyInput.value = primaryCurrency.currencyCode;

    // 清空并重新生成选项
    if (optionsList) {
      optionsList.innerHTML = "";
      data.forEach((currency) => {
        const optionItem = document.createElement("div");
        optionItem.className = `option-item ${currency.primaryStatus ? "selected" : ""}`;
        optionItem.dataset.value = currency.currencyCode;
        optionItem.dataset.type = "currency";
        optionItem.innerHTML = `
          <span class="option-text">${currency.currencyCode}</span>
          <span class="currency-symbol">(${currency.symbol})</span>
        `;

        // 为新创建的选项添加点击事件监听器
        optionItem.addEventListener("click", function (e) {
          const form = ciwiBlock.querySelector("ciwiswitcher-form");
          if (form) {
            form.handleOptionClick(e);
          }
        });

        optionsList.appendChild(optionItem);

        // 如果是主要货币，更新选择器头部显示
        if (currency.primaryStatus && selectedOption) {
          selectedOption.innerHTML = `
            <span class="selected-text" data-type="currency">${currency.currencyCode}</span>
            <span class="currency-symbol">(${currency.symbol})</span>
          `;
        }
      });
    }
  }
}

// Function to update the display text
function updateDisplayText(lang, cur, ciwiBlock) {
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
    const currencySelector = ciwiBlock.querySelector(
      '.custom-selector[data-type="currency"]',
    );
    selectedCurrencyText =
      currencySelector?.querySelector(".selected-text")?.textContent ||
      "undefined";
  }
  // 更新显示文本
  const displayTextElement = ciwiBlock.querySelector("#display-text");
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
// Function to transform the price according to selected currency
function transform(
  price,
  exchangeRate,
  moneyFormat,
  symbol,
  currencyCode,
  rounding,
) {
  const formattedPrice = price.replace(/[^0-9,. ]/g, "").trim();

  // console.log("formattedPrice: ", formattedPrice);

  if (!formattedPrice || exchangeRate == "Auto") {
    return price;
  }

  let number = convertToNumberFromMoneyFormat(moneyFormat, formattedPrice);

  // console.log("1.number: ", number);

  // Remove commas or other unwanted characters
  number = (number * exchangeRate).toFixed(2);

  // console.log("2.number: ", number);

  const transformedPrice = customRounding(number, rounding);

  // console.log("3.transformedPrice: ", transformedPrice);

  number = detectNumberFormat(moneyFormat, transformedPrice, rounding);

  // console.log("4.number: ", number);

  return `${symbol}${number} <span class="currency-code">${currencyCode}</span>`;
}

function convertToNumberFromMoneyFormat(moneyFormat, formattedPrice) {
  let number = formattedPrice;

  // console.log(moneyFormat);
  // console.log(
  //   "moneyFormat.includes('amount'): ",
  //   moneyFormat.includes("amount"),
  // );
  // console.log(
  //   "moneyFormat.includes('amount_no_decimals'): ",
  //   moneyFormat.includes("amount_no_decimals"),
  // );
  // console.log(
  //   "moneyFormat.includes('amount_with_comma_separator'): ",
  //   moneyFormat.includes("amount_with_comma_separator"),
  // );
  // console.log(
  //   "moneyFormat.includes('amount_no_decimals_with_comma_separator'): ",
  //   moneyFormat.includes("amount_no_decimals_with_comma_separator"),
  // );
  // console.log(
  //   "moneyFormat.includes('amount_with_apostrophe_separator'): ",
  //   moneyFormat.includes("amount_with_apostrophe_separator"),
  // );
  // console.log(
  //   "moneyFormat.includes('amount_no_decimals_with_space_separator'): ",
  //   moneyFormat.includes("amount_no_decimals_with_space_separator"),
  // );
  // console.log(
  //   "moneyFormat.includes('amount_with_space_separator'): ",
  //   moneyFormat.includes("amount_with_space_separator"),
  // );
  // console.log(
  //   "moneyFormat.includes('amount_with_period_and_space_separator'): ",
  //   moneyFormat.includes("amount_with_period_and_space_separator"),
  // );

  switch (true) {
    case moneyFormat.includes("amount"):
      number = number.replace(/,/g, "");
      return parseFloat(number).toFixed(2);

    case moneyFormat.includes("amount_no_decimals"):
      return parseFloat(number.replace(/,/g, "")).toFixed(2);

    case moneyFormat.includes("amount_with_comma_separator"):
      // 处理数字为 1.134,65 格式：首先替换逗号为点，小数点为逗号
      number = number.replace(/\./g, "").replace(",", ".");
      return parseFloat(number).toFixed(2);

    case moneyFormat.includes("amount_no_decimals_with_comma_separator"):
      // 同上，去掉逗号，小数点没有
      return parseFloat(number.replace(/\./g, "").replace(",", "")).toFixed(2);

    case moneyFormat.includes("amount_with_apostrophe_separator"):
      // 处理 1'134.65 格式：去掉撇号
      number = number.replace(/'/g, "");
      return parseFloat(number).toFixed(2);

    case moneyFormat.includes("amount_no_decimals_with_space_separator"):
      // 处理 1 135 格式：去掉空格
      number = number.replace(/\s/g, "");
      return parseFloat(number).toFixed(2);

    case moneyFormat.includes("amount_with_space_separator"):
      // 处理 1 134,65 格式：去掉空格，小数点用逗号分隔
      number = number.replace(/\s/g, "").replace(",", ".");
      return parseFloat(number).toFixed(2);

    case moneyFormat.includes("amount_with_period_and_space_separator"):
      // 处理 1 134.65 格式：去掉空格，小数点是点
      number = number.replace(/\s/g, "");
      return parseFloat(number).toFixed(2);

    default:
      number = number.replace(/\./g, "").replace(",", ".");
      return parseFloat(number).toFixed(2);
  }
}

// Rounding function
function customRounding(number, rounding) {
  if (parseFloat(number) === 0 && rounding != "0") {
    return number;
  }
  const integerPart = Math.floor(number);

  switch (rounding) {
    case "":
      return number;
    case "0":
      const customRoundingNumber = parseFloat(number).toFixed(0);
      return customRoundingNumber;
    case "1.00":
      return integerPart.toFixed(2);
    case "0.99":
      return integerPart + 0.99;
    case "0.95":
      return integerPart + 0.95;
    case "0.75":
      return integerPart + 0.75;
    case "0.5":
      return (integerPart + 0.5).toFixed(2);
    case "0.25":
      return integerPart + 0.25;
    default:
      return number;
  }
}

function detectNumberFormat(moneyFormat, transformedPrice, rounding) {
  let number = transformedPrice.toString();
  let [integerPart, decimalPart] = number.split("."); // 默认以点为小数点分隔符

  if (rounding == "0") {
    // 处理不同的格式
    switch (moneyFormat) {
      case "amount":
        // 默认格式，带有逗号作为千位分隔符，保留小数
        return formatWithComma(integerPart, "");

      case "amount_no_decimals":
        // 无小数，千位分隔符
        return formatWithComma(integerPart, "");

      case "amount_with_comma_separator":
        // 使用逗号作为千位分隔符，且使用逗号为小数点
        return formatWithCommaAndCommaDecimal(integerPart, "");

      case "amount_no_decimals_with_comma_separator":
        // 无小数，千位分隔符，且使用逗号为小数点
        return formatWithCommaAndCommaDecimal(integerPart, "");

      case "amount_with_apostrophe_separator":
        // 使用撇号作为千位分隔符
        return formatWithApostrophe(integerPart, "");

      case "amount_no_decimals_with_space_separator":
        // 无小数，使用空格作为千位分隔符
        return formatWithSpace(integerPart, "");

      case "amount_with_space_separator":
        // 使用空格作为千位分隔符，且使用逗号为小数点
        return formatWithSpace(integerPart, "");

      case "amount_with_period_and_space_separator":
        // 使用空格作为千位分隔符，点作为小数点
        return formatWithSpaceAndPeriod(integerPart, "");

      default:
        return transformedPrice; // 默认返回原始的转换价格
    }
  } else {
    switch (moneyFormat) {
      case "amount":
        // 默认格式，带有逗号作为千位分隔符，保留小数
        return formatWithComma(
          integerPart,
          Number(`0.${decimalPart}`).toFixed(2).slice(2),
        );

      case "amount_no_decimals":
        // 无小数，千位分隔符
        return formatWithComma(integerPart, "");

      case "amount_with_comma_separator":
        // 使用逗号作为千位分隔符，且使用逗号为小数点
        return formatWithCommaAndCommaDecimal(
          integerPart,
          Number(`0.${decimalPart}`).toFixed(2).slice(2),
        );

      case "amount_no_decimals_with_comma_separator":
        // 无小数，千位分隔符，且使用逗号为小数点
        return formatWithCommaAndCommaDecimal(integerPart, "");

      case "amount_with_apostrophe_separator":
        // 使用撇号作为千位分隔符
        return formatWithApostrophe(
          integerPart,
          Number(`0.${decimalPart}`).toFixed(2).slice(2),
        );

      case "amount_no_decimals_with_space_separator":
        // 无小数，使用空格作为千位分隔符
        return formatWithSpace(integerPart, "");

      case "amount_with_space_separator":
        // 使用空格作为千位分隔符，且使用逗号为小数点
        return formatWithSpace(
          integerPart,
          Number(`0.${decimalPart}`).toFixed(2).slice(2),
        );

      case "amount_with_period_and_space_separator":
        // 使用空格作为千位分隔符，点作为小数点
        return formatWithSpaceAndPeriod(
          integerPart,
          Number(`0.${decimalPart}`).toFixed(2).slice(2),
        );

      default:
        return transformedPrice; // 默认返回原始的转换价格
    }
  }
}

function formatWithComma(integerPart, decimalPart) {
  // 为整数部分加上逗号作为千位分隔符
  integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (decimalPart) {
    return `${integerPart}.${decimalPart}`;
  }
  return integerPart;
}

function formatWithCommaAndCommaDecimal(integerPart, decimalPart) {
  // 为整数部分加上点作为千位分隔符，且使用逗号为小数点
  integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  if (decimalPart) {
    return `${integerPart},${decimalPart}`;
  }
  return integerPart;
}

function formatWithApostrophe(integerPart, decimalPart) {
  // 为整数部分加上撇号作为千位分隔符
  integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  if (decimalPart) {
    return `${integerPart}.${decimalPart}`;
  }
  return integerPart;
}

function formatWithSpace(integerPart, decimalPart) {
  // 为整数部分加上空格作为千位分隔符
  integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  if (decimalPart) {
    return `${integerPart},${decimalPart}`;
  }
  return integerPart;
}

function formatWithSpaceAndPeriod(integerPart, decimalPart) {
  // 为整数部分加上空格作为千位分隔符，且点作为小数点
  integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  if (decimalPart) {
    return `${integerPart}.${decimalPart}`;
  }
  return integerPart;
}

function isInThemeEditor() {
  const url = window.location.href;
  return null;
}

function updateLocalization({ country, language }) {
  const formId = crypto.randomUUID();
  const formHtml = `
    <form id="${formId}" action="/localization" method="POST" hidden>
      <input name="_method" value="PUT">
      <input name="country_code" value="${country}">
      <input name="language_code" value="${language}">
    </form>
  `;
  document.body.insertAdjacentHTML("beforeend", formHtml);
  document.getElementById(formId).submit();
}

// Class to handle form submission and interactions
class CiwiswitcherForm extends HTMLElement {
  constructor() {
    super();
    this.elements = {}; // 空对象，等 connectedCallback 再赋值
  }
  connectedCallback() {
    this.elements = {
      ciwiBlock: document.querySelector(
        "#shopify-block-AdHQwSXVWVGU1WDgzN__10786389038645483885",
      ),
      ciwiContainer: this.querySelector("#ciwi-container"),
      selectorBox: this.querySelector("#selector-box"),
      languageInput: this.querySelector('input[name="language_code"]'),
      currencyInput: this.querySelector('input[name="currency_code"]'),
      countryInput: this.querySelector('input[name="country_code"]'),
      confirmButton: this.querySelector("#switcher-confirm"),
      mainBox: this.querySelector("#main-box"),
      translateFloatBtn: this.querySelector("#translate-float-btn"),
      translateFloatBtnText: this.querySelector("#translate-float-btn-text"),
      languageSelector: this.querySelector(
        ".custom-selector[data-type='language']",
      ),
      currencySelector: this.querySelector(
        ".custom-selector[data-type='currency']",
      ),
      languageHeader: this.querySelector(
        ".selector-header[data-type='language']",
      ),
      currencyHeader: this.querySelector(
        ".selector-header[data-type='currency']",
      ),
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
    };
    // 初始化所有事件监听
    this.initializeEventListeners();
  }
  initializeEventListeners() {
    // 阻止选择器框的点击事件冒泡
    this.elements.selectorBox?.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    // 按钮事件
    this.elements.confirmButton?.addEventListener(
      "click",
      this.submitForm.bind(this),
    );

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
    const selectedFlag = this.querySelector(".selected-option .country-flag");
    const mainBoxFlag = this.querySelector("#main-language-flag");
    const option = event.currentTarget;
    const value = option.dataset.value;
    const text = option.querySelector(".option-text")?.textContent;
    const flag = option.querySelector(".country-flag")?.src;
    const selectorType = option.closest(".custom-selector")?.dataset.type; // 获取选择器类型

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
      if (mainBoxFlag) {
        mainBoxFlag.src = flag;
      }
    } else if (selectorType === "currency") {
      if (selectedCurrencyText) {
        selectedCurrencyText.textContent = text;
      }
      // 更新选中状态
      currencyOptions?.forEach((opt) => opt.classList.remove("selected"));
      option.classList.add("selected");
      this.elements.currencyInput.value = value;
    }

    // 更新 main-box 显示文本
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
    // 重置箭头方向
    this.rotateArrow("mainbox-arrow-icon", 0);

    // 关闭所有选择器
    this.closeAllSelectors();
  }

  handleOutsideClick(event) {
    if (
      this.elements.ciwiContainer &&
      !this.elements.ciwiContainer.contains(event.target)
    ) {
      if (this.elements.selectorBox) {
        this.elements.selectorBox.style.display = "none";
        if (this.elements.translateFloatBtn.style.justifyContent) {
          this.elements.translateFloatBtn.style.display = "flex";
        }
      }
      this.rotateArrow("mainbox-arrow-icon", 0);
    }
  }

  submitForm(event) {
    event.preventDefault();
    const form = this.querySelector("form");
    localStorage.setItem("selectedLanguage", this.elements.languageInput.value);
    localStorage.setItem("selectedCurrency", this.elements.currencyInput.value);

    // 提交表单
    if (form) {
      // 判断语言的iso_code，动态点击确定按钮的时候，修改dir的属性
      // 根据语言选择更新页面方向

      form.submit();
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
    console.log("toggleSelector:", ciwiBlock);

    const box = this.elements.ciwiBlock.querySelector("#selector-box");
    const isVisible = box.style.display !== "none";
    box.style.display = isVisible ? "none" : "block";
    this.elements.translateFloatBtn.style.display = isVisible
      ? "block"
      : "none";
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
    }
  }

  // 添加一个关闭所有选择器的方法
  closeAllSelectors() {
    this.elements.languageSelector?.classList.remove("open");
    this.elements.currencySelector?.classList.remove("open");
  }
}

// Define the custom element
customElements.define("ciwiswitcher-form", CiwiswitcherForm);
// Page load handling
window.onload = async function () {
  const ciwiBlock = document.querySelector(
    "#shopify-block-AdHQwSXVWVGU1WDgzN__10786389038645483885",
  );
  if (!ciwiBlock) {
    console.log("ciwiBlock not found");
    return;
  }

  const switcher = ciwiBlock.querySelector("#ciwi-container");
  const shop = ciwiBlock.querySelector("#queryCiwiId");

  const mainBox = ciwiBlock.querySelector("#main-box");
  const languageInput = ciwiBlock.querySelector('input[name="language_code"]');
  const language = languageInput.value;
  const productId = ciwiBlock.querySelector('input[name="product_id"]');
  const selectedLanguageText = ciwiBlock.querySelector(
    "#translate-float-btn-text",
  );
  const translateFloatBtnIcon = ciwiBlock.querySelector(
    "#translate-float-btn-icon",
  );
  const selectionBox = ciwiBlock.querySelector("#selector-box");
  const selectedTextElement = ciwiBlock.querySelector(
    '.selected-option[data-type="language"] .selected-text',
  );
  const currentSelectedLanguage = selectedTextElement.textContent.trim();
  // 记录当前语言是否为RTL语言
  const rtlLanguages = [
    "العربية",
    "فارسی",
    "اُردُو",
    "	עברית",
    "ܣܘܪܝܝܐ",
    "پښتو",
    "دری",
    "کوردی",
    "ئۇيغۇرچە",
  ];
  const isRtlLanguage = rtlLanguages.includes(currentSelectedLanguage);
  const data = await fetchSwitcherConfig(shop.value);

  console.log("加载中...");

  if (productId) {
    const productIdValue = productId.value;
    const productImageData = await GetProductImageData({
      shopName: shop.value,
      productId: productIdValue,
      languageCode: language,
    });

    if (productImageData.response.length > 0) {
      const imageDomList = ciwiBlock.querySelectorAll("img");

      // 遍历所有img
      imageDomList.forEach((img) => {
        // 在response数组中查找匹配项
        const match = productImageData.response.find((item) =>
          img.src.includes(item.imageBeforeUrl.split("/files/")[2]),
        );
        if (match) {
          // 如果imageAfterUrl或altBeforeTranslation存在，则替换
          if (match.imageAfterUrl || match.altBeforeTranslation) {
            if (match.imageAfterUrl) {
              img.src = match?.imageAfterUrl;
              img.srcset = match?.imageAfterUrl;
            }
            if (match.altBeforeTranslation) {
              img.alt = match?.altBeforeTranslation;
            }
          }
        }
      });
    }
  }

  if (
    data.languageSelector ||
    (!data.languageSelector && !data.currencySelector)
  ) {
    const languageSelector = ciwiBlock.querySelector(
      "#language-switcher-container",
    );
    languageSelector.style.display = "block";
    const languageSelectorHeader = ciwiBlock.querySelector(
      ".selector-header[data-type='language']",
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

    if (data.includedFlag) {
      //获取所有语言代码
      const languageCodes = Array.from(
        ciwiBlock.querySelectorAll(".option-item[data-type='language']"),
      ).map((option) => option.dataset.value);

      const languageLocaleData = await fetchLanguageLocaleInfo(languageCodes);
      const languageOptions = ciwiBlock.querySelectorAll(
        ".option-item[data-type='language']",
      );
      languageOptions.forEach((option) => {
        const langCode = option.dataset.value;
        const countryCode = languageLocaleData[langCode]?.countries[0];
        if (countryCode) {
          // 创建并插入国旗图片
          const flagImg = document.createElement("img");
          flagImg.className = "country-flag";
          flagImg.src = countryCode;
          flagImg.alt = "";
          // 将图片插入到选项的最前面
          option.insertBefore(flagImg, option.firstChild);
        }
      });
      // 为当前选中的语言添加国旗
      const selectedOption = ciwiBlock.querySelector(
        ".selector-header[data-type='language'] .selected-option",
      );
      if (selectedOption) {
        const countryCode = languageLocaleData[language]?.countries[0];
        const optionFlagImg = document.createElement("img");
        optionFlagImg.className = "country-flag";
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
    }
  }

  if (data.ipOpen) {
    const iptoken = ciwiBlock.querySelector('input[name="iptoken"]');
    const iptokenValue = iptoken.value;
    if (iptokenValue) iptoken.remove();
    const storedLanguage = localStorage.getItem("selectedLanguage");
    const storedCountry = localStorage.getItem("selectedCountry");
    const storedCurrency = localStorage.getItem("selectedCurrency");
    const countryInput = ciwiBlock.querySelector('input[name="country_code"]');
    const country = countryInput.value;
    const currencyInput = ciwiBlock.querySelector(
      'input[name="currency_code"]',
    );
    const currency = currencyInput.value;
    const availableLanguages = Array.from(
      ciwiBlock.querySelectorAll(".option-item[data-type='language']"),
    ).map((option) => option.dataset.value);
    const availableCountries = Array.from(
      ciwiBlock.querySelectorAll('ul[role="list"] a[data-value]'),
    ).map((link) => link.getAttribute("data-value"));

    if (storedLanguage) {
      if (
        storedLanguage !== languageInput.value &&
        availableLanguages.includes(storedLanguage)
      ) {
        // 存储到 localStorage
        languageInput.value = storedLanguage;
      }
    } else {
      const browserLanguage = navigator.language;
      console.log(browserLanguage);

      let detectedLanguage;
      // 获取匹配的语言或默认为英语
      if (browserLanguage.includes("zh")) {
        detectedLanguage = browserLanguage || "en";
        localStorage.setItem("selectedLanguage", detectedLanguage);
      } else {
        detectedLanguage = browserLanguage.split("-")[0] || "en";
        localStorage.setItem("selectedLanguage", detectedLanguage);
      }
      if (
        languageInput.value !== detectedLanguage &&
        availableLanguages.includes(detectedLanguage)
      ) {
        languageInput.value = detectedLanguage;
      }
    }

    if (storedCountry && storedCurrency) {
      if (
        countryInput.value !== storedCountry &&
        availableCountries.includes(storedCountry)
      ) {
        countryInput.value = storedCountry;
      }
      if (currencyInput.value !== storedCurrency) {
        currencyInput.value = storedCurrency;
      }
    } else {
      const userIp = await checkUserIp(shop.value);
      if (!userIp) {
        return;
      }
      const IpData = await fetchUserCountryInfo(iptokenValue);

      if (IpData?.currency?.code) {
        localStorage.setItem("selectedCurrency", IpData.currency.code);
      }

      if (
        IpData?.country_code &&
        availableCountries.includes(IpData.country_code)
      ) {
        if (countryInput.value !== IpData.country_code) {
          countryInput.value = IpData.country_code;
        }
        localStorage.setItem("selectedCountry", countryInput.value);
        console.log(
          "若市场跳转不正确则清除缓存并手动设置selectedCountry字段(If the market jump is incorrect, clear the cache and manually set the selectedCountry field)",
        );
      } else {
        localStorage.setItem("selectedCountry", false);
        console.log(
          "该商店不包含您目前所在市场(The store does not include the market you are currently in)",
        );
      }
    }
    // 判断是否在主题编辑器中
    const isInThemeEditor = document.documentElement.classList.contains(
      "shopify-design-mode",
    );
    console.log("isInThemeEditor:", isInThemeEditor);

    if (
      (countryInput.value !== country || languageInput.value !== language) &&
      countryInput.value &&
      languageInput.value &&
      !isInThemeEditor
    ) {
      updateLocalization({
        country: countryInput.value,
        language: languageInput.value,
      });
    }
  }

  // 修改RTL和LTR的组件布局
  if (selectedLanguageText && selectedTextElement) {
    if (isRtlLanguage) {
      selectedLanguageText.style.transform = "rotate(90deg)";
      selectedLanguageText.style.right = "0";
      translateFloatBtnIcon.style.right = "10px";
      selectionBox.style.right = "0";
    }
  }

  if (
    data.currencySelector ||
    (!data.languageSelector && !data.currencySelector)
  ) {
    const currencySelector = ciwiBlock.querySelector(
      "#currency-switcher-container",
    );
    currencySelector.style.display = "block";
    const currencySelectorHeader = ciwiBlock.querySelector(
      ".selector-header[data-type='currency']",
    );
    currencySelectorHeader.style.backgroundColor = data.backgroundColor;
    currencySelectorHeader.style.border = `1px solid ${data.optionBorderColor}`;
    const currencySelectorSelectedOption = ciwiBlock.querySelector(
      ".options-container[data-type='currency']",
    );
    currencySelectorSelectedOption.style.backgroundColor = data.backgroundColor;
    currencySelectorSelectedOption.style.border = `1px solid ${data.optionBorderColor}`;
    // 在页面加载时执行初始化
    const currencyData = await fetchCurrencies(shop.value);

    if (currencyData) {
      await initializeCurrency(currencyData, shop, ciwiBlock);
    }
    if (!data.languageSelector) {
      const mainLanguageFlag = ciwiBlock.querySelector("#main-language-flag");
      if (mainLanguageFlag) {
        mainLanguageFlag.hidden = true;
      }
      const mainBox = ciwiBlock.querySelector("#main-box");
      if (mainBox) {
        mainBox.style.justifyContent = "center";
      }
    }
  }
  if (switcher) {
    const selectorBox = ciwiBlock.querySelector("#selector-box");
    const confirmButton = ciwiBlock.querySelector(
      ".ciwi_switcher_confirm_button",
    );
    const translateFloatBtn = ciwiBlock.querySelector("#translate-float-btn");
    const translateFloatBtnText = ciwiBlock.querySelector(
      "#translate-float-btn-text",
    );
    const translateFloatBtnIcon = ciwiBlock.querySelector(
      "#translate-float-btn-icon",
    );
    confirmButton.style.backgroundColor = data.buttonBackgroundColor;
    confirmButton.style.color = data.buttonColor;
    selectorBox.style.backgroundColor = data.backgroundColor;
    switcher.style.color = data.fontColor;
    if (
      data.selectorPosition === "top_left" ||
      data.selectorPosition === "top_right"
    ) {
      // 当位置在顶部时，选择器框在下方展开
      selectorBox.style.top = "100%"; // 设置顶部距离为主框高度
      selectorBox.style.bottom = "auto";
      selectorBox.style.transform = "none"; // 清除transform
    } else {
      // 当位置在底部时，选择器框在上方展开
      selectorBox.style.bottom = "100%"; // 设置底部距离为主框高度
      selectorBox.style.top = "auto";
      selectorBox.style.transform = "none";
    }

    if (data.selectorPosition === "top_left") {
      switcher.style.top = data?.positionData.toString() + "%" || "10%";
      switcher.style.bottom = "auto";
      translateFloatBtnText.style.borderRadius = "8px 8px 0px 0px";
      translateFloatBtn.style.justifyContent = "flex-end";
      translateFloatBtnIcon.style.bottom = "20px";
      translateFloatBtnIcon.style.left = "10px";
      selectorBox.style.left = "0";
      if (isRtlLanguage) {
        translateFloatBtn.style.top = "-80px";
        selectorBox.style.top = translateFloatBtn.style.top;
      }
    }
    if (data.selectorPosition === "bottom_left") {
      switcher.style.bottom = data?.positionData.toString() + "%" || "10%";
      switcher.style.right = "auto";
      switcher.style.top = "auto";
      translateFloatBtnText.style.borderRadius = "8px 8px 0px 0px";
      translateFloatBtn.style.justifyContent = "flex-end";
      translateFloatBtnIcon.style.bottom = "20px";
      translateFloatBtnIcon.style.left = "10px";
      selectorBox.style.left = "0";
      if (isRtlLanguage) {
        translateFloatBtn.style.top = "-166px";
        selectorBox.style.top = translateFloatBtn.style.top;
      }
    }
    if (data.selectorPosition === "top_right") {
      switcher.style.top = data?.positionData.toString() + "%" || "10%";
      switcher.style.right = "0";
      switcher.style.bottom = "auto";
      translateFloatBtnText.style.borderRadius = "0px 0px 8px 8px";
      translateFloatBtn.style.justifyContent = "flex-start";
      translateFloatBtnIcon.style.bottom = "20px";
      translateFloatBtnIcon.style.left = "55px";
      selectorBox.style.right = "0";
    }
    if (data.selectorPosition === "bottom_right") {
      switcher.style.bottom = data?.positionData.toString() + "%" || "10%";
      switcher.style.right = "0";
      switcher.style.top = "auto";
      translateFloatBtnText.style.borderRadius = "0px 0px 8px 8px";
      translateFloatBtn.style.justifyContent = "flex-start";
      translateFloatBtnIcon.style.bottom = "20px";
      translateFloatBtnIcon.style.left = "55px";
      selectorBox.style.right = "0";
    }
    if (data.languageSelector || data.currencySelector) {
      mainBox.style.backgroundColor = data.backgroundColor;
      updateDisplayText(
        data.languageSelector,
        data.currencySelector,
        ciwiBlock,
      );
      mainBox.style.display = "flex";
    } else {
      switcher.style.width = "100px";
      translateFloatBtnText.style.backgroundColor = data.backgroundColor;
      translateFloatBtnText.style.display = "block";
    }
    if (
      data.selectorPosition === "top_left" ||
      data.selectorPosition === "bottom_left"
    ) {
      if (isRtlLanguage) {
        selectedLanguageText.style.transform = "rotate(-90deg)";
        selectedLanguageText.style.right = "30px";
        translateFloatBtnIcon.style.right = "10px";
        translateFloatBtnIcon.style.bottom = "-90px";
      }
    }
  }
};
