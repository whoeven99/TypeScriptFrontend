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
            default: 1,
          },
          {
            currencyCode: "CNY",
            symbol: "￥",
            exchangeRate: 7.15,
            rounding: "",
            default: 1,
          },
          {
            currencyCode: "USD",
            symbol: "$",
            exchangeRate: 2.0,
            rounding: "0.99",
            default: 1,
          },
        ],
      };
      resolve(data);
    }, 200); // Simulated network delay
  });

  /* Unused backend request
    const response = await axios({
      url: `https://springbackendservice-e3hgbjgqafb9cpdh.canadacentral-01.azurewebsites.net/currency/getCurrencyByShopName`,
      method: "POST",
      data: {
        shopName: shop,
      },
    });
  
    const res = response.data.response;
    console.log('currency: ', res);
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
    */
}

// Function to update the display text
function updateDisplayText() {
  const currency =
    document.getElementById("currency-switcher").selectedOptions[0].value;
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

  const transformedPrice = customRounding(number * exchangeRate, rounding);

  number = detectNumberFormat(numberStr, transformedPrice, ".", rounding);

  return `${symbol}${number} ${currencyCode}`;
}

// Rounding function
function customRounding(number, rounding) {
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

// Class to handle form submission and interactions
class CiwiswitcherForm extends HTMLElement {
  constructor() {
    super();
    this.elements = {
      languageInput: this.querySelector('input[name="language_code"]'),
      currencyInput: this.querySelector('input[name="currency_code"]'),
      confirmButton: this.querySelector("#switcher-confirm"),
      closeButton: this.querySelector("#switcher-close"),
      languageSwitcher: this.querySelector("#language-switcher"),
      currencySwitcher: this.querySelector("#currency-switcher"),
    };
    this.elements.confirmButton.addEventListener(
      "click",
      this.openSelector.bind(this),
    );
    this.elements.closeButton.addEventListener(
      "click",
      this.closeSelector.bind(this),
    );
    this.elements.languageSwitcher.addEventListener(
      "change",
      this.updateLanguage.bind(this),
    );
    this.elements.currencySwitcher.addEventListener(
      "change",
      this.updateCurrency.bind(this),
    );
  }

  openSelector(event) {
    event.preventDefault();
    const form = this.querySelector("form");
    localStorage.setItem("selectedCurrency", this.elements.currencyInput.value);
    if (form) form.submit();
  }

  closeSelector() {
    event.preventDefault();  // 阻止默认行为
    const box = document.getElementById('selector-box');
    box.style.display = box.style.display === 'none' ? 'block' : 'none';
    console.log(box);
    const arrow = document.getElementById('arrow');
    arrow.innerHTML =
      box.style.display === 'block' ? '<i class="fas fa-chevron-down"></i>' : '<i class="fas fa-chevron-up"></i>';
  }

  updateLanguage(event) {
    const selectedLanguage = event.target.value;
    console.log("selectedLanguage: ", selectedLanguage);
    this.elements.languageInput.value = selectedLanguage;
  }

  updateCurrency(event) {
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
  const { data } = await fetchCurrencies(shop.value);
  console.log("data: ", data);

  let value = localStorage.getItem("selectedCurrency");
  const isValueInCurrencies = data.find(
    (currency) => currency.currencyCode === value,
  );
  console.log(value, isValueInCurrencies);

  const currencySwitcher = document.getElementById("currency-switcher");
  const currencyInput = document.querySelector('input[name="currency_code"]');

  if (value && isValueInCurrencies) {
    const prices = document.querySelectorAll(".ciwi-money");

    prices.forEach((price) => {
      const priceText = price.innerText;
      const transformedPrice = transform(
        priceText,
        isValueInCurrencies.exchangeRate,
        isValueInCurrencies.symbol,
        isValueInCurrencies.currencyCode,
        isValueInCurrencies.rounding,
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
  } else {
    currencyInput.value = data[0];
    currencySwitcher.value = data[0].currencyCode;
    data.forEach((currency) => {
      const option = new Option(
        `${currency.currencyCode}(${currency.symbol})`,
        currency.currencyCode,
      );
      currencySwitcher.add(option);
    });
  }

  updateDisplayText();
  document.getElementById("container").style.display = "block";
};
