import { ActionFunctionArgs } from "react-router";
import { queryMarketDomainData } from "~/api/admin";
import {
  InitCurrency,
  AddCurrency,
  UpdateDefaultCurrency,
} from "~/api/JavaServer";
import { authenticate } from "~/shopify.server";
import currencyLocaleData from "~/utils/currency-locale-data";
import countryCurMap from "~/utils/country-cur-map";

export const action = async ({ request }: ActionFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;

  try {
    const primaryCurrency = await InitCurrency({ shop });
    const marketDomainData = await queryMarketDomainData({
      shop,
      accessToken: accessToken as string,
    });
    console.log("marketDomainData: ", marketDomainData?.markets?.nodes);

    const newPrimaryCode = marketDomainData?.shop?.currencyCode;

    if (!primaryCurrency?.response) {
      //地区对应货币代码数组
      const regionCurArray: string[] = []; 

      //接口AddCurrency数据
      let AddCurrencyArray: any[] = []; 

      //筛选regionCurArray数据
      marketDomainData?.markets?.nodes?.forEach((market: any) => {
        const regions =
          market?.conditions?.regionsCondition?.regions?.nodes || [];

        regions.forEach((region: any) => {
          if (!region?.code) return;
          const currencyCode =
            countryCurMap[region.code as keyof typeof countryCurMap];

          if (!regionCurArray.includes(currencyCode)) {
            regionCurArray.push(currencyCode);
          }
        });
      });

      //当regionCurArray存在时创建非默认货币数据
      if (regionCurArray.length) {
        AddCurrencyArray = regionCurArray.map((item) => {
          if (item == newPrimaryCode) return;
          return {
            currencyName:
              currencyLocaleData[item as keyof typeof currencyLocaleData]
                ?.currencyName || "",
            currencyCode: item,
            primaryStatus: 0,
          };
        });
      }

      //添加默认货币数据
      AddCurrencyArray.push({
        currencyName:
          currencyLocaleData[newPrimaryCode as keyof typeof currencyLocaleData]
            ?.currencyName || "",
        currencyCode: newPrimaryCode,
        primaryStatus: 1,
      });

      console.log(`应用日志: ${shop} 初始化货币`, AddCurrencyArray);

      //调用AddCurrency接口添加数据
      const promises = AddCurrencyArray.map((currency: any) =>
        AddCurrency({
          shop,
          server: process.env.SERVER_URL as string,
          currencyName: currency?.currencyName,
          currencyCode: currency?.currencyCode,
          primaryStatus: currency?.primaryStatus || 0,
        }),
      );
      await Promise.allSettled(promises);
    } else if (newPrimaryCode !== primaryCurrency?.response?.currencyCode) {
      //更新默认货币数据
      await UpdateDefaultCurrency({
        shop,
        currencyName:
          currencyLocaleData[newPrimaryCode as keyof typeof currencyLocaleData]
            ?.currencyName,
        currencyCode: newPrimaryCode,
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
        defaultCurrencyCode: newPrimaryCode,
        currencyLocaleData: currencyLocaleDataArray,
      },
    };
  } catch (error) {
    console.error("Error currencyInit: ", error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: null,
    };
  }
};
