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
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
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
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
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
