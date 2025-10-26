// utils.js
/**
 * 包含价格转换、解析和格式化的工具函数
 */

export function convertToNumberFromMoneyFormat(moneyFormat, formattedPrice) {
  let number = formattedPrice;
  switch (true) {
    case moneyFormat.includes("amount_with_comma_separator"):
      number = number.replace(/\./g, "").replace(",", ".");
      return parseFloat(number).toFixed(2);
    case moneyFormat.includes("amount_no_decimals_with_comma_separator"):
      return parseFloat(number.replace(/\./g, "").replace(",", "")).toFixed(2);
    case moneyFormat.includes("amount_with_apostrophe_separator"):
      number = number.replace(/'/g, "");
      return parseFloat(number).toFixed(2);
    case moneyFormat.includes("amount_no_decimals_with_space_separator"):
      return parseFloat(number.replace(/\s/g, "")).toFixed(2);
    case moneyFormat.includes("amount_with_space_separator"):
      number = number.replace(/\s/g, "").replace(",", ".");
      return parseFloat(number).toFixed(2);
    case moneyFormat.includes("amount_with_period_and_space_separator"):
      number = number.replace(/\s/g, "");
      return parseFloat(number).toFixed(2);
    case moneyFormat.includes("amount_no_decimals"):
      return parseFloat(number.replace(/,/g, "")).toFixed(2);
    case moneyFormat.includes("amount"):
      number = number.replace(/,/g, "");
      return parseFloat(number).toFixed(2);
    default:
      number = number.replace(/\./g, "").replace(",", ".");
      return parseFloat(number).toFixed(2);
  }
}

export function customRounding(number, rounding) {
  if (parseFloat(number) === 0 && rounding != "0") {
    return number;
  }
  const integerPart = Math.floor(number);
  switch (rounding) {
    case "":
      return number;
    case "0":
      return parseFloat(number).toFixed(0);
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

function formatWithComma(integerPart, decimalPart) {
  integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
}
function formatWithCommaAndCommaDecimal(integerPart, decimalPart) {
  integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return decimalPart ? `${integerPart},${decimalPart}` : integerPart;
}
function formatWithApostrophe(integerPart, decimalPart) {
  integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  return decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
}
function formatWithSpace(integerPart, decimalPart) {
  integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return decimalPart ? `${integerPart},${decimalPart}` : integerPart;
}
function formatWithSpaceAndPeriod(integerPart, decimalPart) {
  integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
}

export function detectNumberFormat(moneyFormat, transformedPrice, rounding) {
  let number = transformedPrice.toString();
  let [integerPart, decimalPart = "00"] = number.split(".");
  // 将 decimalPart 固定为两位
  decimalPart = Number(`0.${decimalPart}`).toFixed(2).slice(2);
  // 当 rounding === "0" 时需要特殊处理（原逻辑保留）
  if (rounding == "0") {
    switch (moneyFormat) {
      case "amount":
      case "amount_no_decimals":
        return formatWithComma(integerPart, "");
      case "amount_with_comma_separator":
      case "amount_no_decimals_with_comma_separator":
        return formatWithCommaAndCommaDecimal(integerPart, "");
      case "amount_with_apostrophe_separator":
        return formatWithApostrophe(integerPart, "");
      case "amount_no_decimals_with_space_separator":
        return formatWithSpace(integerPart, "");
      case "amount_with_space_separator":
        return formatWithSpace(integerPart, "");
      case "amount_with_period_and_space_separator":
        return formatWithSpaceAndPeriod(integerPart, "");
      default:
        return transformedPrice;
    }
  } else {
    switch (moneyFormat) {
      case "amount":
        return formatWithComma(integerPart, decimalPart);
      case "amount_no_decimals":
        return formatWithComma(integerPart, "");
      case "amount_with_comma_separator":
        return formatWithCommaAndCommaDecimal(integerPart, decimalPart);
      case "amount_no_decimals_with_comma_separator":
        return formatWithCommaAndCommaDecimal(integerPart, "");
      case "amount_with_apostrophe_separator":
        return formatWithApostrophe(integerPart, decimalPart);
      case "amount_no_decimals_with_space_separator":
        return formatWithSpace(integerPart, "");
      case "amount_with_space_separator":
        return formatWithSpace(integerPart, decimalPart);
      case "amount_with_period_and_space_separator":
        return formatWithSpaceAndPeriod(integerPart, decimalPart);
      default:
        return transformedPrice;
    }
  }
}

/**
 * 转换单个 price DOM 节点（避免每次遍历全局 NodeList）
 */
export function transformSinglePriceNode(
  node,
  rate,
  moneyFormat,
  selectedCurrency,
) {
  if (!node || !node.innerText) return;
  const priceText = node.innerText;
  const formatted = priceText.replace(/[^0-9,. ]/g, "").trim();
  if (
    !formatted ||
    rate === "Auto" ||
    priceText.includes(selectedCurrency.currencyCode)
  )
    return;
  let number = convertToNumberFromMoneyFormat(moneyFormat, formatted);
  number = (number * rate).toFixed(2);
  const transformedPrice = customRounding(number, selectedCurrency.rounding);
  const detected = detectNumberFormat(
    moneyFormat,
    transformedPrice,
    selectedCurrency.rounding,
  );
  const currencyConfig = window.currencyFormatConfig
    ? window.currencyFormatConfig[selectedCurrency.currencyCode]
    : null;
  const symbol = selectedCurrency.symbol || "";
  const symbolPosition = currencyConfig
    ? currencyConfig.symbol_position
    : "front";
  if (symbolPosition === "back") {
    node.innerHTML = `${detected}${symbol} <span class="currency-code">${selectedCurrency.currencyCode}</span>`;
  } else {
    node.innerHTML = `${symbol}${detected} <span class="currency-code">${selectedCurrency.currencyCode}</span>`;
  }
}

export function transformPrices({ rate, moneyFormat, selectedCurrency }) {
  const pricesDoc = document.querySelectorAll(".ciwi-money");

  pricesDoc.forEach((price) => {
    const transformedPrice = transformSinglePriceNode(
      price,
      rate,
      moneyFormat,
      selectedCurrency,
    );

    if (transformedPrice) {
      price.innerHTML = transformedPrice;
    }
  });
}

/**
 * 跳转页面
 */
export function updateLocalization({ country, language }) {
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
