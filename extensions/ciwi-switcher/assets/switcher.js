// Function to simulate fetching currencies from the backend
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

async function initializeCurrency(data, shop) {
  let value = localStorage.getItem("selectedCurrency");
  let moneyFormat = document.getElementById("queryMoneyFormat");
  const selectedCurrency = data.find(
    (currency) => currency?.currencyCode === value,
  );
  const isValueInCurrencies =
    selectedCurrency && !selectedCurrency.primaryStatus;

  const currencySwitcher = document.getElementById("currency-switcher");
  const currencyTitleLabel = document.getElementById("currency-title");
  const currencyInput = document.querySelector('input[name="currency_code"]');

  const regex = /{{(.*?)}}/;
  const match = moneyFormat.value.match(regex);

  if (match) {
    moneyFormat = match[1];
  }

  if (isValueInCurrencies) {
    currencySwitcher.style.display = "block";
    currencyTitleLabel.style.display = "block";
    let rate = selectedCurrency.exchangeRate;
    if (selectedCurrency.exchangeRate == "Auto") {
      rate = await fetchAutoRate(shop.value, selectedCurrency.currencyCode);
      if (typeof rate != "number") {
        rate = 1;
      }
    }
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
    currencyInput.value = value;
    currencySwitcher.value = value;

    data.forEach((currency) => {
      const option = new Option(
        `${currency.currencyCode}(${currency.symbol})`,
        currency.currencyCode,
      );
      if (currency.currencyCode == value) {
        option.selected = true;
      }
      currencySwitcher.add(option);
    });
    updateDisplayText();
  } else if (data.length) {
    currencySwitcher.style.display = "block";
    currencyTitleLabel.style.display = "block";
    currencyInput.value = data[0];
    currencySwitcher.value = data[0]?.currencyCode;
    data.forEach((currency) => {
      const option = new Option(
        `${currency.currencyCode}(${currency.symbol})`,
        currency.currencyCode,
      );
      if (currency.primaryStatus) {
        option.selected = true;
      }
      currencySwitcher.add(option);
    });
    updateDisplayText();
  }
}

// Function to update the display text
function updateDisplayText() {
  const currency =
    document.getElementById("currency-switcher").selectedOptions[0]?.value ||
    "undefined";
  const displayTextElement = document.getElementById("display-text");
  displayTextElement.textContent += ` / ${currency}`; // Append currency to display text
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

// Class to handle form submission and interactions
class CiwiswitcherForm extends HTMLElement {
  constructor() {
    super();
    this.elements = {
      ciwiContainer: this.querySelector("#ciwi-container"),
      selectorBox: this.querySelector("#selector-box"),
      languageInput: this.querySelector('input[name="language_code"]'),
      currencyInput: this.querySelector('input[name="currency_code"]'),
      marketInput: this.querySelector(
        'input[name="locale_code"], input[name="country_code"]',
      ),
      confirmButton: this.querySelector("#switcher-confirm"),
      closeButton: this.querySelector("#switcher-close"),
      mainBox: this.querySelector("#main-box"),
      languageSwitcher: this.querySelector("#language-switcher"),
      currencySwitcher: this.querySelector("#currency-switcher"),
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
    this.elements.closeButton?.addEventListener(
      "click",
      this.toggleSelector.bind(this),
    );
    this.elements.mainBox?.addEventListener(
      "click",
      this.toggleSelector.bind(this),
    );

    // 语言切换器事件
    this.elements.languageSwitcher?.addEventListener(
      "change",
      this.updateLanguage.bind(this),
    );
    this.elements.languageSwitcher?.addEventListener("focus", () =>
      this.rotateArrow("language-arrow-icon", 180),
    );
    this.elements.languageSwitcher?.addEventListener("blur", () =>
      this.rotateArrow("language-arrow-icon", 0),
    );

    // 货币切换器事件
    this.elements.currencySwitcher?.addEventListener(
      "change",
      this.updateCurrency.bind(this),
    );
    this.elements.currencySwitcher?.addEventListener("focus", () =>
      this.rotateArrow("currency-arrow-icon", 180),
    );
    this.elements.currencySwitcher?.addEventListener("blur", () =>
      this.rotateArrow("currency-arrow-icon", 0),
    );

    // 市场选择事件
    this.querySelectorAll("a[data-value]").forEach((item) => {
      item.addEventListener("click", this.handleMarketSelection.bind(this));
    });

    // 点击外部关闭
    document.addEventListener("click", this.handleOutsideClick.bind(this));
  }

  submitForm(event) {
    event.preventDefault();
    const form = this.querySelector("form");
    // 保存选择的值到 localStorage
    if (this.elements.currencyInput?.value) {
      localStorage.setItem(
        "selectedCurrency",
        this.elements.currencyInput.value,
      );
    }
    if (this.elements.languageInput?.value) {
      localStorage.setItem(
        "selectedLanguage",
        this.elements.languageInput.value,
      );
    }
    // 提交表单
    if (form) form.submit();
  }

  handleMarketSelection(event) {
    event.preventDefault();
    const marketValue = event.currentTarget.dataset.value;
    if (this.elements.marketInput && marketValue) {
      this.elements.marketInput.value = marketValue;
      // 自动触发表单提交
      this.submitForm(event);
    }
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
  }
}

// Define the custom element
customElements.define("ciwiswitcher-form", CiwiswitcherForm);

// Page load handling
window.onload = async function () {
  const iptoken = document.querySelector('input[name="iptoken"]');
  const iptokenValue = iptoken.value;
  if (iptokenValue) iptoken.remove(); // 移除DOM元素
  const storedLanguage = localStorage.getItem("selectedLanguage");
  const storedCountry = localStorage.getItem("selectedCountry");
  const currentPath = window.location.pathname;
  const currentLanguage = currentPath.split("/")[1];
  const languageInput = document.querySelector('input[name="language_code"]');
  const language = languageInput.value;
  const countryInput = document.querySelector('input[name="country_code"]');
  const country = countryInput.value;
  const availableLanguages = Array.from(
    document.querySelectorAll("#language-switcher option"),
  ).map((option) => option.value);

  if (availableLanguages.includes(languageInput.value)) {
    if (storedLanguage) {
      if (storedLanguage !== currentLanguage) {
        // 存储到 localStorage
        if (languageInput.value !== storedLanguage) {
          languageInput.value = storedLanguage;
        }
      }
    } else {
      const browserLanguage = navigator.language;
      // 获取匹配的语言或默认为英语
      const detectedLanguage = browserLanguage || "en";
      localStorage.setItem("selectedLanguage", detectedLanguage);
      if (languageInput.value !== detectedLanguage) {
        languageInput.value = detectedLanguage;
      }
    }
  }
  if (storedCountry) {
    if (countryInput.value !== storedCountry) {
      countryInput.value = storedCountry;
    }
  } else {
    const IpData = await fetchUserCountryInfo(iptokenValue);
    if (IpData?.country_code) {
      if (countryInput.value !== IpData.country_code) {
        countryInput.value = IpData.country_code;
        localStorage.setItem("selectedCountry", IpData.country_code);
        console.log(
          "若市场跳转不正确则清除缓存并手动设置selectedCountry字段(If the market jump is incorrect, clear the cache and manually set the selectedCountry field)",
        );
      }
    }
  }
  const htmlElement = document.documentElement; // 获取 <html> 元素
  const isInThemeEditor = htmlElement.classList.contains("shopify-design-mode");
  if (
    (countryInput.value !== country || languageInput.value !== language) &&
    !isInThemeEditor
  ) {
    const ciwiSwitcherForm = document.querySelector("ciwiswitcher-form");
    if (ciwiSwitcherForm) {
      const mockEvent = new Event("submit", { cancelable: true });
      ciwiSwitcherForm.submitForm(mockEvent);
    }
  }

  // 在页面加载时执行初始化
  const shop = document.getElementById("queryCiwiId");
  const data = await fetchCurrencies(shop.value);

  if (data) {
    await initializeCurrency(data, shop);
  }
};
