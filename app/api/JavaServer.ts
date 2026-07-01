import axios, { AxiosRequestConfig } from "axios";
import { queryShopBaseConfigData } from "./admin";
import pLimit from "p-limit";
import { withRetry } from "~/utils/retry";
import { globalStore } from "~/globalStore";

const DEFAULT_API_TIMEOUT = 10_000;

/**
 * 统一的 Java 后端请求器：
 * - 默认带超时，避免后端慢时请求无限挂起；
 * - 成功打印 `${label}: response`，失败打印 `${label} error:` 并返回统一错误结构；
 * - `fallback` 控制错误时 `response` 字段的形状（不同接口分别是 null / [] / "" / {} 等）。
 *
 * 仅用于“成功直接 return response.data、失败返回统一 SERVER_ERROR”的简单接口；
 * 带 withRetry / pLimit / 多查询回退 / 自定义返回结构的接口保持原样。
 */
export async function javaApiRequest<F = null>(
  label: string,
  config: AxiosRequestConfig,
  options: { fallback?: F; logSuccess?: boolean } = {},
) {
  // 用 "in" 判断而非解构默认值，保证可以显式传入 undefined 作为 fallback
  const fallback = "fallback" in options ? options.fallback : (null as F);
  const logSuccess = options.logSuccess ?? true;
  try {
    const response = await axios({ timeout: DEFAULT_API_TIMEOUT, ...config });
    if (logSuccess) console.log(`${label}: `, response.data);
    return response.data;
  } catch (error) {
    console.error(`${label} error:`, error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: fallback,
    };
  }
}

//SHOP_UPDATE触发通知
export const WebhookDefaultLanguage = async ({
  shop,
  JSONData,
}: {
  shop: string;
  JSONData: string;
}) => {
  return javaApiRequest(`${shop} WebhookDefaultLanguage`, {
    url: `${process.env.SERVER_URL}/user/webhookDefaultLanguage?shopName=${shop}`,
    method: "POST",
    data: {
      languageData: JSONData,
    },
  });
};

//THEMES_PUBLISH触发通知
export const WebhookDefaultTheme = async ({
  shop,
  JSONData,
}: {
  shop: string;
  JSONData: string;
}) => {
  return javaApiRequest(`${shop} WebhookDefaultTheme`, {
    url: `${process.env.SERVER_URL}/user/webhookDefaultTheme?shopName=${shop}`,
    method: "POST",
    data: {
      themeData: JSONData,
    },
  });
};

//ip自定义配置初始化
export const SyncUserIp = async ({
  shop,
  server,
  initData,
}: {
  shop: string;
  server: string;
  initData: {
    region: string;
    languageCode: string;
    currencyCode: string;
  }[];
}) => {
  return javaApiRequest(`${shop} SyncUserIp`, {
    url: `${server}/userIp/syncUserIp?shopName=${shop}`,
    method: "POST",
    data: initData,
  });
};

//更新ip自定义配置
export const UpdateUserIp = async ({
  shop,
  server,
  id,
  region,
  languageCode,
  currencyCode,
}: {
  shop: string;
  server: string;
  id: number;
  region: string;
  languageCode: string;
  currencyCode: string;
}) => {
  return javaApiRequest(`${shop} UpdateUserIp`, {
    url: `${server}/userIp/updateUserIp?shopName=${shop}`,
    method: "POST",
    data: { id, region, languageCode, currencyCode },
  });
};

export const QueryUserIpCount = async ({
  shop,
  server,
}: {
  shop: string;
  server: string;
}) => {
  return javaApiRequest(`${shop} QueryUserIpCount`, {
    url: `${server}/userIp/queryUserIpCount?shopName=${shop}`,
    method: "POST",
  });
};

export const IsInFreePlanTime = async ({
  shop,
  server,
}: {
  shop: string;
  server: string;
}) => {
  return javaApiRequest(`${shop} IsInFreePlanTime`, {
    url: `${server}/userTrials/isInFreePlanTime?shopName=${shop}`,
    method: "POST",
  });
};

export const IsShowFreePlan = async ({
  shop,
  server,
}: {
  shop: string;
  server: string;
}) => {
  return javaApiRequest(`${shop} IsShowFreePlan`, {
    url: `${server}/userTrials/isShowFreePlan?shopName=${shop}`,
    method: "POST",
  }, { fallback: "" });
};

export const GetLatestActiveSubscribeId = async ({
  shop,
  server,
}: {
  shop: string;
  server: string;
}) => {
  return javaApiRequest(
    `${shop} GetLatestActiveSubscribeId`,
    {
      url: `${server}/orders/getLatestActiveSubscribeId?shopName=${shop}`,
      method: "POST",
    },
    { fallback: "" },
  );
};

export const AddCharsByShopNameAfterSubscribe = async ({
  shop,
  appSubscription,
}: {
  shop: string;
  appSubscription: string;
}) => {
  return javaApiRequest(
    `${shop} AddCharsByShopNameAfterSubscribe`,
    {
      url: `${process.env.SERVER_URL}/translationCounter/addCharsByShopNameAfterSubscribe?shopName=${shop}`,
      method: "POST",
      data: {
        subGid: appSubscription, //订阅计划的id
      },
    },
    { fallback: false },
  );
};

export const IsOpenFreePlan = async ({
  shop,
  server,
}: {
  shop: string;
  server: string;
}) => {
  try {
    const response = await axios({
      url: `${server}/userTrials/isOpenFreePlan?shopName=${shop}`,
      method: "POST",
    });

    console.log(`${shop} IsOpenFreePlan: `, response.data);

    return { ...response.data, success: true };
  } catch (error) {
    console.error(`${shop} IsOpenFreePlan error:`, error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: false,
    };
  }
};

export const UpdateProductImageAltData = async ({
  server,
  shopName,
  productId,
  imageUrl,
  altText,
  targetAltText,
  languageCode,
}: {
  server: string;
  shopName: string;
  productId: string;
  imageUrl: string;
  altText: string;
  targetAltText: string;
  languageCode: string;
}) => {
  try {
    console.log(`${shopName} UpdateProductImageAltData: `, {
      shopName,
      productId,
      imageUrl,
      altText,
      targetAltText,
      languageCode,
    });

    const response = await axios({
      url: `${server}/picture/insertPictureToDbAndCloud`,
      method: "POST",
      headers: {
        "Content-Type": "multipart/form-data",
      },
      data: {
        file: new File([], "file.png"),
        shopName,
        userPicturesDoJson: JSON.stringify({
          shopName,
          imageId: productId,
          imageBeforeUrl: imageUrl,
          altBeforeTranslation: altText,
          altAfterTranslation: targetAltText,
          languageCode: languageCode,
        }),
      },
    });

    console.log(`${shopName} UpdateProductImageAltData: `, response.data);

    return response.data;
  } catch (error) {
    console.error("Error UpdateProductImageAltData:", error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: undefined,
    };
  }
};

export const DeleteProductImageData = async ({
  server,
  shopName,
  productId,
  imageUrl,
  languageCode,
}: {
  server: string;
  shopName: string;
  productId: string;
  imageUrl: string;
  languageCode: string;
}) => {
  try {
    const response = await axios({
      url: `${server}/picture/deletePictureData?shopName=${shopName}`,
      method: "POST",
      data: {
        shopName: shopName,
        imageId: productId,
        imageBeforeUrl: imageUrl,
        languageCode: languageCode,
      },
    });

    console.log("DeleteProductImageData: ", response.data);

    return response.data;
  } catch (error) {
    console.error("Error DeleteProductImageData:", error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: undefined,
    };
  }
};

export const GetProductImageData = async ({
  server,
  shopName,
  productId,
  languageCode,
}: {
  server: string;
  shopName: string;
  productId: string;
  languageCode: string;
}) => {
  return javaApiRequest(
    "GetProductImageData",
    {
      url: `${server}/picture/getPictureDataByShopNameAndResourceIdAndPictureId?shopName=${shopName}`,
      method: "POST",
      data: {
        shopName: shopName,
        imageId: productId,
        languageCode: languageCode,
      },
    },
    { fallback: [] as any[] },
  );
};

// export const SingleTextTranslate = async ({
//   shopName,
//   source,
//   target,
//   resourceType,
//   context,
//   key,
//   type,
//   server,
// }: {
//   shopName: string;
//   source: string;
//   target: string;
//   resourceType: string;
//   context: string;
//   key: string;
//   type: string;
//   server: string;
// }) => {
//   try {
//     const response = await axios({
//       url: `${server}/translate/singleTextTranslate`,
//       method: "POST",
//       data: {
//         shopName: shopName,
//         source: source,
//         target: target,
//         resourceType: resourceType,
//         context: context,
//         key: key,
//         type: type,
//       },
//     });

//     console.log(`${shopName} SingleTextTranslate: `, response.data);

//     return response.data;
//   } catch (error) {
//     console.error("Error SingleTextTranslate:", error);
//     return {
//       success: false,
//       errorCode: 10001,
//       errorMsg: "SERVER_ERROR",
//       response: "",
//     };
//   }
// };

type SingleTextTranslateArgs = {
  shopName: string;
  source: string;
  target: string;
  resourceType: string;
  context: string;
  key: string;
  type: string;
  server: string;
  resourceId: string | null; // 必传，但可 null
};

/** 走 TSF /api/translate-v4/single（LLM 翻译 + Java 额度扣减）。 */
export const SingleTextTranslate = async (args: SingleTextTranslateArgs) => {
  try {
    const res = await fetch("/api/translate-v4/single", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
    return await res.json();
  } catch (error) {
    console.error("Error SingleTextTranslate:", error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: "",
    };
  }
};

export const SendSubscribeSuccessEmail = async ({
  id,
  shopName,
  feeType,
}: {
  id: string;
  shopName: string;
  feeType: number;
}) => {
  console.log(`${shopName} SendSubscribeSuccessEmail Input: `, {
    id,
    shopName,
    feeType,
  });

  try {
    const response = await axios({
      url: `${process.env.SERVER_URL}/orders/sendSubscribeSuccessEmail?shopName=${shopName}`,
      method: "POST",
      data: {
        subGid: id,
        shopName: shopName,
        feeType: feeType,
      },
    });
    console.log(`${shopName} SendSubscribeSuccessEmail: `, response.data);
  } catch (error) {
    console.error("Error SendSubscribeSuccessEmail:", error);
  }
};

export const AddSubscriptionQuotaRecord = async ({
  subscriptionId,
}: {
  subscriptionId: string;
}) => {
  try {
    await axios({
      url: `${process.env.SERVER_URL}/subscriptionQuotaRecord/addSubscriptionQuotaRecord`,
      method: "PUT",
      data: {
        subscriptionId: subscriptionId,
      },
    });
  } catch (error) {
    console.error("Error AddSubscriptionQuotaRecord:", error);
  }
};

//付费后更新状态
export const UpdateStatus = async ({ shop }: { shop: string }) => {
  try {
    const response = await axios({
      url: `${process.env.SERVER_URL}/translate/updateStatusV2?shopName=${shop}`,
      method: "POST",
    });

    console.log(`${shop} updateStatusV2: `, response.data);
  } catch (error) {
    console.error("Error updateStatusV2:", error);
  }
};

//修改用户计划
export const UpdateUserPlan = async ({
  shop,
  plan,
}: {
  shop: string;
  plan: number;
}) => {
  try {
    const response = await axios({
      url: `${process.env.SERVER_URL}/user/checkUserPlan`,
      method: "POST",
      data: {
        shopName: shop,
        planId: plan,
      },
    });

    console.log(`${shop} UpdateUserPlan: `, response.data);

    return response.data;
  } catch (error) {
    console.error("Error UpdateUserPlan:", error);
  }
};

// export const GetUserInitTokenByShopName = async ({
//   shop,
//   server,
// }: {
//   shop: string;
//   server: string;
// }) => {
//   try {
//     const response = await axios({
//       url: `${server}/userTypeToken/getUserInitTokenByShopName`,
//       method: "POST",
//       data: {
//         shopName: shop,
//       },
//     });
//     return response.data;
//   } catch (error) {
//     console.error("Error GetUserInitTokenByShopName:", error);
//     return {
//       success: false,
//       errorCode: 10001,
//       errorMsg: "SERVER_ERROR",
//       response: undefined,
//     };
//   }
// };

// //获取用户翻译字数
// export const GetUserToken = async ({
//   shop,
//   accessToken,
//   target,
//   source,
// }: {
//   shop: string;
//   accessToken: string;
//   target: string;
//   source: string;
// }) => {
//   try {
//     const response = await axios({
//       url: `${process.env.SERVER_URL}/userTypeToken/getUserToken`,
//       method: "POST",
//       data: {
//         shopName: shop,
//         accessToken: accessToken,
//         target: target,
//         source: source,
//       },
//     });

//     console.log(`${shop} GetUserToken: `, response.data);

//     return response.data;
//   } catch (error) {
//     console.error("Error GetUserToken:", error);
//   }
// };

//用户数据初始化检测
export const InitializationDetection = async ({ shop }: { shop: string }) => {
  try {
    const response = await axios({
      url: `${process.env.SERVER_URL}/user/InitializationDetection?shopName=${shop}`,
      method: "GET",
    });

    console.log(`${shop} InitializationDetection: `, response.data);

    const res = response.data;
    return res;
  } catch (error) {
    console.error("Error InitializationDetection:", error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: {
        insertCharsByShopName: true,
        addUserSubscriptionPlan: true,
        addDefaultLanguagePack: true,
      },
    };
  }
};

//用户数据初始化
//添加用户
export const UserInitialization = async ({
  shop,
  accessToken,
}: {
  shop: string;
  accessToken: string;
}) => {
  try {
    if (!accessToken?.trim()) {
      console.warn(`${shop} UserInitialization: missing accessToken, skipping`);
      return;
    }

    const shopData = await queryShopBaseConfigData({ shop, accessToken });
    if (!shopData?.shop) {
      console.warn(`${shop} UserInitialization: shop data unavailable, skipping`);
      return;
    }

    const shopEmail = shopData.shop.email ?? "";
    const shopOwnerName = shopData.shop.shopOwnerName ?? "";
    const lastSpaceIndex = shopOwnerName.lastIndexOf(" ");
    const firstName =
      lastSpaceIndex > 0
        ? shopOwnerName.substring(0, lastSpaceIndex)
        : shopOwnerName;
    const lastName =
      lastSpaceIndex > 0 ? shopOwnerName.substring(lastSpaceIndex + 1) : "";
    const themesData = shopData?.themes?.nodes?.[0];
    const defaultThemeId = themesData?.id;
    const defaultThemeName = themesData?.name;
    const defaultLanguageData = shopData?.shopLocales?.find(
      (item: any) => item?.primary,
    )?.locale;

    console.log(`${shop} UserInitialization: `, {
      accessToken: accessToken,
      email: shopEmail,
      firstName: firstName || "",
      lastName: lastName || "",
      userTag: shopOwnerName,
      defaultThemeId,
      defaultThemeName,
      defaultLanguageData,
    });

    await axios({
      url: `${process.env.SERVER_URL}/user/userInitialization?shopName=${shop}`,
      method: "POST",
      data: {
        accessToken: accessToken,
        email: shopEmail,
        firstName: firstName || "",
        lastName: lastName || "",
        userTag: shopOwnerName,
        defaultThemeId,
        defaultThemeName,
        defaultLanguageData,
      },
    });
  } catch (error) {
    console.error("Error UserInitialization:", error);
  }
};

//插入字符
export const InsertCharsByShopName = async ({
  shop,
  accessToken,
}: {
  shop: string;
  accessToken: string;
}) => {
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
    console.error("Error InsertCharsByShopName:", error);
  }
};

//添加默认语言包
export const AddDefaultLanguagePack = async ({ shop }: { shop: string }) => {
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
    console.error("Error AddDefaultLanguagePack:", error);
  }
};

//获取用户计划
export const GetUserSubscriptionPlan = async ({
  shop,
  server,
}: {
  shop: string;
  server: string;
}) => {
  return javaApiRequest(
    "GetUserSubscriptionPlan",
    {
      url: `${server}/shopify/getUserSubscriptionPlan?shopName=${shop}`,
      method: "GET",
    },
    { fallback: undefined },
  );
};

//用户字数初始化
export const AddUserFreeSubscription = async ({ shop }: { shop: string }) => {
  try {
    await axios({
      url: `${process.env.SERVER_URL}/shopify/addUserFreeSubscription`,
      method: "POST",
      data: {
        shopName: shop,
      },
    });
  } catch (error) {
    console.error("Error AddUserFreeSubscription:", error);
  }
};

//更新语言数据
export const InsertShopTranslateInfo = async ({
  shop,
  accessToken,
  source,
  target,
}: {
  shop: string;
  accessToken: string;
  source: string;
  target: string;
}) => {
  try {
    const response = await axios({
      url: `${process.env.SERVER_URL}/translate/insertShopTranslateInfo`,
      method: "POST",
      data: {
        shopName: shop,
        accessToken: accessToken,
        source: source,
        target: target,
      },
    });

    console.log(`${shop} InsertShopTranslateInfo: `, response.data);
  } catch (error) {
    console.error("Error InsertShopTranslateInfo:", error);
  }
};

//批量更新语言数据
export const InsertTargets = async ({
  shop,
  accessToken,
  source,
  targets,
}: {
  shop: string;
  accessToken: string;
  source: string;
  targets: string[];
}) => {
  // 创建异步任务
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
    console.error("Error InsertTargets:", error);
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
  source: string;
  target: string;
  resourceType: string;
}) => {
  let res: {
    language: string;
    type: string;
    translatedNumber: number;
    totalNumber: number;
  }[] = [];
  console.log("GetTranslationItemsInfo Input: ", {
    shopName: shop,
    accessToken: accessToken,
    source: source,
    target: target,
    resourceType: resourceType,
  });
  try {
    const response = await axios({
      url: `${process.env.SERVER_URL}/shopify/getTranslationItemsInfo`,
      method: "POST",
      data: {
        shopName: shop,
        accessToken: accessToken,
        source: source,
        target: target,
        resourceType: resourceType,
      },
    });

    console.log("GetTranslationItemsInfo Response: ", response.data);

    if (response.data?.success && response.data?.response != undefined) {
      const data = response.data?.response;
      res = [
        ...res,
        ...Object.keys(data).map((key) => {
          return {
            language: target,
            type: data[key]?.itemName || "",
            translatedNumber: data[key]?.translatedNumber || 0,
            totalNumber: data[key]?.totalNumber || 0,
          };
        }),
      ];
      return {
        ...response.data,
        response: res,
      };
    } else {
      return {
        success: false,
        errorCode: 10001,
        errorMsg: "SERVER_ERROR",
        response: [],
      };
    }
  } catch (error) {
    console.error("Error GetTranslationItemsInfo:", error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: [],
    };
  }
};

// 获取图片翻译结果
export const TranslateImage = async ({
  shop,
  imageUrl,
  sourceCode,
  targetCode,
  accessToken,
  imageId,
}: {
  shop: string;
  imageUrl: string;
  sourceCode: string;
  targetCode: string;
  accessToken: string;
  imageId: string;
}) => {
  try {
    const response = await axios({
      url: `${process.env.SERVER_URL}/translate/imageTranslate?shopName=${shop}`,
      method: "PUT",
      data: {
        imageUrl,
        sourceCode,
        targetCode,
        accessToken,
        imageId,
      },
    });
    console.log("imageTranslate Response", response.data);
    if (response.data.success) {
      return response.data;
    } else {
      return {
        success: false,
        errorCode: 10001,
        errorMsg: "SERVER_ERROR",
        response: [],
      };
    }
  } catch (error) {
    console.log("Error GetImageTranslate", error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: [],
    };
  }
};
// 存储翻译的图片文件
export const storageTranslateImage = async ({
  shop,
  imageUrl,
  userPicturesDoJson,
}: {
  shop: string;
  imageUrl: string;
  userPicturesDoJson: any;
}) => {
  try {
    const formData = new FormData();
    formData.append("pic", imageUrl); // 添加图片 URL
    formData.append("shopName", shop); // 添加店铺名称
    formData.append("userPicturesDoJson", JSON.stringify(userPicturesDoJson));
    const response = await axios({
      url: `${process.env.SERVER_URL}/picture/saveImageToCloud`,
      method: "post",
      data: formData,
    });
    console.log("storageImage response", response.data);
    if (response.data.success) {
      return response.data;
    } else {
      return {
        success: false,
        errorCode: 10001,
        errorMsg: "SERVER_ERROR",
        response: null,
      };
    }
  } catch (error) {
    console.log("replace image filed", error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: null,
    };
  }
};

//获取用户的额度字符数 和 已使用的字符
export const GetUserWords = async ({
  shop,
  server,
}: {
  shop: string;
  server?: string;
}) => {
  return javaApiRequest(
    "GetUserWords",
    {
      url: `${server || process.env.SERVER_URL}/shopify/getUserLimitChars?shopName=${shop}`,
      method: "GET",
    },
    { fallback: undefined },
  );
};

//获取本地化信息
// export const GetLanguageLocaleInfo = async ({
//   server,
//   locale,
// }: {
//   server: string;
//   locale: string[];
// }) => {
//   // 使用 map 方法遍历数组并替换每个字符串中的 '-' 为 '_'
//   const updatedLocales = locale.map((item) => item.replace(/-/g, "_"));

//   try {
//     const response = await axios({
//       url: `${server}/shopify/getImageInfo`,
//       method: "POST",
//       data: updatedLocales,
//     });
//     if (response.data?.success) {
//       const data = response.data?.response;
//       const res = Object.keys(data).reduce(
//         (
//           acc: {
//             [key: string]: {
//               isoCode: string;
//               Local: string;
//               countries: [];
//               Name: string;
//             };
//           },
//           key,
//         ) => {
//           // 将 key 中的 "_" 替换为 "-"
//           const newKey = key.replace("_", "-");
//           // 保持原来的值，重新赋值给新键
//           acc[newKey] = data[key];
//           return acc;
//         },
//         {},
//       );
//       return {
//         ...response.data,
//         response: res,
//       };
//     } else {
//       return {
//         success: false,
//         errorCode: 10001,
//         errorMsg: "SERVER_ERROR",
//         response: undefined,
//       };
//     }
//   } catch (error) {
//     console.error("Error occurred in the languageData:", error);
//     return {
//       success: false,
//       errorCode: 10001,
//       errorMsg: "SERVER_ERROR",
//       response: undefined,
//     };
//   }
// };

// //查询语言待翻译字符数
// export const GetTotalWords = async ({
//   shop,
//   accessToken,
//   target,
// }: {
//   shop: string;
//   accessToken: string;
//   target: string;
// }) => {
//   try {
//     const response = await axios({
//       url: `${process.env.SERVER_URL}/shopify/getTotalWords`,
//       method: "Post",
//       data: {
//         shopName: shop,
//         accessToken: accessToken,
//         target: target,
//       },
//     });

//     const res = response.data.response;
//     return res;
//   } catch (error) {
//     console.error("Error GetTotalWords:", error);
//   }
// };

// 获取谷歌分析
export const GoogleAnalyticClickReport = async (params: any, name: string) => {
  try {
    const response = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${process.env.MEASURE_ID}&api_secret=${process.env.GTM_API_KEY}`,
      {
        method: "POST",
        body: JSON.stringify({
          client_id: `${params.shopName}`, // 用shop作为用户的唯一标识
          events: [
            {
              name: `${name}`,
              params: params,
            },
          ],
        }),
      },
    );
    console.log(`${name} ${params.eventType}`, response.status === 204);
    return response.status === 204;
  } catch (error) {
    console.log("google analytic error:", error);
    return false;
  }
};

// 获取翻译报告分数以及详细报告指标
export const GetTranslationQualityScore = async ({
  shop,
  source,
}: {
  shop: string;
  source: string;
}) => {
  return javaApiRequest(
    `${shop} GetTranslationQualityScore`,
    {
      method: "POST",
      url: `${process.env.SERVER_URL}/rating/getRatingInfo?shopName=${shop}&source=${source}`,
    },
    { fallback: undefined, logSuccess: false },
  );
};

// 查询未翻译的字符数
export const GetUnTranslatedWords = async ({
  shop,
  module,
  accessToken,
  source,
}: {
  shop: string;
  module: string;
  accessToken: string;
  source: string;
}) => {
  return javaApiRequest(
    `${shop} GetUnTranslatedWords`,
    {
      method: "POST",
      url: `${process.env.SERVER_URL}/shopify/getUnTranslatedToken?shopName=${shop}&source=${source}&modelType=${module}`,
      data: {
        accessToken,
      },
    },
    { fallback: undefined },
  );
};

// 获取web pixel事件获得的用户的数据
export const GetConversionData = async ({
  shop,
  storeLanguage,
  dayData,
}: {
  shop: string;
  storeLanguage: string[];
  dayData: number;
}) => {
  return javaApiRequest(
    `${shop} GetConversionData`,
    {
      method: "POST",
      url: `${process.env.SERVER_URL}/getUserDataReport?shopName=${shop}`,
      data: {
        storeLanguage,
        dayData,
        timestamp: new Date().toISOString(),
      },
    },
    { fallback: undefined },
  );
};

// 获取用户商店翻译的语言
export const GetStoreLanguage = async ({
  shop,
  source,
}: {
  shop: string;
  source: string;
}) => {
  return javaApiRequest(
    `${shop} GetStoreLanguage`,
    {
      method: "POST",
      url: `${process.env.SERVER_URL}/rating/getTranslationStatus?shopName=${shop}&source=${source}`,
    },
    { fallback: undefined },
  );
};

// 获取实时翻译指标数据值（四个开关）
export const GetRealTimeQuotaData = async ({ shop }: { shop: string }) => {
  return javaApiRequest(
    `${shop} GetRealTimeQuotaData`,
    {
      method: "POST",
      url: `${process.env.SERVER_URL}/rating/getDBConfiguration?shopName=${shop}`,
    },
    { fallback: undefined },
  );
};

//编辑翻译
//编辑翻译
export const updateManageTranslation = async ({
  shop,
  accessToken,
  confirmData,
}: {
  shop: string;
  accessToken: string;
  confirmData: any[];
}) => {
  let res: {
    success: boolean;
    errorCode: number;
    errorMsg: string;
    response: {
      id: string;
      resourceId: string;
      locale: string;
      key: string;
      value: string; // 初始为空字符串
      translatableContentDigest: string;
      target: string;
    } | null;
  }[] = [];
  confirmData.filter((item) => {
    // 移除所有 HTML 标签，只保留文本内容
    const textContent = item.value?.replace(/<[^>]*>/g, "").trim();
    console.log("Original:", item.value);
    console.log("Text content:", textContent);

    // 如果没有文本内容，返回 false（将被过滤掉）
    return textContent !== "";
  });

  const itemsToUpdate = confirmData.filter((item) => {
    if (!item.value) return false;

    // 移除所有 HTML 标签
    const textContent = item.value.replace(/<[^>]*>/g, "").trim();

    // 如果有实际文本内容则保留
    return textContent !== "";
  });

  const itemsToDelete = confirmData.filter((item) => {
    if (!item.value) return true;

    // 移除所有 HTML 标签
    const textContent = item.value.replace(/<[^>]*>/g, "").trim();

    // 如果没有实际文本内容则删除
    return textContent === "";
  });

  if (itemsToDelete.length > 0) {
    console.log("itemsToDelete: ", itemsToDelete);
  }
  if (itemsToUpdate.length > 0) {
    console.log("itemsToUpdate: ", itemsToUpdate);
  }
  // 创建并发限制器，最多同时处理5个请求
  const limit = pLimit(7);

  try {
    if (itemsToUpdate && itemsToUpdate.length > 0) {
      if (itemsToUpdate[0].resourceId.split("/")[3] !== "OnlineStoreTheme") {
        // 定义处理单个翻译项的函数
        const processTranslationItem = async (item: any) => {
          if (!item.translatableContentDigest || !item.locale) {
            return null;
          }

          // 添加重试机制
          return withRetry(
            async () => {
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
                errorCode: response.data.errorCode,
                errorMsg: response.data.errorMsg,
                response: {
                  id: item.id,
                  resourceId: item.resourceId,
                  locale: item.locale,
                  key: item.key,
                  value: item.value,
                  translatableContentDigest: item.translatableContentDigest,
                  target: item.target,
                },
              };
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

        console.log("results: ", results);

        // 处理结果
        results.forEach((result, index) => {
          if (result.status === "fulfilled" && result.value) {
            console.log("result.value: ", result.value);
            res.push(result.value);
          } else if (result.status === "rejected") {
            res.push({
              success: false,
              errorCode: 10001,
              errorMsg: `Failed to process item ${index}: ${result.reason}`,
              response: null,
            });
          }
        });
      } else {
        const response = await axios({
          url: `${process.env.SERVER_URL}/shopify/updateItems`,
          method: "POST",
          timeout: 10000, // 添加超时设置
          data: itemsToUpdate.map((item) => {
            return {
              shopName: shop,
              accessToken: accessToken,
              locale: item.locale,
              key: item.key,
              value: item.value,
              translatableContentDigest: item.translatableContentDigest,
              resourceId: item.resourceId,
              target: item.target,
            };
          }),
        });

        console.log("response: ", response.data);

        res.push({
          success: response.data.success,
          errorCode: response.data.errorCode,
          errorMsg: response.data.errorMsg,
          response: {
            id: itemsToUpdate[0].id,
            resourceId: itemsToUpdate[0].resourceId,
            locale: itemsToUpdate[0].locale,
            key: itemsToUpdate[0].key,
            value: itemsToUpdate[0].value,
            translatableContentDigest:
              itemsToUpdate[0].translatableContentDigest,
            target: itemsToUpdate[0].target,
          },
        });
      }
    }

    if (itemsToDelete.length > 0) {
      // 将 Map 转换为数组
      try {
        const processTranslationItem = async (item: any) => {
          // 添加重试机制
          return withRetry(
            async () => {
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
                    locales: [item?.target],
                    translationKeys: [item?.key],
                  },
                },
              });

              return {
                success:
                  response.data.data.translationsRemove.userErrors.length === 0,
                errorCode: 0,
                errorMsg:
                  response.data.data.translationsRemove.userErrors[0]
                    ?.message || "",
                response: {
                  id: item?.id,
                  resourceId: item?.resourceId,
                  locale: item?.locale,
                  key: item?.key,
                  value: item?.value, // 初始为空字符串
                  translatableContentDigest: item?.translatableContentDigest,
                  target: item?.target,
                },
              };
            },
            {
              maxRetries: 3, // 最多重试3次
              retryDelay: 1000, // 重试间隔1秒
            },
          );
        };

        // 并发处理所有翻译项
        const promises = itemsToDelete.map((item) =>
          limit(() => processTranslationItem(item)),
        );

        // 等待所有请求完成
        const results = await Promise.allSettled(promises);

        console.log("results: ", results);

        // 处理结果
        results.forEach((result, index) => {
          if (result.status === "fulfilled" && result.value) {
            console.log("result: ", result.value);
            res.push(result.value);
          } else if (result.status === "rejected") {
            res.push({
              success: false,
              errorCode: 10001,
              errorMsg: `Failed to process item ${index}: ${result.reason}`,
              response: null,
            });
          }
        });
      } catch (error) {
        console.error("Error occurred in the translation delete:", error);
      }
    }
    return res;
  } catch (error) {
    console.error("Error occurred in the translation:", error);
  }
};

//检测默认货币
export const InitCurrency = async ({ shop }: { shop: string }) => {
  return javaApiRequest(
    `${shop} InitCurrency`,
    {
      url: `${process.env.SERVER_URL}/currency/initCurrency?shopName=${shop}`,
      method: "Get",
    },
    { fallback: undefined },
  );
};

//更新默认货币
export const UpdateDefaultCurrency = async ({
  shop,
  currencyName,
  currencyCode,
  primaryStatus,
}: {
  shop: string;
  currencyName: string;
  currencyCode: string;
  primaryStatus: number;
}) => {
  return javaApiRequest(
    "UpdateDefaultCurrency",
    {
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
    },
    { fallback: undefined },
  );
};

//添加用户自定义汇率
export const AddCurrency = async ({
  shop,
  server,
  currencyName,
  currencyCode,
  primaryStatus,
}: {
  shop: string;
  server: string;
  currencyName: string;
  currencyCode: string;
  primaryStatus: number;
}) => {
  try {
    const response = await axios({
      url: `${server}/currency/insertCurrency`,
      method: "POST",
      data: {
        shopName: shop,
        currencyName: currencyName, // 国家
        currencyCode: currencyCode, // 货币代码
        rounding: primaryStatus ? null : "",
        exchangeRate: primaryStatus ? null : "Auto",
        primaryStatus: primaryStatus,
      },
    });

    console.log(`应用日志: ${shop} 添加货币: `, response.data);

    return response.data;
  } catch (error) {
    console.error("Error AddCurrency:", error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: undefined,
    };
  }
};

//删除用户自定义汇率
export const DeleteCurrency = async ({
  shop,
  id,
}: {
  shop: string;
  id: number;
}) => {
  return javaApiRequest(
    `${shop} DeleteCurrency`,
    {
      url: `${process.env.SERVER_URL}/currency/deleteCurrency`,
      method: "DELETE",
      data: {
        shopName: shop,
        id: id,
      },
    },
    { fallback: undefined },
  );
};

//更新用户自定义汇率
export const UpdateCurrency = async ({
  shop,
  updateCurrencies,
}: {
  shop: string;
  updateCurrencies: {
    id: string;
    rounding: string;
    exchangeRate: string;
  };
}) => {
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

    console.log("UpdateCurrency: ", response.data);

    return response.data;
  } catch (error) {
    console.error("Error UpdateCurrency:", error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: undefined,
    };
  }
};

//获取用户自定义汇率
export const GetCurrencyByShopName = async ({
  shop,
  server,
}: {
  shop: string;
  server: string;
}) => {
  try {
    const response = await axios({
      url: `${server}/currency/getCurrencyByShopName?shopName=${shop}`,
      method: "GET",
    });

    const res = response.data?.response;
    console.log("GetCurrencyByShopName: ", res);

    const data = res?.map((item: any) => ({
      key: item?.id, // 将 id 转换为 key
      currency: item?.currencyName, // 将 currencyName 作为 currency
      rounding: item?.rounding,
      exchangeRate: item?.exchangeRate,
      currencyCode: item?.currencyCode,
      primaryStatus: item?.primaryStatus,
    }));

    return {
      success: true,
      errorCode: 10001,
      errorMsg: "",
      response: data || [],
    };
  } catch (error) {
    console.error("Error GetCurrencyByShopName:", error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: null,
    };
  }
};

//获取自动汇率
export const GetCacheData = async ({
  shop,
  server,
  currencyCode,
}: {
  shop: string;
  server: string;
  currencyCode: string;
}) => {
  return javaApiRequest(
    `${shop} GetCacheData`,
    {
      url: `${server}/currency/getCacheData`,
      method: "POST",
      data: {
        shopName: shop,
        currencyCode: currencyCode,
      },
    },
    { fallback: undefined, logSuccess: false },
  );
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
    console.log(`${shop} InsertOrUpdateOrder Input: `, {
      shop,
      id,
      amount,
      name,
      createdAt,
      status,
      confirmationUrl,
    });

    const response = await axios({
      url: `${process.env.SERVER_URL}/orders/insertOrUpdateOrder?shopName=${shop}`,
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

    console.log(`${shop} InsertOrUpdateOrder: `, response.data);
    
    return response.data;
  } catch (error) {
    console.error("Error InsertOrUpdateOrder:", error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: null,
    };
  }
};

//增加用户字符数
export const AddCharsByShopName = async ({
  shop,
  amount,
  gid,
}: {
  shop: string;
  amount: number;
  gid: string;
}) => {
  return javaApiRequest(
    `${shop} AddCharsByShopName`,
    {
      url: `${process.env.SERVER_URL}/translationCounter/addCharsByShopName?shopName=${shop}`,
      method: "POST",
      data: {
        shopName: shop,
        chars: amount,
        gid: gid,
      },
    },
    { fallback: undefined },
  );
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
    console.log(`${shop} SendPurchaseSuccessEmail: `, response.data);
  } catch (error) {
    console.error("Error SendPurchaseSuccessEmail:", error);
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

    console.log(`${shop} has been uninstalled`);

    return res;
  } catch (error) {
    console.error("Error Uninstall:", error);
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
