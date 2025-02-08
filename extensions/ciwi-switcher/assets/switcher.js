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
    console.log("fetchCurrencies: ", data);
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

async function fetchUserIP() {
  try {
    const response = await axios.get("https://api.ipify.org?format=json");
    return response.data.ip;
  } catch (error) {
    console.error("Error fetching IP:", error);
    return null;
  }
}

// 初始化语言函数
function initializeLanguage() {
  const storedLanguage = localStorage.getItem("selectedLanguage");
  const currentPath = window.location.pathname;
  const currentLanguage = currentPath.split("/")[1];

  try {
    if (storedLanguage && storedLanguage !== currentLanguage) {
      // 获取浏览器语言并转换为基础语言代码
      const browserLanguage = navigator.language.split("-")[0].toLowerCase();
      console.log("browserLanguage: ", browserLanguage);

      // 获取匹配的语言或默认为英语
      const detectedLanguage = browserLanguage || "en";

      // 存储到 localStorage
      localStorage.setItem("selectedLanguage", detectedLanguage);

      // 如果当前路径不包含语言前缀，则进行重定向
      window.location.replace(`/${detectedLanguage}`);

      return detectedLanguage;
    }
  } catch (error) {
    console.error("Language initialization error:", error);
    // 发生错误时返回默认语言
    const defaultLanguage = "en";
    localStorage.setItem("selectedLanguage", defaultLanguage);
    // 错误情况下也进行重定向
    window.location.replace(`/${defaultLanguage}`);
    return defaultLanguage;
  }
}

async function initializeCurrency(data, shop, value) {
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

  console.log(data);

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

// Class to handle form submission and interactions
class CiwiswitcherForm extends HTMLElement {
  constructor() {
    super();
    this.elements = {
      ciwiContainer: this.querySelector("#ciwi-container"),
      selectorBox: this.querySelector("#selector-box"),
      languageInput: this.querySelector('input[name="language_code"]'),
      currencyInput: this.querySelector('input[name="currency_code"]'),
      confirmButton: this.querySelector("#switcher-confirm"),
      closeButton: this.querySelector("#switcher-close"),
      mainBox: this.querySelector("#main-box"),
      languageSwitcher: this.querySelector("#language-switcher"),
      currencySwitcher: this.querySelector("#currency-switcher"),
    };
    this.elements.selectorBox.addEventListener("click", function (event) {
      event.stopPropagation();
    });
    this.elements.confirmButton.addEventListener(
      "click",
      this.submitForm.bind(this),
    );
    this.elements.closeButton.addEventListener(
      "click",
      this.toggleSelector.bind(this),
    );
    this.elements.mainBox.addEventListener(
      "click",
      this.toggleSelector.bind(this),
    );
    this.elements.languageSwitcher.addEventListener(
      "change",
      this.updateLanguage.bind(this),
    );
    this.elements.languageSwitcher.addEventListener(
      "focus",
      this.rotateLanguageSwitcherFocus.bind(this),
    );
    this.elements.languageSwitcher.addEventListener(
      "blur",
      this.rotateLanguageSwitcherBlur.bind(this),
    );
    this.elements.currencySwitcher.addEventListener(
      "change",
      this.updateCurrency.bind(this),
    );
    this.elements.currencySwitcher.addEventListener(
      "focus",
      this.rotateCurrencySwitcherFocus.bind(this),
    );
    this.elements.currencySwitcher.addEventListener(
      "blur",
      this.rotateCurrencySwitcherBlur.bind(this),
    );
    document.addEventListener("click", this.handleOutsideClick.bind(this));
  }

  submitForm(event) {
    event.preventDefault();
    const form = this.querySelector("form");
    localStorage.setItem("selectedCurrency", this.elements.currencyInput.value);
    if (form) form.submit();
  }

  toggleSelector(event) {
    event.preventDefault(); // 阻止默认行为
    const box = document.getElementById("selector-box");
    box.style.display = box.style.display === "none" ? "block" : "none";
    if (window.innerWidth <= 768) {
      const mainBox = document.getElementById("main-box");

      // 切换 mainBox 的显示状态
      mainBox.style.display =
        mainBox.style.display === "none" ? "block" : "none";

      // 切换 ciwiContainer 的 expanded 类
      this.elements.ciwiContainer.classList.toggle("expanded");
    }
    const arrow = document.getElementById("mainbox-arrow-icon");
    box.style.display === "block"
      ? (arrow.style.transform = "rotate(180deg)")
      : (arrow.style.transform = "rotate(0deg)");
  }

  updateLanguage(event) {
    const selectedLanguage = event.target.value;
    this.elements.languageInput.value = selectedLanguage;
  }

  rotateLanguageSwitcherFocus() {
    // 获取指定 ID 的图像元素
    var imgElement = document.getElementById("language-arrow-icon");
    // 检查图像元素是否存在
    if (imgElement) {
      // 使用 CSS transform 属性进行旋转
      imgElement.style.transform = "rotate(180deg)"; // 旋转180度
    } else {
      console.error("Element with ID language-arrow-icon not found.");
    }
  }

  rotateLanguageSwitcherBlur() {
    // 获取指定 ID 的图像元素
    var imgElement = document.getElementById("language-arrow-icon");
    // 检查图像元素是否存在
    if (imgElement) {
      // 使用 CSS transform 属性进行旋转
      imgElement.style.transform = "rotate(0deg)"; // 旋转180度
    } else {
      console.error("Element with ID language-arrow-icon not found.");
    }
  }

  updateCurrency(event) {
    const selectedCurrency = event.target.value;
    this.elements.currencyInput.value = selectedCurrency;
  }

  rotateCurrencySwitcherFocus() {
    // 获取指定 ID 的图像元素
    var imgElement = document.getElementById("currency-arrow-icon");
    // 检查图像元素是否存在
    if (imgElement) {
      // 使用 CSS transform 属性进行旋转
      imgElement.style.transform = "rotate(180deg)"; // 旋转180度
    } else {
      console.error("Element with ID currency-arrow-icon not found.");
    }
  }

  rotateCurrencySwitcherBlur() {
    // 获取指定 ID 的图像元素
    var imgElement = document.getElementById("currency-arrow-icon");
    // 检查图像元素是否存在
    if (imgElement) {
      // 使用 CSS transform 属性进行旋转
      imgElement.style.transform = "rotate(0deg)"; // 旋转180度
    } else {
      console.error("Element with ID currency-arrow-icon not found.");
    }
  }

  handleOutsideClick(event) {
    if (!this.elements.ciwiContainer.contains(event.target)) {
      if (window.innerWidth <= 768) {
        const mainBox = document.getElementById("main-box");
        this.elements.ciwiContainer.classList.remove("expanded");
        mainBox.style.display = mainBox.style.display = "block";
      }
      this.elements.selectorBox.style.display = "none";
      const arrow = document.getElementById("mainbox-arrow-icon");
      arrow.style.transform = "rotate(0deg)";
    }
  }
}

// Define the custom element
customElements.define("ciwiswitcher-form", CiwiswitcherForm);

// Page load handling
window.onload = async function () {
  // 在页面加载时执行初始化
  initializeLanguage();
  const shop = document.getElementById("queryCiwiId");

  let value = localStorage.getItem("selectedCurrency");
  const data = await fetchCurrencies(shop.value);

  if (value && data) {
    await initializeCurrency(data, shop, value);
  } else {
    // const userIP = await fetchUserIP();
    // console.log("User IP:", userIP);
  }
};
