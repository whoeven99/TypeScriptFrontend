import { ActionFunctionArgs } from "react-router";
import { queryShop } from "~/api/admin";
import {
  InitCurrency,
  AddCurrency,
  UpdateDefaultCurrency,
} from "~/api/JavaServer";
import { authenticate } from "~/shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;

  try {
    const primaryCurrency = await InitCurrency({ shop });
    const shopLoad = await queryShop({
      shop,
      accessToken: accessToken as string,
    });
    const url = new URL("/currencies.json", request.url).toString();
    const currencyLocaleData = await fetch(url)
      .then((response) => response.json())
      .catch((error) =>
        console.error("Error loading currencyLocaleData:", error),
      );
    if (!primaryCurrency?.response) {
      const currencyData = shopLoad.currencySettings.nodes
        .filter((item1: any) => item1.enabled)
        .map((item2: any) => ({
          currencyName:
            currencyLocaleData.find(
              (item3: any) => item3.currencyCode === item2.currencyCode,
            )?.currencyName || "",
          currencyCode: item2.currencyCode,
          primaryStatus: item2.currencyCode == shopLoad.currencyCode ? 1 : 0,
        }));

      console.log(`应用日志: ${shop} 初始化货币`, currencyData);

      const promises = currencyData.map((currency: any) =>
        AddCurrency({
          shop,
          server: process.env.SERVER_URL as string,
          currencyName: currency?.currencyName,
          currencyCode: currency?.currencyCode,
          primaryStatus: currency?.primaryStatus || 0,
        }),
      );
      await Promise.allSettled(promises);
    } else if (
      shopLoad.currencyCode !== primaryCurrency?.response?.currencyCode
    ) {
      await UpdateDefaultCurrency({
        shop,
        currencyName: currencyLocaleData.find(
          (item: any) => item.currencyCode === shopLoad.currencyCode,
        ).currencyName,
        currencyCode: shopLoad.currencyCode,
        primaryStatus: 1,
      });
    }
    return {
      success: true,
      errorCode: 0,
      errorMsg: "",
      response: {
        defaultCurrencyCode: shopLoad.currencyCode,
        currencyLocaleData: currencyLocaleData,
      },
    };
  } catch (error) {
    console.error("Error currencyInit: ", error);
    const url = new URL("/currencies.json", request.url).toString();
    const currencyLocaleData = await fetch(url)
      .then((response) => response.json())
      .catch((error) => console.error("Error loading currencyLocaleData:", error));
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: {
        defaultCurrencyCode: "",
        currencyLocaleData: currencyLocaleData,
      },
    };
  }
};
