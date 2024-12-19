// Function to simulate fetching currencies from the backend
async function fetchCurrencies(shop) {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simulated backend data
      const data = {
        data: [
          {
            currencyCode: "EUR",
            symbol: "€",
            exchangeRate: null,
            rounding: null,
            primaryStatus: 1,
          },
          {
            currencyCode: "CNY",
            symbol: "￥",
            exchangeRate: 7.15,
            rounding: "",
            primaryStatus: 0,
          },
          {
            currencyCode: "USD",
            symbol: "$",
            exchangeRate: 2.0,
            rounding: "0.99",
            primaryStatus: 0,
          },
          {
            currencyCode: "CAD",
            symbol: "$",
            exchangeRate: "Auto",
            rounding: "0.99",
            primaryStatus: 0,
          },
        ],
      };
      resolve(data);
    }, 200); // Simulated network delay
  });

  const response = await axios({
    url: `https://springbackendservice-e3hgbjgqafb9cpdh.canadacentral-01.azurewebsites.net/currency/getCurrencyByShopName?shopName=${shop}`,
    method: "GET",
  });

  const res = response.data.response;
  console.log("currency: ", res);
  if (res) {
    const data = res.map((item) => ({
      key: item.id,
      currency: item.currencyName,
      rounding: item.rounding,
      exchangeRate: item.exchangeRate,
      currencyCode: item.currencyCode,
    }));
    return data;
  } else {
    return undefined;
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
function transform(price, exchangeRate, symbol, currencyCode, rounding) {
  const numMatch = price.match(/[\d,]+(?:\.\d+)?/);

  if (!numMatch) {
    return price;
  }

  // Extract numeric part from price
  const numberStr = numMatch[0];

  // Remove commas or other unwanted characters
  const cleanedNumberStr = numberStr.replace(/[,\s']/g, "");
  let number = parseFloat(cleanedNumberStr);

  if (isNaN(number)) {
    return price;
  }

  let rate = exchangeRate;

  if (typeof rate != "number") {
    console.log("the exchangeRate is Auto");
    return price;
  }

  const transformedPrice = customRounding(number * exchangeRate, rounding);

  number = detectNumberFormat(numberStr, transformedPrice, ".", rounding);

  return `${symbol}${number} ${currencyCode}`;
}

// Rounding function
function customRounding(number, rounding) {
  if (!number) {
    return number;
  }
  let roundedNumber = number;
  const integerPart = Math.floor(roundedNumber);

  switch (rounding) {
    case "":
      return roundedNumber;
    case "0":
      return roundedNumber.toFixed(0);
    case "1.00":
      return Math.round(roundedNumber * 100) / 100;
    case "0.99":
      return integerPart + 0.99;
    case "0.95":
      return integerPart + 0.95;
    case "0.75":
      return integerPart + 0.75;
    case "0.5":
      return integerPart + 0.5;
    case "0.25":
      return integerPart + 0.25;
    default:
      return roundedNumber;
  }
}

// Format number with thousands separators
function detectNumberFormat(numberStr, transformedPrice, point, rounding) {
  let number = transformedPrice.toString();
  let [integerPart, decimalPart] = number.split(point);

  if (/^\d{1,3}(?:,\d{3})*(?:\.\d+)?$/.test(numberStr)) {
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  } else if (/^\d{1,3}(?:\.\d{3})*(?:,\d+)?$/.test(numberStr)) {
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  return decimalPart
    ? `${integerPart}.${Number(`0.${decimalPart}`).toFixed(2).slice(2)}`
    : point && rounding != "0"
      ? `${integerPart}${point}00`
      : `${integerPart}`;
}

function rotateArrow(imgId) {
  // 获取指定 ID 的图像元素
  var imgElement = document.getElementById(imgId);
  console.log(imgElement);
  // 检查图像元素是否存在
  if (imgElement) {
    // 使用 CSS transform 属性进行旋转
    imgElement.style.transform = "rotate(180deg)"; // 旋转180度
  } else {
    console.error("Element with ID '" + imgId + "' not found.");
  }
}

// Class to handle form submission and interactions
class CiwiswitcherForm extends HTMLElement {
  constructor() {
    super();
    this.elements = {
      languageInput: this.querySelector('input[name="language_code"]'),
      currencyInput: this.querySelector('input[name="currency_code"]'),
      confirmButton: this.querySelector("#switcher-confirm"),
      closeButton: this.querySelector("#switcher-close"),
      mainBox: this.querySelector("#main-box"),
      languageSwitcher: this.querySelector("#language-switcher"),
      currencySwitcher: this.querySelector("#currency-switcher"),
    };
    this.elements.confirmButton.addEventListener(
      "click",
      this.openSelector.bind(this),
    );
    this.elements.closeButton.addEventListener(
      "click",
      this.toggleSelector.bind(this),
    );
    this.elements.mainBox.addEventListener(
      "click",
      this.toggleSelector.bind(this),
    );
    this.elements.mainBox.addEventListener(
      "blur",
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
  }

  openSelector(event) {
    event.preventDefault();
    const form = this.querySelector("form");
    localStorage.setItem("selectedCurrency", this.elements.currencyInput.value);
    if (form) form.submit();
  }

  toggleSelector(event) {
    event.preventDefault(); // 阻止默认行为
    const box = document.getElementById("selector-box");
    box.style.display = box.style.display === "none" ? "block" : "none";
    console.log(box);
    const arrow = document.getElementById("arrow");
    arrow.innerHTML =
      box.style.display === "block"
        ? '<i class="fas fa-chevron-down"></i>'
        : '<i class="fas fa-chevron-up"></i>';
  }

  updateLanguage(event) {
    const selectedLanguage = event.target.value;
    console.log("selectedLanguage: ", selectedLanguage);
    this.elements.languageInput.value = selectedLanguage;
  }

  rotateLanguageSwitcherFocus() {
    console.log(1);
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
    console.log(2);
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

  rotateCurrencySwitcherFocus() {
    console.log(3);
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
    console.log(4);
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

  updateCurrency(event) {
    rotateArrow("currency-arrow-icon");
    const selectedCurrency = event.target.value;
    console.log("selectedCurrency: ", selectedCurrency);
    this.elements.currencyInput.value = selectedCurrency;
  }
}

// Define the custom element
customElements.define("ciwiswitcher-form", CiwiswitcherForm);

// Page load handling
window.onload = async function () {
  const shop = document.getElementById("queryCiwiId");
  const {data} = await fetchCurrencies(shop.value);
  console.log("data: ", data);

  let value = localStorage.getItem("selectedCurrency");
  const selectedCurrency = data.find(
    (currency) => currency?.currencyCode === value,
  );
  const isValueInCurrencies =
    selectedCurrency && !selectedCurrency.primaryStatus;
  console.log(value, isValueInCurrencies);

  const currencySwitcher = document.getElementById("currency-switcher");
  const currencyInput = document.querySelector('input[name="currency_code"]');

  if (value && isValueInCurrencies) {
    const prices = document.querySelectorAll(".ciwi-money");

    prices.forEach((price) => {
      const priceText = price.innerText;
      const transformedPrice = transform(
        priceText,
        selectedCurrency.exchangeRate,
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
  } else if (data.length) {
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
  } else {
    currencyInput.value = undefined;
    currencySwitcher.value = undefined;
    const option = new Option("undefined", undefined);
    currencySwitcher.add(option);
  }

  updateDisplayText();
  document.getElementById("container").style.display = "block";
};
