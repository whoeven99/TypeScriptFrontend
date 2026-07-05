import {
  TRANSLATE_V4_ERROR_KEYS,
  getTranslateV4ErrorDefaultMessage,
} from "~/utils/translateV4Errors";

async function currencyApiRequest<T = any>(
  body: Record<string, unknown>,
  fallback: T,
) {
  try {
    const response = await fetch("/api/translate-v4/currency", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return await response.json();
  } catch (error) {
    console.error("currencyV4 request error:", error);
    return {
      success: false,
      errorCode: 50000,
      errorMsg: getTranslateV4ErrorDefaultMessage(
        TRANSLATE_V4_ERROR_KEYS.INTERNAL_ERROR,
      ),
      response: fallback,
    };
  }
}

export const AddCurrencyV4 = async ({
  currencyName,
  currencyCode,
  primaryStatus,
}: {
  currencyName: string;
  currencyCode: string;
  primaryStatus: number;
}) => {
  return currencyApiRequest(
    {
      action: "insert",
      currencyName,
      currencyCode,
      primaryStatus,
    },
    undefined,
  );
};

export const GetCurrencyByShopNameV4 = async () => {
  try {
    const response = await fetch("/api/translate-v4/currency");
    return await response.json();
  } catch (error) {
    console.error("GetCurrencyByShopNameV4 error:", error);
    return {
      success: false,
      errorCode: 50000,
      errorMsg: getTranslateV4ErrorDefaultMessage(
        TRANSLATE_V4_ERROR_KEYS.CURRENCY_LIST_FAILED,
      ),
      response: [],
    };
  }
};

export const GetCacheDataV4 = async ({
  currencyCode,
}: {
  currencyCode: string;
}) => {
  return currencyApiRequest(
    {
      action: "cache",
      currencyCode,
    },
    undefined,
  );
};
