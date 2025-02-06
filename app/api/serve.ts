import axios from "axios";
import { authenticate } from "~/shopify.server";
import { queryProductCount, queryShop, queryShopLanguages } from "./admin";
import { ShopLocalesType } from "~/routes/app.language/route";
import pLimit from "p-limit";
import { withRetry } from "~/utils/retry";

export interface ConfirmDataType {
  resourceId: string;
  locale: string;
  key: string;
  value: string;
  translatableContentDigest: string;
  target: string;
}

//用户数据初始化检测
export const InitializationDetection = async ({
  request,
}: {
  request: Request;
}) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop } = adminAuthResult.session;
  try {
    const response = await axios({
      url: `${process.env.SERVER_URL}/user/InitializationDetection?shopName=${shop}`,
      method: "GET",
    });
    const res = response.data.response;
    console.log("InitializationDetection: ", res);
    return res;
  } catch (error) {
    console.error("Error UpdateUser:", error);
  }
};

//用户数据初始化
//添加用户
export const UserAdd = async ({ request }: { request: Request }) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  try {
    const shopData = await queryShop({ request });
    const shopOwnerName = shopData?.shopOwnerName;
    const lastSpaceIndex = shopOwnerName.lastIndexOf(" ");
    const firstName = shopOwnerName.substring(0, lastSpaceIndex);
    const lastName = shopOwnerName.substring(lastSpaceIndex + 1);
    console.log("addUserInfoData: ", {
      shopName: shop,
      accessToken: accessToken,
      email: shopData.contactEmail,
      firstName: firstName,
      lastName: lastName,
      userTag: shopOwnerName,
    });

    const addUserInfoResponse = await axios({
      url: `${process.env.SERVER_URL}/user/add`,
      method: "POST",
      data: {
        shopName: shop,
        accessToken: accessToken,
        email: shopData.contactEmail || "",
        firstName: firstName || "",
        lastName: lastName || "",
        userTag: shopOwnerName || "",
      },
    });
    console.log("addUserInfoResponse: ", addUserInfoResponse.data);
  } catch (error) {
    console.error("Error UpdateUser:", error);
  }
};

//插入字符
export const InsertCharsByShopName = async ({
  request,
}: {
  request: Request;
}) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  try {
    const insertCharsByShopNameResponse = await axios({
      url: `${process.env.SERVER_URL}/translationCounter/insertCharsByShopName`,
      method: "POST",
      data: {
        shopName: shop,
        accessToken: accessToken,
      },
    });
    console.log(
      "insertCharsByShopNameResponse: ",
      insertCharsByShopNameResponse.data,
    );
  } catch (error) {
    console.error("Error UpdateUser:", error);
  }
};

//添加默认语言包
export const AddDefaultLanguagePack = async ({
  request,
}: {
  request: Request;
}) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop } = adminAuthResult.session;
  console.log("AddDefaultLanguagePackData: ", shop);

  try {
    const addDefaultLanguagePackResponse = await axios({
      url: `${process.env.SERVER_URL}/aiLanguagePacks/addDefaultLanguagePack?shopName=${shop}`,
      method: "PUT",
    });
    console.log(
      "addDefaultLanguagePackResponse:",
      addDefaultLanguagePackResponse.data,
    );
  } catch (error) {
    console.error("Error UpdateUser:", error);
  }
};

//新用户判断
export const GetUserSubscriptionPlan = async ({ shop }: { shop: string }) => {
  try {
    const getUserSubscriptionPlanResponse = await axios({
      url: `${process.env.SERVER_URL}/shopify/getUserSubscriptionPlan?shopName=${shop}`,
      method: "GET",
    });
    const res = getUserSubscriptionPlanResponse.data.success;
    console.log(
      "getUserSubscriptionPlanResponse: ",
      getUserSubscriptionPlanResponse.data,
    );
    return res;
  } catch (error) {
    console.error("Error get user:", error);
  }
};

//用户字数初始化
export const AddUserFreeSubscription = async ({ shop }: { shop: string }) => {
  try {
    const addUserFreeSubscriptionResponse = await axios({
      url: `${process.env.SERVER_URL}/shopify/addUserFreeSubscription`,
      method: "POST",
      data: {
        shopName: shop,
      },
    });
    console.log(
      "addUserFreeSubscriptionResponse: ",
      addUserFreeSubscriptionResponse.data,
    );
    return addUserFreeSubscriptionResponse.data.success;
  } catch (error) {
    console.error("Error chars initialization:", error);
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
    await axios({
      url: `${process.env.SERVER_URL}/translate/insertShopTranslateInfo`,
      method: "POST",
      data: {
        shopName: shop,
        accessToken: accessToken,
        source: source,
        target: target,
      },
    });
  } catch (error) {
    console.error("Error insert languageInfo:", error);
  }
};

//批量更新语言数据
export const InsertTargets = async ({
  request,
  source,
  targets,
}: {
  request: Request;
  source: string;
  targets: string[];
}) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  try {
    await axios({
      url: `${process.env.SERVER_URL}/translate/insertTargets`,
      method: "POST",
      data: {
        shopName: shop,
        accessToken: accessToken,
        source: source,
        targetList: targets,
      },
    });
  } catch (error) {
    console.error("Error insert languageInfo:", error);
  }
};

//更新各项翻译状态
export const GetTranslationItemsInfo = async ({
  shop,
  accessToken,
  source,
  target,
  resourceType,
}: {
  shop: string;
  accessToken: string | undefined;
  source: string[];
  target: string;
  resourceType: string;
}) => {
  let res: {
    language: string;
    type: string;
    translatedNumber: number;
    totalNumber: number;
  }[] = [];
  try {
    const response = await axios({
      url: `${process.env.SERVER_URL}/shopify/getTranslationItemsInfo`,
      method: "POST",
      data: {
        shopName: shop,
        accessToken: accessToken,
        source: source[0],
        target: target,
        resourceType: resourceType,
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
    console.log(res);
    return res;
  } catch (error) {
    console.error("Error fetching updating translation items:", error);
  }
};

//获取各项翻译状态
export const GetItemsInSqlByShopName = async ({
  shop,
  accessToken,
  source,
  targets,
}: {
  shop: string;
  accessToken: string | undefined;
  source: string;
  targets: string[];
}) => {
  let res: {
    language: string;
    type: string;
    translatedNumber: number;
    totalNumber: number;
  }[] = [];
  try {
    for (const target of targets) {
      const response = await axios({
        url: `${process.env.SERVER_URL}/shopify/getItemsInSqlByShopName`,
        method: "POST",
        data: {
          shopName: shop,
          accessToken: accessToken,
          source: source,
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
    }
    return res;
  } catch (error) {
    console.error("Error fetching search translation items:", error);
  }
};

//获取用户的额度字符数 和 已使用的字符
export const GetUserWords = async ({ shop }: { shop: string }) => {
  try {
    const response = await axios({
      url: `${process.env.SERVER_URL}/shopify/getUserLimitChars?shopName=${shop}`,
      method: "GET",
    });
    const res = response.data.response;
    return res;
  } catch (error) {
    console.error("Error occurred in the userwords:", error);
  }
};

//获取本地化信息
export const GetLanguageLocaleInfo = async ({
  locale,
}: {
  locale: string[];
}) => {
  // 使用 map 方法遍历数组并替换每个字符串中的 '-' 为 '_'
  const updatedLocales = locale.map((item) => item.replace(/-/g, "_"));

  try {
    const response = await axios({
      url: `${process.env.SERVER_URL}/shopify/getImageInfo`,
      method: "POST",
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
export const GetLanguageList = async ({ shop }: { shop: string }) => {
  try {
    const response = await axios({
      url: `${process.env.SERVER_URL}/translate/readInfoByShopName?shopName=${shop}`,
      method: "GET",
    });

    const res = response.data.response;

    return res;
  } catch (error) {
    console.error("Error occurred in the languageList:", error);
  }
};

//翻译中语言状态返回
export const GetLanguageStatus = async ({
  shop,
  source,
  target,
}: {
  shop: string;
  source: string;
  target: string[];
}) => {
  try {
    const response = await axios({
      url: `${process.env.SERVER_URL}/translate/readTranslateDOByArray`,
      method: "Post",
      data: [
        {
          shopName: shop,
          source: source,
          target: target[0],
        },
      ],
    });
    const res = response.data.response;
    console.log(res);
    return res;
  } catch (error) {
    console.error("Error occurred in the languageStatus:", error);
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
      url: `${process.env.SERVER_URL}/shopify/getTotalWords`,
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
    console.error("Error GetTotalWords:", error);
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
    const response = await queryProductCount({ request });
    if (response.data.productsCount.count > 500) {
      return {
        success: false,
        errorCode: 10014,
      };
    }
  } catch (error) {
    console.error("Error occurred in the translation:", error);
  }

  try {
    const response = await axios({
      url: `${process.env.SERVER_URL}/translate/clickTranslation`,
      method: "PUT",
      data: {
        shopName: shop,
        accessToken: accessToken,
        source: source,
        target: target,
      },
    });
    console.log({
      shopName: shop,
      accessToken: accessToken,
      source: source,
      target: target,
    });

    const res = { ...response.data, target: target };
    console.log("translation: ", res);
    return res;
    return null;
  } catch (error) {
    console.error("Error occurred in the translation:", error);
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
      value?: string;
    };
  }[] = [];

  // 创建并发限制器，最多同时处理5个请求
  const limit = pLimit(7);

  try {
    // 定义处理单个翻译项的函数
    const processTranslationItem = async (item: ConfirmDataType) => {
      if (!item.translatableContentDigest || !item.locale) {
        return null;
      }

      // 添加重试机制
      return withRetry(
        async () => {
          if (item.value && item.value !== "<p><br></p>") {
            const response = await axios({
              url: `${process.env.SERVER_URL}/shopify/updateShopifyDataByTranslateTextRequest`,
              method: "POST",
              timeout: 10000, // 添加超时设置
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

            return {
              success: response.data.success,
              errorMsg: response.data.errorMsg,
              data: {
                resourceId: item.resourceId,
                key: item.key,
                value: item.value,
              },
            };
          } else {
            const response = await axios({
              url: `https://${shop}/admin/api/2024-10/graphql.json`,
              method: "POST",
              timeout: 10000, // 添加超时设置
              headers: {
                "X-Shopify-Access-Token": accessToken,
                "Content-Type": "application/json",
              },
              data: {
                query: `mutation translationsRemove($resourceId: ID!, $translationKeys: [String!]!, $locales: [String!]!) {
                  translationsRemove(resourceId: $resourceId, translationKeys: $translationKeys, locales: $locales) {
                    userErrors {
                      message
                      field
                    }
                    translations {
                      key
                      value
                    }
                  }
                }`,
                variables: {
                  resourceId: item.resourceId,
                  locales: [item.target],
                  translationKeys: [item.key],
                },
              },
            });

            return {
              success: !!response.data.data.translationsRemove.translations,
              errorMsg:
                response.data.data.translationsRemove.userErrors[0]?.message ||
                "",
              data: {
                resourceId: item.resourceId,
                key: item.key,
              },
            };
          }
        },
        {
          maxRetries: 3, // 最多重试3次
          retryDelay: 1000, // 重试间隔1秒
        },
      );
    };

    // 并发处理所有翻译项
    const promises = confirmData.map((item) =>
      limit(() => processTranslationItem(item)),
    );

    // 等待所有请求完成
    const results = await Promise.allSettled(promises);

    // 处理结果
    results.forEach((result, index) => {
      if (result.status === "fulfilled" && result.value) {
        res.push(result.value);
      } else if (result.status === "rejected") {
        res.push({
          success: false,
          errorMsg: `Failed to process item ${index}: ${result.reason}`,
          data: {
            resourceId: confirmData[index].resourceId,
            key: confirmData[index].key,
          },
        });
      }
    });

    return res;
  } catch (error) {
    console.error("Error occurred in the translation:", error);
    throw error; // 向上抛出错误，让调用者处理
  }
};

//检测默认货币
export const InitCurrency = async ({ request }: { request: Request }) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop } = adminAuthResult.session;
  console.log("InitCurrency: ", {
    shopName: shop,
  });
  try {
    const response = await axios({
      url: `${process.env.SERVER_URL}/currency/initCurrency?shopName=${shop}`,
      method: "Get",
    });
    const res = response.data.response;
    console.log("InitCurrency: ", res);
    return res;
  } catch (error) {
    console.error("Error InitCurrency:", error);
  }
};

//更新默认货币
export const UpdateDefaultCurrency = async ({
  request,
  currencyName,
  currencyCode,
  primaryStatus,
}: {
  request: Request;
  currencyName: string;
  currencyCode: string;
  primaryStatus: number;
}) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop } = adminAuthResult.session;
  console.log("UpdateDefaultCurrency: ", {
    shopName: shop,
    currencyName: currencyName, // 国家
    currencyCode: currencyCode, // 货币代码
    rounding: null,
    exchangeRate: null,
    primaryStatus: primaryStatus,
  });
  try {
    const response = await axios({
      url: `${process.env.SERVER_URL}/currency/updateDefaultCurrency`,
      method: "PUT",
      data: {
        shopName: shop,
        currencyName: currencyName, // 国家
        currencyCode: currencyCode, // 货币代码
        rounding: null,
        exchangeRate: null,
        primaryStatus: primaryStatus,
      },
    });
    const res = response.data.response;
    console.log("UpdateDefaultCurrency: ", res);
    return res;
  } catch (error) {
    console.error("Error UpdateDefaultCurrency:", error);
  }
};

//添加用户自定义汇率
export const AddCurrency = async ({
  request,
  currencyName,
  currencyCode,
  primaryStatus,
}: {
  request: Request;
  currencyName: string;
  currencyCode: string;
  primaryStatus: number;
}) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop } = adminAuthResult.session;
  console.log("AddCurrency: ", {
    shopName: shop,
    currencyName: currencyName, // 国家
    currencyCode: currencyCode, // 货币代码
    rounding: "",
    exchangeRate: "Auto",
    primaryStatus: primaryStatus,
  });
  try {
    if (primaryStatus) {
      const response = await axios({
        url: `${process.env.SERVER_URL}/currency/insertCurrency`,
        method: "POST",
        data: {
          shopName: shop,
          currencyName: currencyName, // 国家
          currencyCode: currencyCode, // 货币代码
          rounding: null,
          exchangeRate: null,
          primaryStatus: primaryStatus,
        },
      });
      const res = response.data;
      console.log("AddCurrency: ", res);
      return res;
    } else {
      const response = await axios({
        url: `${process.env.SERVER_URL}/currency/insertCurrency`,
        method: "POST",
        data: {
          shopName: shop,
          currencyName: currencyName, // 国家
          currencyCode: currencyCode, // 货币代码
          rounding: "",
          exchangeRate: "Auto",
          primaryStatus: 0,
        },
      });
      const res = response.data;
      console.log("AddCurrency: ", res);
      return res;
    }
  } catch (error) {
    console.error("Error add currency:", error);
  }
};

//删除用户自定义汇率
export const DeleteCurrency = async ({
  request,
  id,
}: {
  request: Request;
  id: number;
}) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop } = adminAuthResult.session;
  try {
    const response = await axios({
      url: `${process.env.SERVER_URL}/currency/deleteCurrency`,
      method: "DELETE",
      data: {
        shopName: shop,
        id: id,
      },
    });

    const res = response.data;
    console.log(res);

    return res;
  } catch (error) {
    console.error("Error delete currency:", error);
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
    console.log("UpdateCurrency: ", {
      shopName: shop,
      id: updateCurrencies.id, // 货币代码
      rounding: updateCurrencies.rounding,
      exchangeRate: updateCurrencies.exchangeRate,
    });

    const response = await axios({
      url: `${process.env.SERVER_URL}/currency/updateCurrency`,
      method: "PUT",
      data: {
        shopName: shop,
        id: updateCurrencies.id, // 货币代码
        rounding: updateCurrencies.rounding,
        exchangeRate: updateCurrencies.exchangeRate,
      },
    });

    const res = response.data;
    console.log("UpdateCurrency: ", res);

    return res;
  } catch (error) {
    console.error("Error update currency:", error);
  }
};

//获取用户自定义汇率
export const GetCurrencyByShopName = async ({
  request,
}: {
  request: Request;
}) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop } = adminAuthResult.session;
  console.log("GetCurrencyByShopName: ", shop);
  try {
    const response = await axios({
      url: `${process.env.SERVER_URL}/currency/getCurrencyByShopName?shopName=${shop}`,
      method: "GET",
    });

    const res = response.data.response;
    console.log("currency: ", res);
    if (res) {
      const data = res.map((item: any) => ({
        key: item.id, // 将 id 转换为 key
        currency: item.currencyName, // 将 currencyName 作为 currency
        rounding: item.rounding,
        exchangeRate: item.exchangeRate,
        currencyCode: item.currencyCode,
        primaryStatus: item.primaryStatus,
      }));
      return data;
    } else {
      return undefined;
    }
  } catch (error) {
    console.error("Error get currency:", error);
  }
};

//获取货币本地化数据
export const GetCurrencyLocaleInfo = async () => {
  try {
    const data = {
      AFN: {
        currencyName: "Afghan Afghani",
        currencyCode: "AFN",
        symbol: "؋",
        locale:
          "https://ciwi-1327177217.cos.ap-singapore.myqcloud.com/flag/AF.png",
      },
      USD: {
        currencyName: "United States Dollar",
        currencyCode: "USD",
        symbol: "$",
        locale:
          "https://ciwi-1327177217.cos.ap-singapore.myqcloud.com/flag/US.png",
      },
      EUR: {
        currencyName: "Euro",
        currencyCode: "EUR",
        symbol: "€",
        locale:
          "https://ciwi-1327177217.cos.ap-singapore.myqcloud.com/flag/EU.png",
      },
      // 你可以继续添加其他货币数据
    };

    // 模拟返回的数据
    return data;
    const response = await axios({
      url: `${process.env.SERVER_URL}/currency/getCurrencyByShopName`,
      method: "GET",
    });

    const res = response.data.response;
    return res;
  } catch (error) {
    console.error("Error GetCurrencyLocaleInfo:", error);
  }
};

//获取自动汇率
export const GetCacheData = async ({
  shop,
  currencyCode,
}: {
  shop: string;
  currencyCode: string;
}) => {
  try {
    const response = await axios({
      url: `${process.env.SERVER_URL}/currency/getCacheData`,
      method: "POST",
      data: {
        shopName: shop,
        currencyCode: currencyCode,
      },
    });

    const res = response.data.response;
    console.log("currency: ", res);
    return {
      currencyCode: currencyCode,
      rate: res.exchangeRate,
    };
  } catch (error) {
    console.error("Error GetCacheData:", error);
  }
};

//更新订单数据
export const InsertOrUpdateOrder = async ({
  shop,
  id,
  amount,
  name,
  createdAt,
  status,
  confirmationUrl,
}: {
  shop?: string;
  id: string;
  amount?: number;
  name?: string;
  createdAt?: string;
  status: string;
  confirmationUrl?: URL;
}) => {
  try {
    console.log("Order: ", {
      shopName: shop,
      id: id,
      amount: amount,
      name: name,
      createdAt: createdAt,
      status: status,
      confirmationUrl: confirmationUrl,
    });

    const response = await axios({
      url: `${process.env.SERVER_URL}/orders/insertOrUpdateOrder`,
      method: "POST",
      data: {
        shopName: shop,
        id: id,
        amount: amount,
        name: name,
        createdAt: createdAt,
        status: status,
        confirmationUrl: confirmationUrl,
      },
    });
    const res = response.data;
    console.log("InsertOrUpdateOrder:", res);
  } catch (error) {
    console.error("Error fetching insert order:", error);
  }
};

//增加用户字符数
export const AddCharsByShopName = async ({
  shop,
  amount,
}: {
  shop: string;
  amount: number;
}) => {
  try {
    console.log("shop: ", shop);
    console.log("amount: ", amount);
    const response = await axios({
      url: `${process.env.SERVER_URL}/translationCounter/addCharsByShopName`,
      method: "POST",
      data: {
        shopName: shop,
        chars: amount,
      },
    });
    const res = response.data;
    console.log(res);
  } catch (error) {
    console.error("Error fetching add chars:", error);
  }
};

//增加用户字符数
export const SendPurchaseSuccessEmail = async ({
  shop,
  price,
  credit,
}: {
  shop: string;
  price: number;
  credit: number;
}) => {
  try {
    const response = await axios({
      url: `${process.env.SERVER_URL}/orders/sendPurchaseSuccessEmail`,
      method: "POST",
      data: {
        shopName: shop,
        amount: price,
        credit: credit,
      },
    });
    const res = response.data;
    console.log("SendPurchaseSuccessEmail: ", res);
  } catch (error) {
    console.error("Error fetching add chars:", error);
  }
};

export const GetGlossaryByShopName = async ({
  shop,
  accessToken,
}: {
  shop: string;
  accessToken: string | undefined;
}) => {
  try {
    const response = await axios({
      url: `${process.env.SERVER_URL}/glossary/getGlossaryByShopName?shopName=${shop}`,
      method: "GET",
    });
    const shopLanguagesIndex: ShopLocalesType[] = await queryShopLanguages({
      shop,
      accessToken,
    });
    const shopLanguagesWithoutPrimaryIndex = shopLanguagesIndex.filter(
      (language) => !language.primary,
    );
    const res = response.data.response.map((item: any) => {
      let data = {
        key: item.id,
        status: item.status,
        sourceText: item.sourceText,
        targetText: item.targetText,
        language: "",
        rangeCode: item.rangeCode,
        type: item.caseSensitive,
        loading: false,
      };
      if (
        shopLanguagesWithoutPrimaryIndex.find((language: ShopLocalesType) => {
          return language.locale == item.rangeCode;
        }) ||
        item.rangeCode === "ALL"
      ) {
        data = {
          ...data,
          language:
            shopLanguagesWithoutPrimaryIndex.find(
              (language: ShopLocalesType) => {
                return language.locale === item.rangeCode;
              },
            )?.name || "All Languages",
        };
      }
      return data;
    });
    return {
      glossaryTableData: res,
      shopLocales: shopLanguagesWithoutPrimaryIndex,
    };
  } catch (error) {
    console.error("Error GetGlossaryByShopName:", error);
  }
};

export const UpdateTargetTextById = async ({
  shop,
  data,
}: {
  shop: string;
  data: any;
}) => {
  try {
    const response = await axios({
      url: `${process.env.SERVER_URL}/glossary/updateTargetTextById`,
      method: "POST",
      data: {
        id: data.key,
        shopName: shop,
        sourceText: data.sourceText,
        targetText: data.targetText,
        rangeCode: data.rangeCode,
        caseSensitive: data.type,
        status: data.status,
      },
    });

    const res = response.data;
    console.log(res);
    return res;
  } catch (error) {
    console.error("Error UpdateTargetTextById:", error);
  }
};

export const InsertGlossaryInfo = async ({
  shop,
  data,
}: {
  shop: string;
  data: any;
}) => {
  try {
    console.log({
      shopName: shop,
      sourceText: data.sourceText,
      targetText: data.targetText,
      rangeCode: data.rangeCode,
      caseSensitive: data.type,
      status: 1,
    });
    const response = await axios({
      url: `${process.env.SERVER_URL}/glossary/insertGlossaryInfo`,
      method: "POST",
      data: {
        shopName: shop,
        sourceText: data.sourceText,
        targetText: data.targetText,
        rangeCode: data.rangeCode,
        caseSensitive: data.type,
        status: 1,
      },
    });

    const res = response.data;

    console.log(res);
    return res;
  } catch (error) {
    console.error("Error InsertGlossaryInfo:", error);
  }
};

export const DeleteGlossaryInfo = async ({ id }: { id: number }) => {
  try {
    const response = await axios({
      url: `${process.env.SERVER_URL}/glossary/deleteGlossaryById`,
      method: "DELETE",
      data: {
        id: id,
      },
    });

    const res = response.data;
    console.log(res);

    return res;
  } catch (error) {
    console.error("Error DeleteGlossaryInfo:", error);
  }
};

//用户卸载
export const Uninstall = async ({ shop }: { shop: string }) => {
  try {
    const response = await axios({
      url: `${process.env.SERVER_URL}/user/uninstall`,
      method: "DELETE",
      data: {
        shopName: shop,
      },
    });
    const res = response.data.response;
    return res;
  } catch (error) {
    console.error("Error Uninstall:", error);
  }
};

//用户卸载应用后48小时后清除数据
export const CleanData = async ({ shop }: { shop: string }) => {
  try {
    const response = await axios({
      url: `${process.env.SERVER_URL}/user/cleanData`,
      method: "DELETE",
      data: {
        shopName: shop,
      },
    });
    const res = response.data.response;
    return res;
  } catch (error) {
    console.error("Error CleanData:", error);
  }
};

//客户可以向店主请求其数据
export const RequestData = async ({ shop }: { shop: string }) => {
  try {
    const response = await axios({
      url: `${process.env.SERVER_URL}/user/requestData`,
      method: "POST",
      data: {
        shopName: shop,
      },
    });
    const res = response.data.response;
    return res;
  } catch (error) {
    console.error("Error RequestData:", error);
  }
};

//店主可以代表客户请求删除数据
export const DeleteData = async ({ shop }: { shop: string }) => {
  try {
    const response = await axios({
      url: `${process.env.SERVER_URL}/user/deleteData`,
      method: "DELETE",
      data: {
        shopName: shop,
      },
    });
    const res = response.data.response;
    return res;
  } catch (error) {
    console.error("Error DeleteData:", error);
  }
};
