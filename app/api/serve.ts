import axios from "axios";
import { authenticate } from "~/shopify.server";
import { queryShop } from "./admin";

export interface ConfirmDataType {
  resourceId: string;
  locale: string;
  key: string;
  value: string | null;
  translatableContentDigest: string;
  target: string;
}

//用户数据更新
export const UpdateUser = async ({ request }: { request: Request }) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  try {
    const shopData = await queryShop({ request });
    const response = await axios({
      url: `https://springbackendservice-e3hgbjgqafb9cpdh.canadacentral-01.azurewebsites.net/user/add`,
      method: "POST",
      data: {
        shopName: shop,
        accessToken: accessToken,
        email: shopData.email,
      },
    });

    const res = response.data.response;
  } catch (error) {
    console.error("Error fetching translation items:", error);
    throw new Error("Error fetching translation items");
  }
};

//获取各项翻译状态
export const GetTranslationItemsInfo = async ({
  request,
  itemsInfo,
}: {
  request: Request;
  itemsInfo: any;
}) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  let res = [];
  try {
    for (let target of itemsInfo.targets) {
      for (let resourceType of itemsInfo.resourceTypes) {
        const response = await axios({
          url: `https://springbackendservice-e3hgbjgqafb9cpdh.canadacentral-01.azurewebsites.net/shopify/getTranslationItemsInfo`,
          method: "POST",
          data: {
            shopName: shop,
            accessToken: accessToken,
            target: target,
            resourceType: resourceType,
          },
        });

        const data = response.data.response;
        res.push({
          language: target,
          type: Object.keys(data.translated)[0].split("_")[0],
          translatedNumber: data.translated[Object.keys(data.translated)[0]],
          totalNumber: data.all[Object.keys(data.all)[0]],
        });
      }
    }
    return res;
  } catch (error) {
    console.error("Error fetching translation items:", error);
    throw new Error("Error fetching translation items");
  }
};

//获取用户的计划
export const GetUserSubscriptionPlan = async ({
  shop,
  accessToken,
}: {
  shop: string;
  accessToken: string | undefined;
}) => {
  try {
    const response = await axios({
      url: `https://springbackendservice-e3hgbjgqafb9cpdh.canadacentral-01.azurewebsites.net/shopify/getUserSubscriptionPlan`,
      method: "Post",
      data: {
        shopName: shop,
        accessToken: accessToken,
      },
    });
    const res = response.data.response;
    return res;
  } catch (error) {
    console.error("Error occurred in the userplan:", error);
    throw new Error("Error occurred in the userplan");
  }
};

//获取用户的额度字符数 和 已使用的字符
export const GetUserWords = async ({ shop }: { shop: string }) => {
  try {
    const response = await axios({
      url: `https://springbackendservice-e3hgbjgqafb9cpdh.canadacentral-01.azurewebsites.net/shopify/getUserLimitChars`,
      method: "Post",
      data: {
        shopName: shop,
      },
    });
    const res = response.data.response;
    return res;
  } catch (error) {
    console.error("Error occurred in the userwords:", error);
    throw new Error("Error occurred in the userwords");
  }
};

//获取国旗图片链接
export const GetLanguageData = async ({ locale }: { locale: string[] }) => {
  // 使用 map 方法遍历数组并替换每个字符串中的 '-' 为 '_'
  const updatedLocales = locale.map((item) => item.replace(/-/g, "_"));

  try {
    const response = await axios({
      url: `https://springbackendservice-e3hgbjgqafb9cpdh.canadacentral-01.azurewebsites.net/shopify/getImageInfo`,
      method: "Post",
      data: updatedLocales,
    });
    const data = response.data.response;
    const res = Object.keys(data).reduce(
      (
        acc: {
          [key: string]: {
            isoCode: string;
            Local: string;
            countries: [];
            Name: string;
          };
        },
        key,
      ) => {
        // 将 key 中的 "_" 替换为 "-"
        const newKey = key.replace("_", "-");
        // 保持原来的值，重新赋值给新键
        acc[newKey] = data[key];
        return acc;
      },
      {},
    );
    return res;
  } catch (error) {
    console.error("Error occurred in the languageData:", error);
    throw new Error("Error occurred in the languageData");
  }
};

//查询语言状态
export const GetLanguageList = async ({
  shop,
  accessToken,
}: {
  shop: string;
  accessToken: string | undefined;
}) => {
  try {
    const response = await axios({
      url: `https://springbackendservice-e3hgbjgqafb9cpdh.canadacentral-01.azurewebsites.net/translate/readInfoByShopName`,
      method: "Post",
      data: {
        shopName: shop,
        accessToken: accessToken,
      },
    });

    const res = response.data.response;
    return res;
  } catch (error) {
    console.error("Error occurred in the languageList:", error);
    throw new Error("Error occurred in the languageList");
  }
};

//查询语言待翻译字符数
export const GetTotalWords = async ({
  request,
  target,
}: {
  request: Request;
  target: string;
}) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  try {
    const response = await axios({
      url: `https://springbackendservice-e3hgbjgqafb9cpdh.canadacentral-01.azurewebsites.net/shopify/getTotalWords`,
      method: "Post",
      data: {
        shopName: shop,
        accessToken: accessToken,
        target: target,
      },
    });

    const res = response.data.response;
    return res;
  } catch (error) {
    console.error("Error occurred in the totalWords:", error);
    return { status: "error", error: "Failed to fetch total words" }; // 错误时返回默认值和错误信息
  }
};

//一键全部翻译
export const GetTranslate = async ({
  request,
  source,
  target,
}: {
  request: Request;
  source: string;
  target: string;
}) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  try {
    const response = await axios({
      url: `https://springbackendservice-e3hgbjgqafb9cpdh.canadacentral-01.azurewebsites.net/translate/clickTranslation`,
      method: "POST",
      data: {
        shopName: shop,
        accessToken: accessToken,
        source: source,
        target: target,
      },
    });

    const res = response.data;
    return res;
  } catch (error) {
    console.error("Error occurred in the translation:", error);
    throw new Error("Error occurred in the translation");
  }
};

//编辑翻译
export const updateManageTranslation = async ({
  request,
  confirmData,
}: {
  request: Request;
  confirmData: ConfirmDataType[];
}) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;

  try {
    // 遍历 confirmData 数组
    for (const item of confirmData) {
      const response = await axios({
        url: `https://springbackendservice-e3hgbjgqafb9cpdh.canadacentral-01.azurewebsites.net/shopify/updateShopifyDataByTranslateTextRequest`,
        method: "POST",
        data: {
          shopName: shop,
          accessToken: accessToken,
          locale: item.locale,
          key: item.key,
          value: item.value,
          translatableContentDigest: item.translatableContentDigest,
          resourceId: item.resourceId,
          target: item.target,
        },
      });
      const res = response.data;
    }
  } catch (error) {
    console.error("Error occurred in the translation:", error);
    throw new Error("Error occurred in the translation");
  }
};

export const getRateValue = async () => {
  try {
    const response = await axios({
      url: `https://springbackendservice-e3hgbjgqafb9cpdh.canadacentral-01.azurewebsites.net/getRateValue`,
      method: "POST",
    });

    const res = response.data;
    return res;
  } catch (error) {
    console.error("Error get rateValue:", error);
    throw new Error("User get rateValue");
  }
};

export const addCurrency = async ({
  request,
  countryName,
  currencyCode,
}: {
  request: Request;
  countryName: string;
  currencyCode: string;
}) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop } = adminAuthResult.session;
  try {
    const response = await axios({
      url: `https://springbackendservice-e3hgbjgqafb9cpdh.canadacentral-01.azurewebsites.net/currency/addCurrency`,
      method: "POST",
      data: {
        shopName: shop,
        countryName: countryName, // 国家
        currencyCode: currencyCode, // 货币代码
        rounding: "Disable",
        exchangeRate: "Auto",
      },
    });

    const res = response.data;
    return res;
  } catch (error) {
    console.error("Error add currency:", error);
    throw new Error("Error add currency");
  }
};

export const DeleteCurrency = async ({
  request,
  id,
}: {
  request: Request;
  id: string;
}) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop } = adminAuthResult.session;
  try {
    const response = await axios({
      url: `https://springbackendservice-e3hgbjgqafb9cpdh.canadacentral-01.azurewebsites.net/currency/deleteCurrency`,
      method: "POST",
      data: {
        shopName: shop,
        id: id,
      },
    });

    const res = response.data;
    return res;
  } catch (error) {
    console.error("Error delete currency:", error);
    throw new Error("Error delete currency");
  }
};

export const UpdateCurrency = async ({
  request,
  updateCurrencies,
}: {
  request: Request;
  updateCurrencies: {
    id: string;
    rounding: string;
    exchangeRate: string;
  };
}) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop } = adminAuthResult.session;
  try {
    const response = await axios({
      url: `https://springbackendservice-e3hgbjgqafb9cpdh.canadacentral-01.azurewebsites.net/currency/updateCurrency`,
      method: "POST",
      data: {
        shopName: shop,
        id: updateCurrencies.id, // 货币代码
        rounding: updateCurrencies.rounding,
        exchangeRate: updateCurrencies.exchangeRate,
      },
    });

    const res = response.data;
    return res;
  } catch (error) {
    console.error("Error delete currency:", error);
    throw new Error("Error delete currency");
  }
};

export const GetCurrency = async ({ request }: { request: Request }) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop } = adminAuthResult.session;
  try {
    const response = await axios({
      url: `https://springbackendservice-e3hgbjgqafb9cpdh.canadacentral-01.azurewebsites.net/currency/getCurrencyByShopName`,
      method: "POST",
      data: {
        shopName: shop,
      },
    });

    const res = response.data.response;
    const data = res.map((item: any) => ({
      key: item.id, // 将 id 转换为 key
      currency: item.countryName, // 将 countryName 作为 currency
      rounding: item.rounding,
      exchangeRate: item.exchangeRate,
      currencyCode: item.currencyCode,
    }));

    return data;
  } catch (error) {
    console.error("Error delete currency:", error);
    throw new Error("Error delete currency");
  }
};
