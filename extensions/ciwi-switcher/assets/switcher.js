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

async function fetchIpSwitch(shop) {
  const response = await axios({
    url: `https://springbackendservice-e3hgbjgqafb9cpdh.canadacentral-01.azurewebsites.net/IpSwitch/getSwitchId?shopName=${shop}`,
    method: "GET",
  });

  const res = response.data;
  if (res?.response) {
    return res.response;
  } else {
    return false;
  }
}

async function fetchUserCountryInfo(access_key) {
  try {
    const response = await axios.get(
      `http://api.ipapi.com/api/check?access_key=${access_key}`,
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching IP:", error);
    return null;
  }
}

async function fetchLanguageLocaleInfo(locale) {
  // 使用 map 方法遍历数组并替换每个字符串中的 '-' 为 '_'
  const updatedLocales = locale.map((item) => item.replace(/-/g, "_"));
  console.log(updatedLocales);
  try {
    const response = await axios({
      url: `https://springbackendservice-e3hgbjgqafb9cpdh.canadacentral-01.azurewebsites.net/shopify/getImageInfo`,
      method: "POST",
      data: updatedLocales,
    });
    const data = response.data.response;
    console.log(data);

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

async function initializeCurrency(data, shop) {
  let value = localStorage.getItem("selectedCurrency");
  let moneyFormat = document.getElementById("queryMoneyFormat");
  console.log(value);
  const selectedCurrency = data.find(
    (currency) => currency?.currencyCode === value,
  );
  const isValueInCurrencies =
    selectedCurrency && !selectedCurrency.primaryStatus;

  // 获取新的选择器元素
  const customSelector = document.getElementById("currency-switcher-container");
  const selectedOption = customSelector?.querySelector(".selected-option");
  const optionsList = customSelector?.querySelector(".options-list");
  const currencyInput = document.querySelector('input[name="currency_code"]');

  const regex = /{{(.*?)}}/;
  const match = moneyFormat.value.match(regex);

  if (match) {
    moneyFormat = match[1];
  }

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
        price.innerText = transformedPrice;
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
          const form = document.querySelector("ciwiswitcher-form");
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

    updateDisplayText();
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
          const form = document.querySelector("ciwiswitcher-form");
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
    updateDisplayText();
  }
}

// Function to update the display text
function updateDisplayText() {
  // 获取货币选择器中当前选中的值
  const currencySelector = document.querySelector(
    '.custom-selector[data-type="currency"]',
  );
  const selectedCurrencyText =
    currencySelector?.querySelector(".selected-text")?.textContent ||
    "undefined";

  // 获取语言选择器中当前选中的值
  const languageSelector = document.querySelector(
    '.custom-selector[data-type="language"]',
  );
  const selectedLanguageText =
    languageSelector?.querySelector(".selected-text")?.textContent || "";

  // 更新显示文本
  const displayTextElement = document.getElementById("display-text");
  if (displayTextElement) {
    // 如果已经有语言文本，添加货币文本
    if (selectedLanguageText) {
      displayTextElement.textContent = `${selectedLanguageText} / ${selectedCurrencyText}`;
    } else {
      // 如果只有货币文本
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

  if (!formattedPrice || exchangeRate == "Auto") {
    return price;
  }

  let number = convertToNumberFromMoneyFormat(moneyFormat, formattedPrice);

  // Remove commas or other unwanted characters
  number = (number * exchangeRate).toFixed(2);

  const transformedPrice = customRounding(number, rounding);

  number = detectNumberFormat(moneyFormat, transformedPrice, rounding);

  return `${symbol}${number} ${currencyCode}`;
}

function convertToNumberFromMoneyFormat(moneyFormat, formattedPrice) {
  let number = formattedPrice;

  switch (moneyFormat) {
    case "amount":
      number = number.replace(/,/g, "");
      return parseFloat(number).toFixed(2);

    case "amount_no_decimals":
      return parseFloat(number.replace(/,/g, "")).toFixed(2);

    case "amount_with_comma_separator":
      // 处理数字为 1.134,65 格式：首先替换逗号为点，小数点为逗号
      number = number.replace(/\./g, "").replace(",", ".");
      return parseFloat(number).toFixed(2);

    case "amount_no_decimals_with_comma_separator":
      // 同上，去掉逗号，小数点没有
      return parseFloat(number.replace(/\./g, "").replace(",", "")).toFixed(2);

    case "amount_with_apostrophe_separator":
      // 处理 1'134.65 格式：去掉撇号
      number = number.replace(/'/g, "");
      return parseFloat(number).toFixed(2);

    case "amount_no_decimals_with_space_separator":
      // 处理 1 135 格式：去掉空格
      number = number.replace(/\s/g, "");
      return parseFloat(number).toFixed(2);

    case "amount_with_space_separator":
      // 处理 1 134,65 格式：去掉空格，小数点用逗号分隔
      number = number.replace(/\s/g, "").replace(",", ".");
      return parseFloat(number).toFixed(2);

    case "amount_with_period_and_space_separator":
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
    this.elements = {
      ciwiContainer: this.querySelector("#ciwi-container"),
      selectorBox: this.querySelector("#selector-box"),
      languageInput: this.querySelector('input[name="language_code"]'),
      currencyInput: this.querySelector('input[name="currency_code"]'),
      countryInput: this.querySelector('input[name="country_code"]'),
      confirmButton: this.querySelector("#switcher-confirm"),
      mainBox: this.querySelector("#main-box"),
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
    const option = event.currentTarget;
    const value = option.dataset.value;
    const text = option.querySelector(".option-text")?.textContent;
    const flag = option.querySelector(".country-flag")?.src;
    const selectorType = option.closest(".custom-selector")?.dataset.type; // 获取选择器类型

    console.log("Option clicked:", {
      option,
      value,
      text,
      flag,
      selectorType,
      elements: this.elements,
    });

    console.log(selectedCurrencyText);

    if (selectorType === "language") {
      // 更新选中项显示
      if (this.elements.selectedFlag) {
        this.elements.selectedFlag.src = flag;
      }
      if (this.elements.selectedLanguageText) {
        this.elements.selectedLanguageText.textContent = text;
      }
      // 更新选中状态
      languageOptions?.forEach((opt) => opt.classList.remove("selected"));
      option.classList.add("selected");
      this.elements.languageInput.value = value;
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
    const displayText = document.getElementById("display-text");
    if (displayText) {
      const selectedLanguage =
        this.elements.languageSelector?.querySelector(".selected-text")
          ?.textContent || "";
      const selectedCurrency =
        this.elements.currencySelector?.querySelector(".selected-text")
          ?.textContent || "";

      if (selectedLanguage && selectedCurrency) {
        displayText.textContent = `${selectedLanguage} / ${selectedCurrency}`;
      } else if (selectedLanguage) {
        displayText.textContent = selectedLanguage;
      } else if (selectedCurrency) {
        displayText.textContent = selectedCurrency;
      }
    }

    // 显示 main-box
    const mainBox = document.getElementById("main-box");
    if (mainBox) {
      mainBox.style.display = "block";
    }

    // 移除移动端展开状态
    if (window.innerWidth <= 768) {
      this.elements.ciwiContainer.classList.remove("expanded");
    }

    // 重置箭头方向
    this.rotateArrow("mainbox-arrow-icon", 0);

    // 关闭所有选择器
    this.closeAllSelectors();
  }

  handleOutsideClick(event) {
    if (!this.elements.ciwiContainer.contains(event.target)) {
      if (window.innerWidth <= 768) {
        const mainBox = document.getElementById("main-box");
        this.elements.ciwiContainer.classList.remove("expanded");
        mainBox.style.display = "block";
      }
      this.elements.selectorBox.style.display = "none";
      this.rotateArrow("mainbox-arrow-icon", 0);
    }

    if (
      this.elements.selector &&
      !this.elements.selector.contains(event.target)
    ) {
      this.elements.selector.classList.remove("open");
    }
  }

  submitForm(event) {
    event.preventDefault();
    const form = this.querySelector("form");
    localStorage.setItem("selectedLanguage", this.elements.languageInput.value);
    localStorage.setItem("selectedCurrency", this.elements.currencyInput.value);
    // 提交表单
    if (form) form.submit();
  }

  toggleSelector(event) {
    event.preventDefault();
    const box = document.getElementById("selector-box");
    const isVisible = box.style.display !== "none";
    box.style.display = isVisible ? "none" : "block";

    // 移动端适配
    if (window.innerWidth <= 768) {
      const mainBox = document.getElementById("main-box");
      mainBox.style.display = isVisible ? "block" : "none";
      this.elements.ciwiContainer.classList.toggle("expanded", !isVisible);
    }

    // 旋转箭头
    this.rotateArrow("mainbox-arrow-icon", isVisible ? 0 : 180);
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
    const arrow = document.getElementById(elementId);
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
  const shop = document.getElementById("queryCiwiId");
  shop.remove();
  const IpOpen = await fetchIpSwitch(shop.value);
  //获取所有语言代码
  const languageCodes = Array.from(
    document.querySelectorAll(".option-item[data-type='language']"),
  ).map((option) => option.dataset.value);
  console.log(languageCodes);

  const languageLocaleData = await fetchLanguageLocaleInfo(languageCodes);
  console.log(languageLocaleData);

  const languageOptions = document.querySelectorAll(
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
  const selectedOption = document.querySelector(
    ".selector-header[data-type='language'] .selected-option",
  );
  if (selectedOption) {
    const currentLangCode = document.querySelector(
      'input[name="language_code"]',
    ).value;
    const countryCode = languageLocaleData[currentLangCode]?.countries[0];

    if (countryCode) {
      const flagImg = document.createElement("img");
      flagImg.className = "country-flag";
      flagImg.src = countryCode;
      flagImg.alt = "";

      selectedOption.insertBefore(flagImg, selectedOption.firstChild);
    }
  }

  if (IpOpen) {
    const iptoken = document.querySelector('span[name="iptoken"]');
    const iptokenValue = iptoken.textContent;
    if (iptokenValue) iptoken.remove();
    const storedLanguage = localStorage.getItem("selectedLanguage");
    const storedCountry = localStorage.getItem("selectedCountry");
    const languageInput = document.querySelector('input[name="language_code"]');
    const language = languageInput.value;
    const countryInput = document.querySelector('input[name="country_code"]');
    const country = countryInput.value;
    const availableLanguages = Array.from(
      document.querySelectorAll("#language-switcher option"),
    ).map((option) => option.value);
    const availableCountries = Array.from(
      document.querySelectorAll('ul[role="list"] a[data-value]'),
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
      // 获取匹配的语言或默认为英语
      const detectedLanguage = browserLanguage || "en";
      localStorage.setItem("selectedLanguage", detectedLanguage);
      if (
        languageInput.value !== detectedLanguage &&
        availableLanguages.includes(detectedLanguage)
      ) {
        languageInput.value = detectedLanguage;
      }
    }

    if (storedCountry) {
      if (
        countryInput.value !== storedCountry &&
        availableCountries.includes(storedCountry)
      ) {
        countryInput.value = storedCountry;
      }
    } else {
      const IpData = await fetchUserCountryInfo(iptokenValue);
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
      }
    }
    const htmlElement = document.documentElement; // 获取 <html> 元素
    const isInThemeEditor = htmlElement.classList.contains(
      "shopify-design-mode",
    );
    if (
      (countryInput.value !== country || languageInput.value !== language) &&
      !isInThemeEditor
    ) {
      updateLocalization({
        country: countryInput.value,
        language: languageInput.value,
      });
    }
  }

  // 在页面加载时执行初始化
  const data = await fetchCurrencies(shop.value);
  console.log(data);

  if (data) {
    await initializeCurrency(data, shop);
  }
};
