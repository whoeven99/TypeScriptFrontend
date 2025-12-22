import axios from "axios";
import { queryShopBaseConfigData, queryShopLanguages } from "./admin";
import { ShopLocalesType } from "~/routes/app.language/route";
import pLimit from "p-limit";
import { withRetry } from "~/utils/retry";

// TODO THEMES_PUBLISH和SHOP_UPDATE webhooks待订阅
// //SHOP_UPDATE触发通知
// export const WebhookDefaultLanguage = async ({
//   shop,
//   JSONData,
// }: {
//   shop: string;
//   JSONData: string;
// }) => {
//   try {
//     const response = await axios({
//       url: `${process.env.SERVER_URL}/user/webhookDefaultLanguage?shopName=${shop}`,
//       method: "POST",
//       data: {
//         languageData: JSONData,
//       },
//     });

//     console.log(`${shop} WebhookDefaultLanguage: `, response.data);

//     return response.data;
//   } catch (error) {
//     console.error(`${shop} WebhookDefaultLanguage error:`, error);
//     return {
//       success: false,
//       errorCode: 10001,
//       errorMsg: "SERVER_ERROR",
//       response: null,
//     };
//   }
// };

// //THEMES_PUBLISH触发通知
// export const WebhookDefaultTheme = async ({
//   shop,
//   JSONData,
// }: {
//   shop: string;
//   JSONData: string;
// }) => {
//   try {
//     const response = await axios({
//       url: `${process.env.SERVER_URL}/user/webhookDefaultTheme?shopName=${shop}`,
//       method: "POST",
//       data: {
//         themeData: JSONData,
//       },
//     });

//     console.log(`${shop} WebhookDefaultTheme: `, response.data);

//     return response.data;
//   } catch (error) {
//     console.error(`${shop} WebhookDefaultTheme error:`, error);
//     return {
//       success: false,
//       errorCode: 10001,
//       errorMsg: "SERVER_ERROR",
//       response: null,
//     };
//   }
// };

//ip自定义配置初始化
export const ContinueTranslating = async ({
  shop,
  server,
  taskId,
}: {
  shop: string;
  server: string;
  taskId: number;
}) => {
  try {
    const response = await axios({
      url: `${server}/translate/continueTranslating?shopName=${shop}&taskId=${taskId}`,
      method: "POST",
    });

    console.log(`${shop} ContinueTranslating: `, response.data);

    return response.data;
  } catch (error) {
    console.error(`${shop} ContinueTranslating error:`, error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: null,
    };
  }
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
  try {
    const response = await axios({
      url: `${server}/userIp/syncUserIp?shopName=${shop}`,
      method: "POST",
      data: initData,
    });

    console.log(`${shop} SyncUserIp: `, response.data);

    return response.data;
  } catch (error) {
    console.error(`${shop} SyncUserIp error:`, error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: null,
    };
  }
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
  try {
    const response = await axios({
      url: `${server}/userIp/updateUserIp?shopName=${shop}`,
      method: "POST",
      data: { id, region, languageCode, currencyCode },
    });

    console.log(`${shop} UpdateUserIp: `, response.data);

    return response.data;
  } catch (error) {
    console.error(`${shop} UpdateUserIp error:`, error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: null,
    };
  }
};

//更新ip自定义配置可用状态
export const UpdateUserIpStatus = async ({
  shop,
  server,
  id,
  status,
}: {
  shop: string;
  server: string;
  id: number;
  status: boolean;
}) => {
  try {
    const response = await axios({
      url: `${server}/userIp/updateUserIpStatus?shopName=${shop}&id=${id}&status=${status}`,
      method: "POST",
    });

    console.log(`${shop} UpdateUserIpStatus: `, response.data);

    return response.data;
  } catch (error) {
    console.error(`${shop} UpdateUserIpStatus error:`, error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: null,
    };
  }
};

export const QueryUserIpCount = async ({
  shop,
  server,
}: {
  shop: string;
  server: string;
}) => {
  try {
    const response = await axios({
      url: `${server}/userIp/queryUserIpCount?shopName=${shop}`,
      method: "POST",
    });

    console.log(`${shop} QueryUserIpCount: `, response.data);

    return response.data;
  } catch (error) {
    console.error(`${shop} QueryUserIpCount error:`, error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: null,
    };
  }
};

export const EditTranslatedData = async ({
  shop,
  server,
  data,
}: {
  shop: string;
  server: string;
  data: {
    id?: number;
    sourceText: string;
    targetText: string;
    languageCode: string;
  }[];
}) => {
  try {
    const response = await axios({
      url: `${server}/userPageFly/editTranslatedData?shopName=${shop}`,
      method: "POST",
      data: data,
    });

    console.log(`${shop} EditTranslatedData: `, response.data);

    return response.data;
  } catch (error) {
    console.error(`${shop} EditTranslatedData error:`, error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: null,
    };
  }
};

export const ReadTranslatedText = async ({
  shop,
  server,
  languageCode,
}: {
  shop: string;
  server: string;
  languageCode: string;
}) => {
  try {
    const response = await axios({
      url: `${server}/userPageFly/readTranslatedText?shopName=${shop}&languageCode=${languageCode}`,
      method: "POST",
    });

    console.log(`${shop} ReadTranslatedText: `, response.data);

    return response.data;
  } catch (error) {
    console.error(`${shop} ReadTranslatedText error:`, error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: null,
    };
  }
};

export const UpdateLiquidReplacementMethod = async ({
  shop,
  server,
  id,
}: {
  shop: string;
  server: string;
  id: number;
}) => {
  try {
    const response = await axios({
      url: `${server}/liquid/updateLiquidReplacementMethod?shopName=${shop}&id=${id}`,
      method: "POST",
    });

    console.log(`${shop} UpdateLiquidReplacementMethod: `, response.data);

    return response.data;
  } catch (error) {
    console.error(`${shop} UpdateLiquidReplacementMethod error:`, error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: null,
    };
  }
};

export const DeleteLiquidDataByIds = async ({
  shop,
  server,
  ids,
}: {
  shop: string;
  server: string;
  ids: number[];
}) => {
  try {
    const response = await axios({
      url: `${server}/liquid/deleteLiquidDataByIds?shopName=${shop}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      data: ids,
    });

    console.log(`${shop} DeleteLiquidDataByIds: `, response.data);

    return response.data;
  } catch (error) {
    console.error(`${shop} DeleteLiquidDataByIds error:`, error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: null,
    };
  }
};

export const SelectShopNameLiquidData = async ({
  shop,
  server,
}: {
  shop: string;
  server: string;
}) => {
  try {
    const response = await axios({
      url: `${server}/liquid/selectShopNameLiquidData?shopName=${shop}`,
      method: "POST",
    });

    console.log(`${shop} SelectShopNameLiquidData: `, response.data);

    return response.data;
  } catch (error) {
    console.error(`${shop} SelectShopNameLiquidData error:`, error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: null,
    };
  }
};

export const InsertShopNameLiquidData = async ({
  id,
  shop,
  server,
  sourceText,
  targetText,
  replacementMethod,
  languageCode,
}: {
  id?: number;
  shop: string;
  server: string;
  sourceText: string;
  targetText: string;
  replacementMethod: boolean;
  languageCode: string;
}) => {
  try {
    const response = await axios({
      url: `${server}/liquid/insertShopNameLiquidData?shopName=${shop}`,
      method: "POST",
      data: {
        id: id,
        liquidBeforeTranslation: sourceText,
        liquidAfterTranslation: targetText,
        replacementMethod,
        languageCode,
      },
    });

    console.log(`${shop} InsertShopNameLiquidData: `, response.data);

    return response.data;
  } catch (error) {
    console.error(`${shop} InsertShopNameLiquidData error:`, error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: null,
    };
  }
};

export const IsInFreePlanTime = async ({
  shop,
  server,
}: {
  shop: string;
  server: string;
}) => {
  try {
    const response = await axios({
      url: `${server}/userTrials/isInFreePlanTime?shopName=${shop}`,
      method: "POST",
    });

    console.log(`${shop} IsInFreePlanTime: `, response.data);

    return response.data;
  } catch (error) {
    console.error(`${shop} IsInFreePlanTime error:`, error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: null,
    };
  }
};

export const GetAllProgressData = async ({
  shop,
  server,
  source,
}: {
  shop: string;
  server: string;
  source: string;
}) => {
  try {
    const response = await axios({
      url: `${server}/translate/getAllProgressData?shopName=${shop}&source=${source}`,
      method: "POST",
    });

    console.log(`${shop} GetAllProgressData: `, response.data);

    return response.data;
  } catch (error) {
    console.error(`${shop} GetAllProgressData error:`, error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: null,
    };
  }
};

export const IsShowFreePlan = async ({
  shop,
  server,
}: {
  shop: string;
  server: string;
}) => {
  try {
    const response = await axios({
      url: `${server}/userTrials/isShowFreePlan?shopName=${shop}`,
      method: "POST",
    });

    console.log(`${shop} IsShowFreePlan: `, response.data);

    return response.data;
  } catch (error) {
    console.error(`${shop} IsShowFreePlan error:`, error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: "",
    };
  }
};

export const GetLatestActiveSubscribeId = async ({
  shop,
  server,
}: {
  shop: string;
  server: string;
}) => {
  try {
    const response = await axios({
      url: `${server}/orders/getLatestActiveSubscribeId?shopName=${shop}`,
      method: "POST",
    });

    console.log(`${shop} GetLatestActiveSubscribeId: `, response.data);

    return response.data;
  } catch (error) {
    console.error(`${shop} GetLatestActiveSubscribeId error:`, error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: "",
    };
  }
};

export const AddCharsByShopNameAfterSubscribe = async ({
  shop,
  appSubscription,
}: {
  shop: string;
  appSubscription: string;
}) => {
  try {
    const response = await axios({
      url: `${process.env.SERVER_URL}/translationCounter/addCharsByShopNameAfterSubscribe?shopName=${shop}`,
      method: "POST",
      data: {
        subGid: appSubscription, //订阅计划的id
      },
    });

    console.log(`${shop} AddCharsByShopNameAfterSubscribe: `, response.data);

    return response.data;
  } catch (error) {
    console.error(`${shop} AddCharsByShopNameAfterSubscribe error:`, error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: false,
    };
  }
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

export const GetProgressData = async ({
  shopName,
  server,
  source,
  target,
}: {
  shopName: string;
  server: string;
  source: string;
  target: string;
}) => {
  try {
    const response = await axios({
      url: `${server}/translate/getProgressData?shopName=${shopName}&target=${target}&source=${source}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log(`${shopName} GetProgressData: `, response.data);

    return response.data;
  } catch (error) {
    console.error(`${shopName} GetProgressData error:`, error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: {
        RemainingQuantity: 0,
        TotalQuantity: 0,
      },
    };
  }
};

export const StopTranslatingTask = async ({
  shopName,
  source,
}: {
  shopName: string;
  source: string;
}) => {
  try {
    const response = await axios({
      url: `${process.env.SERVER_URL}/translate/stopTranslatingTask?shopName=${shopName}`,
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      data: {
        source: source,
      },
    });

    console.log(`${shopName} StopTranslatingTask: `, response.data);

    return response.data;
  } catch (error) {
    console.error(`${shopName} StopTranslatingTask error:`, error);
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
  try {
    const response = await axios({
      url: `${server}/picture/getPictureDataByShopNameAndResourceIdAndPictureId?shopName=${shopName}`,
      method: "POST",
      data: {
        shopName: shopName,
        imageId: productId,
        languageCode: languageCode,
      },
    });

    console.log("GetProductImageData: ", response.data);

    return response.data;
  } catch (error) {
    console.error("Error GetProductImageData:", error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: [] as any[],
    };
  }
};

export const GetUserValue = async ({
  shop,
  server,
}: {
  shop: string;
  server: string;
}) => {
  try {
    const response = await axios({
      url: `${server}/translate/getUserValue?shopName=${shop}`,
      method: "GET",
    });
    console.log("GetUserValue: ", response.data);
    return response.data;
  } catch (error) {
    console.error("Error GetUserValue:", error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: undefined,
    };
  }
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

export const SingleTextTranslate = async ({
  shopName,
  source,
  target,
  resourceType,
  context,
  key,
  type,
  server,
}: {
  shopName: string;
  source: string;
  target: string;
  resourceType: string;
  context: string;
  key: string;
  type: string;
  server: string;
}) => {
  try {
    const response = await axios({
      url: `${server}/translate/singleTextTranslateV2?shopName=${shopName}`,
      method: "POST",
      data: {
        shopName: shopName,
        source: source,
        target: target,
        resourceType: resourceType,
        context: context,
        key: key,
        type: type,
      },
    });

    console.log(`${shopName} SingleTextTranslate: `, response.data);

    return {
      ...response.data,
      response: response.data?.response?.targetText || "",
    };
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

export const UpdateAutoTranslateByData = async ({
  shopName,
  source,
  target,
  autoTranslate,
  server,
}: {
  shopName: string;
  source: string;
  target: string;
  autoTranslate: boolean;
  server: string;
}) => {
  try {
    const response = await axios({
      url: `${server}/translate/updateAutoTranslateByData `,
      method: "POST",
      data: {
        shopName: shopName,
        source: source,
        target: target,
        autoTranslate: autoTranslate,
      },
    });

    console.log(`${shopName} UpdateAutoTranslateByData: `, response.data);

    return response.data;
  } catch (error) {
    console.error("Error UpdateAutoTranslateByData:", error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: undefined,
    };
  }
};

export const WidgetConfigurations = async ({
  shop,
  server,
}: {
  shop: string;
  server: string;
}) => {
  try {
    const response = await axios({
      url: `${server}/widgetConfigurations/getData`,
      method: "POST",
      data: {
        shopName: shop,
      },
    });

    console.log(`${shop} WidgetConfigurations: `, response.data);

    return response.data;
  } catch (error) {
    console.error("Error WidgetConfigurations:", error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: undefined,
    };
  }
};

export const SaveAndUpdateData = async ({
  shopName,
  server,
  languageSelector,
  currencySelector,
  ipOpen,
  includedFlag,
  fontColor,
  backgroundColor,
  buttonColor,
  buttonBackgroundColor,
  optionBorderColor,
  selectorPosition,
  positionData,
  isTransparent,
}: {
  shopName: string;
  server: string;
  languageSelector: boolean;
  currencySelector: boolean;
  ipOpen: boolean;
  includedFlag: boolean;
  fontColor: string;
  backgroundColor: string;
  buttonColor: string;
  buttonBackgroundColor: string;
  optionBorderColor: string;
  selectorPosition: string;
  positionData: string;
  isTransparent: boolean;
}) => {
  try {
    const response = await axios({
      url: `${server}/widgetConfigurations/saveAndUpdateData`,
      method: "POST",
      data: {
        shopName: shopName,
        languageSelector: languageSelector,
        currencySelector: currencySelector,
        ipOpen: ipOpen,
        includedFlag: includedFlag,
        fontColor: fontColor,
        backgroundColor: backgroundColor,
        buttonColor: buttonColor,
        buttonBackgroundColor: buttonBackgroundColor,
        optionBorderColor: optionBorderColor,
        selectorPosition: selectorPosition,
        positionData: positionData,
        isTransparent: isTransparent,
      },
    });

    console.log(`${shopName} SaveAndUpdateData`);

    return response.data;
  } catch (error) {
    console.error("Error SaveAndUpdateData:", error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: undefined,
    };
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
      url: `${process.env.SERVER_URL}/translate/updateStatus`,
      method: "POST",
      data: {
        shopName: shop,
      },
    });

    console.log(`${shop} UpdateStatus: `, response.data);
  } catch (error) {
    console.error("Error UpdateStatus:", error);
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

//获取用户私人API Key
export const GetUserData = async ({
  shop,
  apiName,
}: {
  shop: string;
  apiName: Number;
}) => {
  try {
    const response = await axios({
      url: `${process.env.SERVER_URL}/private/translate/getUserPrivateData?shopName=${shop}&apiName=${apiName}`,
      method: "POST",
    });
    return response.data;
  } catch (error) {
    console.error("Error GetUserData:", error);
  }
};

//更新用户私人API Key
export const SavePrivateKey = async ({
  shop,
  apiKey,
  count,
  modelVersion,
  keywords,
  apiName,
  apiStatus,
  isSelected,
}: {
  shop: string;
  apiKey?: string;
  count: string; // 前端传递字符串
  modelVersion?: string; // 可选，仅 OpenAI 需要
  keywords: string[];
  apiName: Number;
  apiStatus: boolean;
  isSelected: boolean;
}) => {
  try {
    const response = await axios({
      url: `${process.env.SERVER_URL}/private/translate/configPrivateModel?shopName=${shop}`,
      method: "POST",
      data: {
        shopName: shop,
        apiKey,
        tokenLimit: Number(count), // 转换为数字
        promptWord: keywords,
        ...(modelVersion && { apiModel: modelVersion }), // 仅当 modelVersion 存在时包含
        apiName,
        apiStatus,
        isSelected,
      },
    });
    console.log(`SavePrivateKey [${apiName}]: `, response.data);
    return response.data;
  } catch (error) {
    // console.error(`Error SavePrivateKey [${model}]:`, error);
    throw error; // 抛出错误以便前端捕获
  }
};

//获取最新翻译状态
export const GetTranslateDOByShopNameAndSource = async ({
  shop,
  source,
}: {
  shop: string;
  source: string;
}) => {
  try {
    if (source) {
      const response = await axios({
        url: `${process.env.SERVER_URL}/translate/getTranslateDOByShopNameAndSource`,
        method: "POST",
        data: {
          shopName: shop,
          source: source,
        },
      });
      console.log(`${shop} GetTranslateDOByShopNameAndSource: `, response.data);
      return response.data;
    } else {
      console.warn(`${shop} source disappear`);
      return {
        success: false,
        errorCode: 10001,
        errorMsg: "SERVER_ERROR",
        response: [],
      };
    }
  } catch (error) {
    console.error("Error GetTranslateDOByShopNameAndSource:", error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: [],
    };
  }
};

export const TranslationInterface = async ({
  shop,
  apiName,
  sourceText,
  targetCode,
  prompt,
}: {
  shop: string;
  apiName: Number;
  sourceText: string;
  targetCode?: string;
  prompt?: string;
}) => {
  try {
    const response = await axios({
      url: `${process.env.SERVER_URL}/private/translate/testPrivateModel?shopName=${shop}`,
      method: "POST",
      data: {
        apiName,
        sourceText,
        targetCode,
        prompt,
      },
    });

    console.log("testApiKeyRes", response.data);

    return response.data;
  } catch (error) {
    console.error("Error GetUserInitTokenByShopName:", error);
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
    const shopData = await queryShopBaseConfigData({ shop, accessToken });
    const shopEmail = shopData?.shop?.email;
    const shopOwnerName = shopData?.shop?.shopOwnerName;
    const lastSpaceIndex = shopOwnerName.lastIndexOf(" ");
    const firstName = shopOwnerName.substring(0, lastSpaceIndex);
    const lastName = shopOwnerName.substring(lastSpaceIndex + 1);
    const themesData = shopData?.themes?.nodes?.[0];
    const defaultThemeId = themesData?.id;
    const defaultThemeName = themesData?.name;
    const defaultLanguageData = shopData?.shopLocales?.[0]?.locale;

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
  try {
    const response = await axios({
      url: `${server}/shopify/getUserSubscriptionPlan?shopName=${shop}`,
      method: "GET",
    });

    console.log("GetUserSubscriptionPlan: ", response.data);

    return response.data;
  } catch (error) {
    console.error("Error GetUserSubscriptionPlan:", error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: undefined,
    };
  }
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
  try {
    const response = await axios({
      url: `${server || process.env.SERVER_URL}/shopify/getUserLimitChars?shopName=${shop}`,
      method: "GET",
    });
    console.log("GetUserWords: ", response.data);
    return response.data;
  } catch (error) {
    console.error("Error GetUserWords:", error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: undefined,
    };
  }
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

//查询语言状态
export const GetLanguageList = async ({
  shop,
  server,
  source,
}: {
  shop: string;
  server: string;
  source: string;
}) => {
  try {
    const response = await axios({
      url: `${server}/translate/readInfoByShopName?shopName=${shop}&&source=${source}`,
      method: "GET",
    });

    console.log(`${shop} GetLanguageList: `, response.data);

    return response.data;
  } catch (error) {
    console.error("Error occurred in the languageList:", error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: [],
    };
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

    console.log(`${shop} GetLanguageStatus: `, response.data?.response);

    return response.data;
  } catch (error) {
    console.error("Error GetLanguageStatus:", error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: [],
    };
  }
};

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

//一键全部翻译
export const GetTranslate = async ({
  shop,
  accessToken,
  source,
  target,
  translateSettings1,
  translateSettings2,
  translateSettings3,
  customKey,
  translateSettings5,
}: {
  shop: string;
  accessToken: string;
  source: string;
  target: string[];
  translateSettings1: string;
  translateSettings2: string[];
  translateSettings3: string[];
  customKey: string;
  translateSettings5: boolean;
}) => {
  try {
    console.log(`${shop} GetTranslateData: `, {
      shopName: shop,
      accessToken: accessToken,
      source: source,
      target: target,
      translateSettings1: translateSettings1,
      translateSettings2: translateSettings2.toString(),
      translateSettings3: translateSettings3,
      customKey: customKey,
      isCover: translateSettings5,
    });
    const response = await axios({
      url: `${process.env.SERVER_URL}/${translateSettings1 === "8" || translateSettings1 === "9" ? `privateKey/translate?shopName=${shop}` : `translate/clickTranslation?shopName=${shop}`}`,
      method: "PUT",
      data: {
        shopName: shop,
        accessToken: accessToken,
        source: source,
        target: target,
        isCover: translateSettings5,
        customKey: customKey,
        translateSettings1:
          translateSettings1 === "8" || translateSettings1 === "9"
            ? translateSettings1 === "8"
              ? "0"
              : "1"
            : translateSettings1,
        translateSettings2: translateSettings2.toString(),
        translateSettings3: translateSettings3,
      },
    });
    console.log(`${shop} ${source}翻译${target}`);
    console.log(`${shop} 翻译项: `, translateSettings3);
    console.log(`${shop} 是否覆盖: `, translateSettings5);
    console.log(`${shop} 自定义提示: `, customKey);
    console.log("response", response.data);

    const res = {
      ...response.data,
      response: {
        shopName: shop,
        accessToken: accessToken,
        source: source,
        target: target,
        translateSettings1: translateSettings1,
        translateSettings2: translateSettings2.toString(),
        translateSettings3: translateSettings3,
        customKey: customKey,
        isCover: translateSettings5,
      },
    };
    console.log("GetTranslate: ", res);
    return res;
  } catch (error) {
    console.error("Error GetTranslate:", error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: undefined,
    };
  }
};

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
  try {
    const response = await axios({
      method: "POST",
      url: `${process.env.SERVER_URL}/rating/getRatingInfo?shopName=${shop}&source=${source}`,
    });
    return response.data;
  } catch (error) {
    console.log("get translationQuality score error:", error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: undefined,
    };
  }
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
  try {
    const response = await axios({
      method: "POST",
      url: `${process.env.SERVER_URL}/shopify/getUnTranslatedToken?shopName=${shop}&source=${source}&modelType=${module}`,
      data: {
        accessToken,
      },
    });
    console.log("unTranslated words data", response.data);
    return response.data;
  } catch (error) {
    console.log("get unTranslated words failed:", error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: undefined,
    };
  }
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
  try {
    const response = await axios({
      method: "POST",
      url: `${process.env.SERVER_URL}/getUserDataReport?shopName=${shop}`,
      data: {
        storeLanguage,
        dayData,
        timestamp: new Date().toISOString(),
      },
    });
    console.log("coversion rate data", response.data);
    return response.data;
  } catch (error) {
    console.log("get conversion data failed:", error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: undefined,
    };
  }
};

// 获取用户商店翻译的语言
export const GetStoreLanguage = async ({
  shop,
  source,
}: {
  shop: string;
  source: string;
}) => {
  try {
    const response = await axios({
      method: "POST",
      url: `${process.env.SERVER_URL}/rating/getTranslationStatus?shopName=${shop}&source=${source}`,
    });
    console.log("user stroe language data", response.data);
    return response.data;
  } catch (error) {
    console.log("get conversion data failed:", error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: undefined,
    };
  }
};

// 获取实时翻译指标数据值（四个开关）
export const GetRealTimeQuotaData = async ({ shop }: { shop: string }) => {
  try {
    const response = await axios({
      method: "POST",
      url: `${process.env.SERVER_URL}/rating/getDBConfiguration?shopName=${shop}`,
    });
    console.log("user stroe language data", response.data);
    return response.data;
  } catch (error) {
    console.log("get conversion data failed:", error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: undefined,
    };
  }
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
  try {
    const response = await axios({
      url: `${process.env.SERVER_URL}/currency/initCurrency?shopName=${shop}`,
      method: "Get",
    });

    console.log(`${shop} InitCurrency: `, response.data);

    return response.data;
  } catch (error) {
    console.error("Error InitCurrency:", error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: undefined,
    };
  }
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
    console.log("UpdateDefaultCurrency: ", response.data);
    return response.data;
  } catch (error) {
    console.error("Error UpdateDefaultCurrency:", error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: undefined,
    };
  }
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
  try {
    const response = await axios({
      url: `${process.env.SERVER_URL}/currency/deleteCurrency`,
      method: "DELETE",
      data: {
        shopName: shop,
        id: id,
      },
    });

    console.log(`${shop} DeleteCurrency: `, response.data);

    return response.data;
  } catch (error) {
    console.error("Error DeleteCurrency:", error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: undefined,
    };
  }
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
  try {
    const response = await axios({
      url: `${server}/currency/getCacheData`,
      method: "POST",
      data: {
        shopName: shop,
        currencyCode: currencyCode,
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error GetCacheData:", error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: undefined,
    };
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
    await axios({
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
  } catch (error) {
    console.error("Error InsertOrUpdateOrder:", error);
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
  try {
    const response = await axios({
      url: `${process.env.SERVER_URL}/translationCounter/addCharsByShopName?shopName=${shop}`,
      method: "POST",
      data: {
        shopName: shop,
        chars: amount,
        gid: gid,
      },
    });
    console.log(`${shop} AddCharsByShopName:`, response.data);

    return response.data;
  } catch (error) {
    console.error("Error AddCharsByShopName:", error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: undefined,
    };
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
    console.log(`${shop} SendPurchaseSuccessEmail: `, response.data);
  } catch (error) {
    console.error("Error SendPurchaseSuccessEmail:", error);
  }
};

export const GetGlossaryByShopName = async ({
  shop,
  server,
}: {
  shop: string;
  server: string;
}) => {
  try {
    const response = await axios({
      url: `${server}/glossary/getGlossaryByShopName?shopName=${shop}`,
      method: "GET",
    });

    console.log(`${shop} GetGlossaryByShopName: `, response.data);

    return response.data;
  } catch (error) {
    console.error("Error GetGlossaryByShopName:", error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: [],
    };
  }
};

export const GetGlossaryByShopNameLoading = async ({
  shop,
  accessToken,
}: {
  shop: string;
  accessToken: string;
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

    const res = response.data?.response?.map((item: any) => {
      let data = {
        key: item?.id,
        status: item?.status,
        sourceText: item?.sourceText,
        targetText: item?.targetText,
        language: "",
        rangeCode: item?.rangeCode,
        type: item?.caseSensitive,
        loading: false,
        createdDate: item?.createdDate,
      };
      if (
        shopLanguagesWithoutPrimaryIndex.find((language: ShopLocalesType) => {
          return language?.locale == item?.rangeCode;
        }) ||
        item?.rangeCode === "ALL"
      ) {
        data = {
          ...data,
          language:
            shopLanguagesWithoutPrimaryIndex.find(
              (language: ShopLocalesType) => {
                return language?.locale === item?.rangeCode;
              },
            )?.name || "All Languages",
        };
      }
      return data;
    });

    // 按创建时间降序排序
    const sortedRes = res.sort(
      (a: { createdDate: string }, b: { createdDate: string }) => {
        return (
          new Date(b.createdDate)?.getTime() -
          new Date(a.createdDate)?.getTime()
        );
      },
    );

    console.log(`${shop} GetGlossaryByShopName: `, sortedRes);

    return {
      success: true,
      errorCode: 10001,
      errorMsg: "",
      response: {
        glossaryTableData: sortedRes,
        shopLocales: shopLanguagesWithoutPrimaryIndex,
      },
    };
  } catch (error) {
    console.error("Error GetGlossaryByShopName:", error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: undefined,
    };
  }
};

export const UpdateTargetTextById = async ({
  shop,
  data,
  server,
}: {
  shop: string;
  data: any;
  server: string;
}) => {
  try {
    const response = await axios({
      url: `${server}/glossary/updateTargetTextById`,
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

    console.log("UpdateTargetTextById: ", res);

    return res;
  } catch (error) {
    console.error("Error UpdateTargetTextById:", error);
  }
};

export const InsertGlossaryInfo = async ({
  shop,
  sourceText,
  targetText,
  rangeCode,
  type,
  server,
}: {
  shop: string;
  sourceText: string;
  targetText: string;
  rangeCode: string;
  type: number;
  server: string;
}) => {
  try {
    const response = await axios({
      url: `${server}/glossary/insertGlossaryInfo`,
      method: "POST",
      data: {
        shopName: shop,
        sourceText: sourceText,
        targetText: targetText,
        rangeCode: rangeCode,
        caseSensitive: type,
        status: 1,
      },
    });

    const res = response.data;

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

    return res;
  } catch (error) {
    console.error("Error DeleteGlossaryInfo:", error);
  }
};

export const GetSwitchId = async ({ shopName }: { shopName: string }) => {
  try {
    const response = await axios({
      url: `${process.env.SERVER_URL}/IpSwitch/getSwitchId?shopName=${shopName}`,
      method: "GET",
    });
    const res = response.data;
    if (res.response) {
      return res.response;
    } else {
      return false;
    }
  } catch (error) {
    console.error("Error InsertSwitch:", error);
  }
};

export const InsertSwitch = async ({
  shopName,
  switchId,
}: {
  shopName: string;
  switchId: number;
}) => {
  try {
    const response = await axios({
      url: `${process.env.SERVER_URL}/IpSwitch/insertSwitch`,
      method: "POST",
      data: {
        shopName: shopName,
        switchId: switchId,
      },
    });
    const res = response.data;
    return res;
  } catch (error) {
    console.error("Error InsertSwitch:", error);
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
