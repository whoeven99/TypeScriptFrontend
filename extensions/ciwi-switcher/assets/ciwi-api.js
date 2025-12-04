// api.js
/**
 * 根据 blockId 切换后端地址（保留原实现）
 */
export function switchUrl(blockId) {
  if (blockId === "AZnlHVkxkZDMwNDg2Q__13411448604249213220") {
    return "https://springbackendprod.azurewebsites.net";
  } else {
    return "https://springbackendservice-e3hgbjgqafb9cpdh.canadacentral-01.azurewebsites.net";
  }
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

export async function NoCrawlerPrintLog({
  blockId,
  shopName,
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
    await fetchJson(
      `${switchUrl(blockId)}/userIp/noCrawlerPrintLog?shopName=${shopName}`,
      {
        method: "POST",
        body: JSON.stringify({
          status: status,
          userIp: ip,
          languageCode: languageCode,
          languageCodeStatus: langInclude,
          countryCode: countryCode,
          currencyCode: currencyCode,
          currencyCodeStatus: counInclude,
          costTime: checkUserIpCostTime,
          ipApiCostTime: fetchUserCountryInfoCostTime,
          errorMessage: error,
        }),
      },
    );
  } catch (err) {
    console.error("Error NoCrawlerPrintLog:", err);
  }
}

export async function IncludeCrawlerPrintLog({
  shopName,
  blockId,
  ua,
  reason,
}) {
  try {
    await fetchJson(
      `${switchUrl(blockId)}/userIp/includeCrawlerPrintLog?shopName=${shopName}`,
      {
        method: "POST",
        body: JSON.stringify({
          uaInformation: ua,
          uaReason: reason,
        }),
      },
    );
  } catch (err) {
    console.error("Error IncludeCrawlerPrintLog:", err);
  }
}

export async function ReadTranslatedText({ blockId, shopName, languageCode }) {
  try {
    const { data } = await fetchJson(
      `${switchUrl(blockId)}/userPageFly/readTranslatedText?shopName=${shopName}&languageCode=${languageCode}`,
      {
        method: "POST",
      },
    );
    return data;
  } catch (err) {
    console.error("Error ReadTranslatedText:", err);
  }
}

export async function ParseLiquidDataByShopNameAndLanguage({
  blockId,
  shopName,
  languageCode,
}) {
  try {
    const { data } = await fetchJson(
      `${switchUrl(blockId)}/liquid/parseLiquidDataByShopNameAndLanguage?shopName=${shopName}&languageCode=${languageCode}`,
      {
        method: "POST",
      },
    );
    return data;
  } catch (err) {
    console.error("Error ParseLiquidDataByShopNameAndLanguage:", err);
  }
}

export async function GetProductImageData({
  blockId,
  shopName,
  productId,
  languageCode,
}) {
  try {
    const { data } = await fetchJson(
      `${switchUrl(blockId)}/picture/getPictureDataByShopNameAndResourceIdAndPictureId?shopName=${shopName}`,
      {
        method: "POST",
        body: JSON.stringify({
          shopName,
          imageId: `gid://shopify/Product/${productId}`,
          languageCode,
        }),
      },
    );
    return data;
  } catch (err) {
    console.error("Error GetProductImageData:", err);
  }
}

export async function GetShopImageData({ shopName, languageCode, blockId }) {
  try {
    const { data } = await fetchJson(
      `${switchUrl(blockId)}/picture/getPictureDataByShopNameAndLanguageCode?shopName=${shopName}&languageCode=${languageCode}`,
      {
        method: "POST",
      },
    );
    return data;
  } catch (err) {
    console.error(`${shop} Error GetProductImageData:`, err);
  }
}

export async function fetchSwitcherConfig({ blockId, shop }) {
  const { data } = await fetchJson(
    `${switchUrl(blockId)}/widgetConfigurations/getData`,
    {
      method: "POST",
      body: JSON.stringify({ shopName: shop }),
    },
  );

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
    return { ...initData, ...filteredResponse };
  } else {
    return initData;
  }
}

export async function fetchCurrencies({ blockId, shop }) {
  try {
    const { data } = await fetchJson(
      `${switchUrl(blockId)}/currency/getCurrencyByShopName?shopName=${shop}`,
      { method: "GET" },
    );

    if (data?.success) {
      return data.response.map((item) => ({
        key: item?.id,
        symbol: item?.symbol || "$",
        rounding: item?.rounding,
        exchangeRate: item?.exchangeRate,
        currencyCode: item?.currencyCode,
        primaryStatus: item?.primaryStatus,
      }));
    } else {
      return [];
    }
  } catch (err) {
    console.error("Error fetchCurrencies:", err);
    return [];
  }
}

export async function fetchAutoRate({ blockId, shop, currencyCode }) {
  const { data } = await fetchJson(
    `${switchUrl(blockId)}/currency/getCacheData`,
    {
      method: "POST",
      body: JSON.stringify({
        shopName: shop,
        currencyCode,
      }),
    },
  );
  return data.response?.exchangeRate;
}

export async function checkUserIp({ blockId, shop }) {
  try {
    const { data } = await fetchJson(
      `${switchUrl(blockId)}/userIp/checkUserIp?shopName=${shop}`,
      { method: "POST" },
    );
    return data?.response;
  } catch (err) {
    console.error("Error checkUserIp:", err);
    return null;
  }
}

export async function fetchUserCountryInfo(access_key) {
  try {
    const res = await fetch(
      `https://api.ipapi.com/api/check?access_key=${access_key}`,
    );
    const json = await res.json();
    return { ...json, status: res.status };
  } catch (err) {
    console.error("Error fetchUserCountryInfo:", err);
    return null;
  }
}
