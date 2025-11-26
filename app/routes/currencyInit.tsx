import { ActionFunctionArgs } from "react-router";
import { queryShop } from "~/api/admin";
import {
  InitCurrency,
  AddCurrency,
  UpdateDefaultCurrency,
} from "~/api/JavaServer";
import { authenticate } from "~/shopify.server";
import currencyLocaleData from "~/utils/currency-locale-data";

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
    // const currencyLocaleData = await fetch(url)
    //   .then((response) => response.json())
    //   .catch((error) =>
    //     console.error("Error loading currencyLocaleData:", error),
    //   );
    if (!primaryCurrency?.response) {
      const currencyData = shopLoad.currencySettings.nodes
        .filter((item1: any) => item1.enabled)
        .filter((item2: any) => item2.currencyCode !== shopLoad.currencyCode)
        .map((item3: any) => ({
          currencyName:
            currencyLocaleData[
              item3.currencyCode as keyof typeof currencyLocaleData
            ]?.currencyName || "",
          currencyCode: item3.currencyCode,
          primaryStatus: 0,
        }));

      currencyData.push({
        currencyName:
          currencyLocaleData[
            shopLoad.currencyCode as keyof typeof currencyLocaleData
          ]?.currencyName || "",
        currencyCode: shopLoad.currencyCode,
        primaryStatus: 1,
      });

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
        currencyName:
          currencyLocaleData[
            shopLoad.currencyCode as keyof typeof currencyLocaleData
          ]?.currencyName,
        currencyCode: shopLoad.currencyCode,
        primaryStatus: 1,
      });
    }

    const currencyLocaleDataArray = Object.keys(currencyLocaleData).map(
      (key, index) => ({
        key: index,
        currencyName:
          currencyLocaleData[key as keyof typeof currencyLocaleData]
            ?.currencyName,
        currencyCode: key,
        symbol:
          currencyLocaleData[key as keyof typeof currencyLocaleData]?.symbol,
        locale:
          currencyLocaleData[key as keyof typeof currencyLocaleData]?.locale,
      }),
    );

    return {
      success: true,
      errorCode: 0,
      errorMsg: "",
      response: {
        defaultCurrencyCode: shopLoad.currencyCode,
        currencyLocaleData: currencyLocaleDataArray,
      },
    };
  } catch (error) {
    console.error("Error currencyInit: ", error);
    const url = new URL("/currencies.json", request.url).toString();
    const currencyLocaleData = await fetch(url)
      .then((response) => response.json())
      .catch((error) =>
        console.error("Error loading currencyLocaleData:", error),
      );
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
