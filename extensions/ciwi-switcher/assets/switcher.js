async function FrontEndPrinting({
  blockId,
  shop,
  ip,
  languageCode,
  langInclude,
  countryCode,
  counInclude,
  currencyCode,
  checkUserIpCostTime,
  fetchUserCountryInfoCostTime,
  status,
  error,
}) {
  try {
    const response = await axios({
      url: `${switchUrl(blockId)}/frontEndPrinting`,
      method: "POST",
      data: {
        data: `状态码: ${status}, ${shop} 客户ip定位: ${ip}, 语言代码: ${languageCode}, ${!langInclude ? "不" : ""}包含该语言, 货币代码: ${currencyCode}, 国家代码: ${countryCode}, ${!counInclude ? "不" : ""}包含该市场, checkUserIp接口花费时间: ${checkUserIpCostTime}ms, ipapi接口花费时间: ${fetchUserCountryInfoCostTime}ms${error ? `, ipapi 存在错误返回: ${error}` : ""}`,
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error FrontEndPrinting:", error);
  }
}

async function CrawlerDDetectionReport({ shop, blockId, ua, reason }) {
  try {
    const response = await axios({
      url: `${switchUrl(blockId)}/frontEndPrinting`,
      method: "POST",
      data: {
        data: `${shop} 检测到爬虫 ${ua}, 原因: ${reason}`,
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error FrontEndPrinting:", error);
  }
}

async function GetProductImageData({
  blockId,
  shopName,
  productId,
  languageCode,
}) {
  try {
    const response = await axios({
      url: `${switchUrl(blockId)}/picture/getPictureDataByShopNameAndResourceIdAndPictureId?shopName=${shopName}`,
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

async function fetchSwitcherConfig({ blockId, shop }) {
  const response = await axios({
    url: `${switchUrl(blockId)}/widgetConfigurations/getData`,
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

async function fetchCurrencies({ blockId, shop }) {
  try {
    const response = await axios({
      url: `${switchUrl(blockId)}/currency/getCurrencyByShopName?shopName=${shop}`,
      method: "GET",
    });

    if (response.data?.success) {
      const res = response.data.response;
      const data = res.map((item) => ({
        key: item?.id,
        symbol: item?.symbol || "$",
        rounding: item?.rounding,
        exchangeRate: item?.exchangeRate,
        currencyCode: item?.currencyCode,
        primaryStatus: item?.primaryStatus,
      }));
      return data;
    } else {
      return [];
    }
  } catch (error) {
    console.error("Error fetchCurrencies:", error);
    return [];
  }
}

async function fetchAutoRate({ blockId, shop, currencyCode }) {
  const response = await axios({
    url: `${switchUrl(blockId)}/currency/getCacheData`,
    method: "POST",
    data: {
      shopName: shop,
      currencyCode: currencyCode,
    },
  });

  const res = response.data.response;
  return res.exchangeRate;
}

async function checkUserIp({ blockId, shop }) {
  try {
    const response = await axios({
      url: `${switchUrl(blockId)}/userIp/checkUserIp?shopName=${shop}`,
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
      `https://api.ipapi.com/api/check?access_key=${access_key}`,
    );
    return { ...response.data, status: response.status };
  } catch (error) {
    console.error("Error fetchUserCountryInfo:", error);
    return null;
  }
}

//判断插件id，根据id返回不同环境的url
function switchUrl(blockId) {
  if (blockId === "AZnlHVkxkZDMwNDg2Q__13411448604249213220") {
    return "https://springbackendprod.azurewebsites.net";
  } else {
    return "https://springbackendservice-e3hgbjgqafb9cpdh.canadacentral-01.azurewebsites.net";
  }
}

async function initializeCurrency({ blockId, currencyData, shop, ciwiBlock }) {
  const selectedCurrencyCode = localStorage.getItem("ciwi_selected_currency");

  let moneyFormat = ciwiBlock.querySelector("#queryMoneyFormat").value;

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
  const currencyInput = ciwiBlock.querySelector('input[name="currency_code"]');

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
    transformPrices(rate, moneyFormat, selectedCurrency);

    // 开始观察整个文档 body
    initPriceObserver(rate, moneyFormat, selectedCurrency);

    // 清空并重新生成选项
    if (optionsList) {
      optionsList.innerHTML = "";
      currencyData?.forEach((currency) => {
        const optionItem = document.createElement("div");
        optionItem.className = `option-item ${currency?.currencyCode === selectedCurrencyCode ? "selected" : ""}`;
        optionItem.dataset.value = currency?.currencyCode;
        optionItem.dataset.type = "currency";
        optionItem.innerHTML = `
          <span class="option-text">${currency?.currencyCode}</span> 
          <span class="currency-symbol">(${currency?.symbol})</span>
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
        if (currency?.currencyCode === selectedCurrencyCode && selectedOption) {
          selectedOption.innerHTML = `
            <span class="selected-text" data-type="currency">${currency?.currencyCode}</span>
            <span class="currency-symbol">(${currency?.symbol})</span>
          `;
        }
      });
    }

    const autoRate = await fetchAutoRate({
      blockId,
      shop: shop,
      currencyCode: selectedCurrencyCode,
    });

    localStorage.setItem(
      "ciwi_selected_currency_rate",
      JSON.stringify({
        currencyCode: selectedCurrencyCode,
        exchangeRate: autoRate,
      }),
    );
  } else if (currencyData?.length) {
    //货币选择器数据
    if (optionsList) {
      optionsList.innerHTML = "";
      currencyData?.forEach((currency) => {
        const optionItem = document.createElement("div");
        optionItem.className = `option-item ${currency?.currencyCode === currencyInput.value ? "selected" : ""}`;

        optionItem.dataset.value = currency?.currencyCode;
        optionItem.dataset.type = "currency";
        optionItem.innerHTML = `
          <span class="option-text">${currency?.currencyCode}</span>
          <span class="currency-symbol">(${currency?.symbol})</span>
        `;

        // 为新创建的选项添加点击事件监听器
        optionItem.addEventListener("click", function (e) {
          const form = ciwiBlock.querySelector("ciwiswitcher-form");
          if (form) {
            form.handleOptionClick(e);
          }
        });

        optionsList.appendChild(optionItem);
      });
    }

    //货币选择器选项框数据
    const currencyInclude = currencyData?.find(
      (currency) => currency.currencyCode === currencyInput.value,
    );
    if (currencyInclude) {
      currencyInput.value = currencyInclude.currencyCode;
      selectedOption.innerHTML = `
            <span class="selected-text" data-type="currency">${currencyInclude?.currencyCode}</span>
            <span class="currency-symbol">(${currencyInclude?.symbol})</span>
          `;
    } else {
      const primaryCurrency =
        currencyData?.find((currency) => currency.primaryStatus) ||
        currencyData[0];
      currencyInput.value = primaryCurrency.currencyCode;
      selectedOption.innerHTML = `
            <span class="selected-text" data-type="currency">${primaryCurrency?.currencyCode}</span>
            <span class="currency-symbol">(${primaryCurrency?.symbol})</span>
          `;
    }
  }
}

//转换页面价格方法
function transformPrices(rate, moneyFormat, selectedCurrency) {
  const pricesDoc = document.querySelectorAll(".ciwi-money");

  pricesDoc.forEach((price) => {
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
}

// 监听懒加载 / 动态插入的节点
function initPriceObserver(rate, moneyFormat, selectedCurrency) {
  const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1 && node.matches?.(".ciwi-money")) {
            transformPrices(rate, moneyFormat, selectedCurrency);
          } else if (node.querySelectorAll) {
            if (node.querySelectorAll(".ciwi-money").length > 0) {
              transformPrices(rate, moneyFormat, selectedCurrency);
            }
          }
        });
      }
    }
  });

  // 初始执行一次
  transformPrices(rate, moneyFormat, selectedCurrency);

  // 开始观察
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// 更新mainBox文本
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
    const currencyCode = ciwiBlock.querySelector('input[name="currency_code"]');
    const storedCurrency = localStorage.getItem("ciwi_selected_currency");
    selectedCurrencyText =
      storedCurrency && typeof storedCurrency == "string"
        ? storedCurrency
        : currencyCode?.value;
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

  if (
    !formattedPrice ||
    exchangeRate == "Auto" ||
    price.includes(currencyCode) //防止重复计算
  ) {
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

  // 获取货币符号位置配置
  const currencyConfig = window.currencyFormatConfig
    ? window.currencyFormatConfig[currencyCode]
    : null;
  const symbolPosition = currencyConfig
    ? currencyConfig.symbol_position
    : "front";

  // 根据符号位置返回不同格式
  if (symbolPosition === "back") {
    return `${number}${symbol} <span class="currency-code">${currencyCode}</span>`;
  } else {
    return `${symbol}${number} <span class="currency-code">${currencyCode}</span>`;
  }
}

function convertToNumberFromMoneyFormat(moneyFormat, formattedPrice) {
  let number = formattedPrice;

  switch (true) {
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
        `#shopify-block-${this.querySelector('input[name="block_id"]')?.value}`,
      ),
      ciwiContainer: this.querySelector("#ciwi-container"),
      selectorBox: this.querySelector("#selector-box"),
      languageInput: this.querySelector('input[name="language_code"]'),
      currencyInput: this.querySelector('input[name="currency_code"]'),
      countryInput: this.querySelector('input[name="country_code"]'),
      confirmButton: this.querySelector("#switcher-confirm"),
      cancelButton: this.querySelector("#switcher-cancel"),
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

    this.elements.cancelButton?.addEventListener(
      "click",
      this.handleCancelClick.bind(this),
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
      this.elements.currencyInput.value = value;
    }
    // 关闭所有选择器
    this.closeAllSelectors();
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

  submitForm(event) {
    event.preventDefault();
    // 更新 main-box 显示文本
    const option = this.elements.languageSelector?.querySelector(".selected");
    const flag = option.querySelector(".option-country-flag")?.src;
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
    localStorage.setItem(
      "ciwi_selected_currency",
      this.elements.currencyInput.value,
    );

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

    const isVisible = this.elements.selectorBox.style.display !== "none";
    this.elements.selectorBox.style.display = isVisible ? "none" : "block";
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

// Define the custom element
customElements.define("ciwiswitcher-form", CiwiswitcherForm);

// function IpPosition(blockId, ipOpen, shop, ciwiBlock) {

// }

async function CurrencySelectorTakeEffect(
  blockId,
  isCurrencySelectorTakeEffect,
  shop,
  data,
  ciwiBlock,
) {
  if (!isCurrencySelectorTakeEffect) {
    console.log("currencySelector function false");
    return;
  }
  const localStorageCurrencyDataJSON =
    localStorage.getItem("ciwi_currency_data");
  const localStorageCurrencyData = JSON.parse(localStorageCurrencyDataJSON);

  let currencyData = [];

  if (localStorageCurrencyDataJSON && Array.isArray(localStorageCurrencyData)) {
    currencyData = localStorageCurrencyData;
  } else {
    currencyData = await fetchCurrencies({ blockId, shop: shop });
    localStorage.setItem("ciwi_currency_data", JSON.stringify(currencyData));
  }

  const currencySelector = ciwiBlock.querySelector(
    "#currency-switcher-container",
  );
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
  currencySelector.style.display = "block";

  initializeCurrency({
    blockId,
    currencyData,
    shop,
    ciwiBlock,
  });

  currencyData = await fetchCurrencies({ blockId, shop: shop });
  localStorage.setItem("ciwi_currency_data", JSON.stringify(currencyData));
}

async function LanguageSelectorTakeEffect(
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
      ".selector-header[data-type='language'] .selected-option",
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
      mainBoxText.style.margin = "0 20px 0px 35px";
    }
  }
}

async function ProductImgTranslate(blockId, shop, ciwiBlock) {
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
        const match = productImageData.response.find(
          (item) =>
            img.src.includes(item.imageBeforeUrl.split("/files/")[2]) &&
            item.languageCode === language,
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
}

function isLikelyBotByUA() {
  let error = [];

  const ua = navigator.userAgent.toLowerCase();

  // 常见爬虫 UA 关键词
  const botKeywords = [
    "bot",
    "spider",
    "crawl",
    "slurp", // :contentReference[oaicite:1]{index=1}
    "bingpreview", // :contentReference[oaicite:2]{index=2}
    "facebookexternalhit", // :contentReference[oaicite:3]{index=3}
    "monitor",
    "headless",
    "wget",
    "curl",
    "python-requests",
  ];

  // 检查 UA 关键词
  const matchedKeywords = botKeywords.filter((keyword) => ua.includes(keyword));
  if (matchedKeywords.length > 0) {
    return `ua 包含: ${matchedKeywords.join(", ")}`;
  }

  // 检测是否为无头浏览器环境
  if (navigator.webdriver) {
    error.push("webdriver");
  }

  // 一些真实浏览器会有的特征（爬虫环境可能缺失）
  if (!(navigator.languages && navigator.languages.length > 0)) {
    error.push("without languages");
  }

  if (window.outerWidth === 0 || window.outerHeight === 0)
    error.push("window undefined");

  // 🆕 检测 JS 是否执行
  if (!window.__JS_EXECUTED__) error.push("js not executed");

  return error.length >= 2 ? error.join(",") : undefined;
}

// Page load handling
window.onload = async function () {
  console.log("onload start");

  const blockId = document.querySelector('input[name="block_id"]')?.value;
  console.log("blockId: ", blockId);

  const ciwiBlock = document.querySelector(`#shopify-block-${blockId}`);
  if (!ciwiBlock) {
    console.log("ciwiBlock not found");
    return;
  }

  const shop = ciwiBlock.querySelector("#queryCiwiId");

  const reason = isLikelyBotByUA();

  // 使用示例
  if (reason) {
    console.warn("⚠️ 疑似爬虫访问");
    const ua = navigator.userAgent.toLowerCase();
    CrawlerDDetectionReport({ shop: shop.value, blockId, ua, reason });
    return;
  } else {
    console.log("✅ 正常用户访问");
  }

  const switcher = ciwiBlock.querySelector("#ciwi-container");
  const mainBox = ciwiBlock.querySelector("#main-box");
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
  ProductImgTranslate(blockId, shop, ciwiBlock);
  let configData = {};
  const storedConfig = localStorage.getItem("ciwi_switcher_config");
  if (storedConfig) {
    configData = JSON.parse(storedConfig);
  } else {
    configData = await fetchSwitcherConfig({ blockId, shop: shop.value });
    localStorage.setItem("ciwi_switcher_config", JSON.stringify(configData));
  }
  const isCurrencySelectorTakeEffect =
    configData.currencySelector ||
    (!configData.languageSelector && !configData.currencySelector);
  const isLanguageSelectorTakeEffect =
    configData.languageSelector ||
    (!configData.languageSelector && !configData.currencySelector);

  if (configData?.ipOpen) {
    const iptokenInput = ciwiBlock.querySelector('input[name="iptoken"]');
    const iptokenValue = iptokenInput.value;
    if (!iptokenValue) {
      console.log("iptoken desappeared!");
      return;
    }
    const storedCountry = localStorage.getItem("ciwi_selected_country");
    const storedCurrency = localStorage.getItem("ciwi_selected_currency");
    const languageInput = ciwiBlock.querySelector(
      'input[name="language_code"]',
    );
    const language = languageInput.value;

    const countryInput = ciwiBlock.querySelector('input[name="country_code"]');
    const country = countryInput.value;
    const availableLanguages = Array.from(
      ciwiBlock.querySelectorAll(".option-item[data-type='language']"),
    ).map((option) => option.dataset.value);
    const availableCountries = Array.from(
      ciwiBlock.querySelectorAll('ul[role="list"] a[data-value]'),
    ).map((link) => link.getAttribute("data-value"));

    let browserLanguage = navigator.language;
    let detectedLanguage;
    // 获取匹配的语言或默认为英语

    if (!browserLanguage.includes("zh")) {
      browserLanguage = browserLanguage.split("-")[0];
    }

    if (availableLanguages.includes(browserLanguage)) {
      detectedLanguage = browserLanguage;
    }

    if (storedCountry && storedCurrency) {
    } else {
      const checkUserIpStartTime = new Date().getTime();
      const userIp = await checkUserIp({ blockId, shop: shop.value });
      const checkUserIpEndTime = new Date().getTime();
      const checkUserIpCostTime = checkUserIpEndTime - checkUserIpStartTime;

      if (userIp) {
        const fetchUserCountryInfoStartTime = new Date().getTime();
        const IpData = await fetchUserCountryInfo(iptokenValue);
        const fetchUserCountryInfoEndTime = new Date().getTime();
        const fetchUserCountryInfoCostTime =
          fetchUserCountryInfoEndTime - fetchUserCountryInfoStartTime;
        const ip = IpData?.ip;
        const currencyCode = IpData?.currency?.code;
        const countryCode = IpData?.country_code;
        FrontEndPrinting({
          blockId,
          shop: shop.value,
          ip: ip,
          languageCode: browserLanguage,
          langInclude: availableLanguages.includes(browserLanguage),
          countryCode,
          counInclude: availableCountries.includes(IpData?.country_code),
          currencyCode,
          checkUserIpCostTime,
          fetchUserCountryInfoCostTime,
          status: IpData.status,
          error: IpData?.ip ? "" : JSON.stringify(IpData),
        });
        if (currencyCode) {
          localStorage.setItem("ciwi_selected_currency", currencyCode);
        }
        let detectedCountry;
        if (countryCode && availableCountries.includes(countryCode)) {
          detectedCountry = countryCode;
          localStorage.setItem("ciwi_selected_country", countryCode);
          console.log(
            "若市场跳转不正确则清除缓存并手动设置selectedCountry字段(If the market jump is incorrect, clear the cache and manually set the selectedCountry field)",
          );
        } else {
          localStorage.setItem("ciwi_selected_country", false);
          console.log(
            "该商店不包含您目前所在市场(The store does not include the market you are currently in)",
          );
        }
        const isInThemeEditor = document.documentElement.classList.contains(
          "shopify-design-mode",
        );

        console.log();

        if (
          (detectedCountry !== country || detectedLanguage !== language) &&
          detectedCountry &&
          detectedLanguage &&
          !isInThemeEditor
        ) {
          updateLocalization({
            country: detectedCountry,
            language: detectedLanguage,
          });
        }
      }
    }
  }

  LanguageSelectorTakeEffect(
    isLanguageSelectorTakeEffect,
    configData,
    ciwiBlock,
  );

  CurrencySelectorTakeEffect(
    blockId,
    isCurrencySelectorTakeEffect,
    shop.value,
    configData,
    ciwiBlock,
  );

  if (switcher) {
    if (configData?.isTransparent) {
      console.log("switcher is transparent");
    } else {
      const selectorBox = ciwiBlock.querySelector("#selector-box");
      const confirmButton = ciwiBlock.querySelector(
        ".ciwi_switcher_confirm_button",
      );
      const cancelButton = ciwiBlock.querySelector(
        ".ciwi_switcher_cancel_button",
      );
      const translateFloatBtn = ciwiBlock.querySelector("#translate-float-btn");
      const translateFloatBtnText = ciwiBlock.querySelector(
        "#translate-float-btn-text",
      );
      const translateFloatBtnIcon = ciwiBlock.querySelector(
        "#translate-float-btn-icon",
      );
      confirmButton.style.backgroundColor = configData.buttonBackgroundColor;
      confirmButton.style.color = configData.buttonColor;
      cancelButton.style.backgroundColor = configData.buttonBackgroundColor;
      cancelButton.style.color = configData.buttonColor;
      selectorBox.style.backgroundColor = configData.backgroundColor;
      switcher.style.color = configData.fontColor;

      if (configData.selectorPosition === "top_left") {
        switcher.style.top = configData?.positionData.toString() + "%" || "10%";
        switcher.style.bottom = "auto";
        translateFloatBtnText.style.borderRadius = "8px 8px 0px 0px";
        translateFloatBtn.style.justifyContent = "flex-end";
        translateFloatBtnIcon.style.bottom = "20px";
        translateFloatBtnIcon.style.left = "10px";
        selectorBox.style.left = "0";
        selectorBox.style.top = "100%"; // 设置顶部距离为主框高度
        selectorBox.style.bottom = "auto";
        selectorBox.style.transform = "none"; // 清除transform
        if (isRtlLanguage) {
          translateFloatBtn.style.top = "-80px";
          selectorBox.style.top = translateFloatBtn.style.top;
        }
      }
      if (configData.selectorPosition === "bottom_left") {
        switcher.style.bottom =
          configData?.positionData.toString() + "%" || "10%";
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
        selectorBox.style.bottom = "100%"; // 设置底部距离为主框高度
        selectorBox.style.top = "auto";
        selectorBox.style.transform = "none";
      }
      if (configData.selectorPosition === "top_right") {
        switcher.style.top = configData?.positionData.toString() + "%" || "10%";
        switcher.style.right = "0";
        switcher.style.bottom = "auto";
        translateFloatBtnText.style.borderRadius = "0px 0px 8px 8px";
        translateFloatBtn.style.justifyContent = "flex-start";
        translateFloatBtnIcon.style.bottom = "20px";
        translateFloatBtnIcon.style.left = "55px";
        selectorBox.style.right = "0";
        selectorBox.style.top = "100%"; // 设置顶部距离为主框高度
        selectorBox.style.bottom = "auto";
        selectorBox.style.transform = "none"; // 清除transform
      }
      if (configData.selectorPosition === "bottom_right") {
        switcher.style.bottom =
          configData?.positionData.toString() + "%" || "10%";
        switcher.style.right = "0";
        switcher.style.top = "auto";
        translateFloatBtnText.style.borderRadius = "0px 0px 8px 8px";
        translateFloatBtn.style.justifyContent = "flex-start";
        translateFloatBtnIcon.style.bottom = "20px";
        translateFloatBtnIcon.style.left = "55px";
        selectorBox.style.right = "0";
        selectorBox.style.bottom = "100%"; // 设置底部距离为主框高度
        selectorBox.style.top = "auto";
        selectorBox.style.transform = "none";
      }
      if (
        configData.selectorPosition === "top_left" ||
        configData.selectorPosition === "bottom_left"
      ) {
        if (isRtlLanguage) {
          selectedLanguageText.style.transform = "rotate(-90deg)";
          selectedLanguageText.style.right = "30px";
          translateFloatBtnIcon.style.right = "10px";
          translateFloatBtnIcon.style.bottom = "-90px";
        }
      }
      if (configData.languageSelector || configData.currencySelector) {
        selectorBox.style.border = `1px solid ${configData.optionBorderColor}`;
        mainBox.style.backgroundColor = configData.backgroundColor;
        updateDisplayText(
          configData.languageSelector,
          configData.currencySelector,
          ciwiBlock,
        );
        mainBox.style.display = "flex";
        mainBox.style.border = `1px solid ${configData.optionBorderColor}`;
        console.log("onload end");
      } else {
        switcher.style.width = "200px";
        if (
          configData.selectorPosition === "top_right" ||
          configData.selectorPosition === "bottom_right"
        ) {
          translateFloatBtn.style.right = "35%";
        }
        translateFloatBtnText.style.backgroundColor =
          configData.backgroundColor;
        translateFloatBtn.style.display = "flex";
      }
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

  configData = await fetchSwitcherConfig({ blockId, shop: shop.value });
  localStorage.setItem("ciwi_switcher_config", JSON.stringify(configData));
};
