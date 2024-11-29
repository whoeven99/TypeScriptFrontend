import axios from "axios";
import { authenticate } from "~/shopify.server";
import { queryShop } from "./admin";

export interface ConfirmDataType {
  resourceId: string;
  locale: string;
  key: string;
  value: string;
  translatableContentDigest: string;
  target: string;
}

//用户数据更新
export const UpdateUser = async ({ request }: { request: Request }) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  try {
    const shopData = await queryShop({ request });
    const addUserInfoResponse = await axios({
      url: `https://springbackendservice-e3hgbjgqafb9cpdh.canadacentral-01.azurewebsites.net/user/add`,
      method: "POST",
      data: {
        shopName: shop,
        accessToken: accessToken,
        email: shopData.contactEmail,
      },
    });
    const insertCharsByShopNameResponse = await axios({
      url: `https://springbackendservice-e3hgbjgqafb9cpdh.canadacentral-01.azurewebsites.net/translationCounter/insertCharsByShopName`,
      method: "POST",
      data: {
        shopName: shop,
        accessToken: accessToken,
      },
    });
    const addUserFreeSubscriptionResponse = await axios({
      url: `https://springbackendservice-e3hgbjgqafb9cpdh.canadacentral-01.azurewebsites.net/shopify/addUserFreeSubscription`,
      method: "POST",
      data: {
        shopName: shop,
        accessToken: accessToken,
      },
    });

    console.log("addUserInfoResponse: ", addUserInfoResponse.data);
    console.log(
      "insertCharsByShopNameResponse: ",
      insertCharsByShopNameResponse.data,
    );
    console.log(
      "addUserFreeSubscriptionResponse: ",
      addUserFreeSubscriptionResponse.data,
    );
  } catch (error) {
    console.error("Error fetching user:", error);
    throw new Error("Error fetching user");
  }
};

//更新语言数据
export const InsertShopTranslateInfo = async ({
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
      url: `https://springbackendservice-e3hgbjgqafb9cpdh.canadacentral-01.azurewebsites.net/translate/insertShopTranslateInfo`,
      method: "POST",
      data: {
        shopName: shop,
        accessToken: accessToken,
        source: source,
        target: target,
      },
    });

    const res = response.data;
    console.log("languageInfo: ", res);
  } catch (error) {
    console.error("Error insert languageInfo:", error);
    throw new Error("Error insert languageInfo");
  }
};

//更新各项翻译状态
export const GetTranslationItemsInfo = async ({
  shop,
  accessToken,
  target,
}: {
  shop: string;
  accessToken: string | undefined;
  target: string;
}) => {
  try {
    await axios({
      url: `https://springbackendservice-e3hgbjgqafb9cpdh.canadacentral-01.azurewebsites.net/shopify/getTranslationItemsInfo`,
      method: "POST",
      data: {
        shopName: shop,
        accessToken: accessToken,
        target: target,
      },
    });
  } catch (error) {
    console.error("Error fetching updating translation items:", error);
    throw new Error("Error fetching updating translation items");
  }
};

//获取各项翻译状态
export const GetItemsInSqlByShopName = async ({
  shop,
  accessToken,
  target,
}: {
  shop: string;
  accessToken: string | undefined;
  target: string;
}) => {
  let res: {
    language: string;
    type: string;
    translatedNumber: number;
    totalNumber: number;
  }[] = [];
  try {
    const response = await axios({
      url: `https://springbackendservice-e3hgbjgqafb9cpdh.canadacentral-01.azurewebsites.net/shopify/getItemsInSqlByShopName`,
      method: "POST",
      data: {
        shopName: shop,
        accessToken: accessToken,
        target: target,
      },
    });

    const data = response.data.response;
    res = [
      ...res,
      ...Object.keys(data).map((key) => {
        return {
          language: target,
          type: data[key].itemName,
          translatedNumber: data[key].translatedNumber,
          totalNumber: data[key].totalNumber,
        };
      }),
    ];

    return res;
  } catch (error) {
    console.error("Error fetching search translation items:", error);
    throw new Error("Error fetching search translation items");
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
export const GetLanguageLocaleInfo = async ({
  locale,
}: {
  locale: string[];
}) => {
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
  console.log(source, target);

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

    const res = { ...response.data, target: target };

    console.log(res);
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
  let res: {
    success: boolean;
    errorMsg: string;
    data: {
      resourceId: string;
      key: string;
      value: string;
    };
  }[] = [];
  try {
    // 遍历 confirmData 数组
    for (const item of confirmData) {
      if (item.translatableContentDigest && item.locale) {
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
        res.push({
          success: response.data.success,
          errorMsg: response.data.errorMsg,
          data: {
            resourceId: item.resourceId,
            key: item.key,
            value: item.value,
          },
        });
      }
    }
    return res;
  } catch (error) {
    console.error("Error occurred in the translation:", error);
    throw new Error("Error occurred in the translation");
  }
};

//获取汇率数据
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

//添加用户自定义汇率
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

//删除用户自定义汇率
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

//更新用户自定义汇率
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

//获取用户自定义汇率
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
