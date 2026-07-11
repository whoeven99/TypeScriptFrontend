// Storefront Widget / Liquid / PageFly / image translation APIs go through
// Shopify App Proxy (`#ciwiAppProxyBase`) into TSF `/api/storefront/*`.
function resolveStorefrontApiBase() {
  const appProxyBase = document.getElementById("ciwiAppProxyBase")?.value?.trim();
  if (!appProxyBase) {
    console.error(
      "[ciwi] ciwiAppProxyBase missing; storefront reads require App Proxy (v4)",
    );
    return null;
  }
  return appProxyBase;
}

const STOREFRONT_FETCH_RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

function isRetryableFetchError(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("load failed") ||
    message.includes("fetch failed")
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function parseJsonSafely(res) {
  const text = await res.text().catch(() => "");
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    const preview = text.trim().slice(0, 120);
    return {
      success: false,
      errorCode: res.status || 10001,
      errorMsg: preview ? `NON_JSON_RESPONSE:${preview}` : "NON_JSON_RESPONSE",
      response: null,
    };
  }
}

async function fetchJson(url, options = {}) {
  const {
    retryAttempts = 4,
    retryDelayMs = 450,
    headers = {},
    ...fetchOptions
  } = options;
  const maxAttempts = Number(retryAttempts);
  const baseDelayMs = Number(retryDelayMs);

  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        ...fetchOptions,
      });
      const data = await parseJsonSafely(res);

      if (
        STOREFRONT_FETCH_RETRYABLE_STATUS.has(res.status) &&
        attempt < maxAttempts
      ) {
        await sleep(baseDelayMs * attempt);
        continue;
      }

      return { status: res.status, data };
    } catch (error) {
      lastError = error;
      if (!isRetryableFetchError(error) || attempt >= maxAttempts) {
        throw error;
      }
      await sleep(baseDelayMs * attempt);
    }
  }

  throw lastError || new Error("fetchJson failed");
}

export async function ReadTranslatedText({ shopName, languageCode }) {
  try {
    const baseUrl = resolveStorefrontApiBase();
    if (!baseUrl) {
      return { success: false, errorCode: 10001, errorMsg: "APP_PROXY_MISSING", response: [] };
    }
    const { data } = await fetchJson(
      `${baseUrl}/userPageFly/readTranslatedText?shopName=${shopName}&languageCode=${languageCode}`,
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
  shopName,
  languageCode,
}) {
  try {
    const baseUrl = resolveStorefrontApiBase();
    if (!baseUrl) {
      return { success: false, errorCode: 10001, errorMsg: "APP_PROXY_MISSING", response: [] };
    }
    const { data } = await fetchJson(
      `${baseUrl}/liquid/parseLiquidDataByShopNameAndLanguage?shopName=${shopName}&languageCode=${languageCode}`,
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
    const baseUrl = resolveStorefrontApiBase();
    if (!baseUrl) {
      return {
        success: false,
        errorCode: 10001,
        errorMsg: "APP_PROXY_MISSING",
        response: [],
      };
    }
    const { data } = await fetchJson(
      `${baseUrl}/picture/getPictureDataByShopNameAndResourceIdAndPictureId?shopName=${shopName}`,
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
    const baseUrl = resolveStorefrontApiBase();
    if (!baseUrl) {
      return {
        success: false,
        errorCode: 10001,
        errorMsg: "APP_PROXY_MISSING",
        response: [],
      };
    }
    const { data } = await fetchJson(
      `${baseUrl}/picture/getPictureDataByShopNameAndLanguageCode?shopName=${shopName}&languageCode=${languageCode}`,
      {
        method: "POST",
        body: JSON.stringify({
          shopName,
          languageCode,
        }),
      },
    );
    return data;
  } catch (err) {
    console.error(`${shopName} Error GetShopImageData:`, err);
  }
}

export async function fetchSwitcherConfig({ shop }) {
  // 默认配置与 app/lib/switcherConstants.ts SWITCHER_UI_DEFAULTS 对齐
  const initData = {
    shopName: shop,
    includedFlag: true,
    languageSelector: true,
    currencySelector: true,
    ipOpen: false,
    fontColor: "#303030",
    backgroundColor: "#ffffff",
    buttonColor: "#ffffff",
    buttonBackgroundColor: "#f6f6f7",
    optionBorderColor: "#d4d4d8",
    selectorPosition: "bottom_left",
    positionData: 10,
  };

  try {
    const baseUrl = resolveStorefrontApiBase();
    if (!baseUrl) {
      return {
        success: true,
        errorCode: 10001,
        errorMsg: "APP_PROXY_MISSING",
        response: initData,
      };
    }
    const { data } = await fetchJson(
      `${baseUrl}/widgetConfigurations/getData`,
      {
        method: "POST",
        body: JSON.stringify({ shopName: shop }),
      },
    );

    if (
      data.success &&
      typeof data.response === "object" &&
      data.response !== null
    ) {
      const filteredResponse = Object.fromEntries(
        Object.entries(data.response).filter(([_, value]) => value !== null),
      );
      return {
        success: true,
        errorCode: 0,
        errorMsg: "",
        response: {
          ...initData,
          ...filteredResponse,
        },
      };
    } else {
      return {
        success: true,
        errorCode: 10001,
        errorMsg: "SERVER_ERROR",
        response: initData,
      };
    }
  } catch (error) {
    console.error(`${shop} fetchSwitcherConfig error:`, error);
    return {
      success: true,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: initData,
    };
  }
}

export async function fetchCurrencies({ blockId, shop }) {
  try {
    const baseUrl = resolveStorefrontApiBase();
    if (!baseUrl) return [];
    const { data } = await fetchJson(
      `${baseUrl}/currency/getCurrencyByShopName?shopName=${shop}`,
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
  const baseUrl = resolveStorefrontApiBase();
  if (!baseUrl) return undefined;
  const { data } = await fetchJson(
    `${baseUrl}/currency/getCacheData`,
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

export async function fetchUserCountryInfo(access_key) {
  try {
    const res = await fetch(
      window.Shopify.routes.root +
        "browsing_context_suggestions.json" +
        "?country[enabled]=true" +
        `&country[exclude]=${window.Shopify.country}` +
        "&language[enabled]=true" +
        `&language[exclude]=${window.Shopify.language}`,
    );

    const json = await res.json();

    if (json) {
      return {
        status: res.status,
        countryCode: json?.detected_values?.country?.handle,
        languageCode: json?.detected_values?.language?.handle,
      };
    } else {
      const res = await fetch(
        `https://api.ipapi.com/api/check?access_key=${access_key}`,
      );

      const json = await res.json();

      return {
        status: res.status,
        countryCode: json?.country_code,
        languageCode: json?.location?.languages[0]?.code,
      };
    }
  } catch (err) {
    console.error("Error fetchUserCountryInfo:", err);
    return null;
  }
}
