import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import {
  buildTranslateV4Error,
  TRANSLATE_V4_ERROR_KEYS,
} from "~/utils/translateV4Errors";

export const action = async ({ request }: ActionFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { admin } = adminAuthResult;
  const { shop } = adminAuthResult.session;
  const formData = await request.formData();

  const webPresencesData = JSON.parse(
    formData.get("webPresencesData") as string,
  );

  const publishInfo = JSON.parse(formData.get("publishInfo") as string);

  try {
    const promises = [];
    if (webPresencesData) {
      const webPresencesPromise = webPresencesData.map(async (item: any) => {
        return await admin
          .graphql(
            `#graphql
                  mutation webPresenceUpdate($id: ID!, $input: WebPresenceUpdateInput!) {
                    webPresenceUpdate(id: $id, input: $input) {
                      userErrors {
                        field
                        message
                      }
                      webPresence {
                        id
                        defaultLocale{
                          locale
                        }
                        domain {
                          id
                          host
                          localization {
                            alternateLocales
                          }
                        }
                      }
                    }
                  }`,
            {
              variables: {
                id: item.id,
                input: {
                  alternateLocales: item.alternateLocales,
                },
              },
            },
          )
          .then((response) => response.json())
          .catch((error) => {
            console.error("Error webPresencesUpdate: ", error);
            return undefined;
          });
      });

      promises.push(...webPresencesPromise);
    }

    if (publishInfo) {
      const publishPromise = await admin
        .graphql(
          `#graphql 
        mutation shopLocaleUpdate($locale: String!, $shopLocale: ShopLocaleInput!) {
          shopLocaleUpdate(locale: $locale, shopLocale: $shopLocale){
            userErrors {
              field
              message
            }
            shopLocale {
              published
              primary
              name
              locale
            }
          }
        }`,
          {
            variables: {
              locale: publishInfo.locale,
              shopLocale: {
                published: publishInfo.shopLocale.published,
              },
            },
          },
        )
        .then((response) => response.json())
        .catch((error) => {
          console.error("Error publishInfo: ", error);
          return undefined;
        });

      promises.push(publishPromise);
    }
    // 并发执行所有请求
    const results: any = await Promise.allSettled(promises);

    const successRes = results.filter(
      (item: any) =>
        item.status === "fulfilled" &&
        (!item?.value?.data?.webPresenceUpdate?.userErrors?.length ||
          !item?.value?.data?.shopLocaleUpdate?.userErrors?.length),
    );

    const failRes: any = results.filter(
      (item: any) =>
        item.status !== "fulfilled" ||
        item?.value?.data?.webPresenceUpdate?.userErrors?.length ||
        item?.value?.data?.shopLocaleUpdate?.userErrors?.length,
    );

    const shopLocaleUpdate = successRes?.filter(
      (item: any) => item?.value?.data?.shopLocaleUpdate,
    );

    const webPresenceUpdate = successRes?.filter(
      (item: any) => item?.value?.data?.webPresenceUpdate,
    );

    if (successRes?.length) {
      if (!failRes?.length) {
        return {
          success: true,
          errorCode: 0,
          errorMsg: "",
          response: {
            shopLocaleUpdate,
            webPresenceUpdate,
          },
        };
      } else {
        console.log(
          `应用日志: ${shop} 语言绑定时报错: ${failRes
            ?.map(
              (item: any) =>
                item?.value?.data?.webPresenceUpdate?.userErrors || [],
            )
            ?.flat()
            ?.map((err: any) => (typeof err === "string" ? err : err.message)) // 兼容字符串/对象
            ?.filter(Boolean)
            ?.join(", ")}`,
        );
        const appError = buildTranslateV4Error(
          TRANSLATE_V4_ERROR_KEYS.LANGUAGE_PUBLISH_PARTIAL_FAILED,
        );

        return {
          success: true,
          errorCode: appError.errorCode,
          errorMsg: appError.errorMsg,
          response: {
            shopLocaleUpdate,
            webPresenceUpdate,
          },
        };
      }
    } else {
      console.log(
        `应用日志: ${shop} 语言绑定时报错: ${failRes
          ?.map(
            (item: any) =>
              item?.value?.data?.webPresenceUpdate?.userErrors || [],
          )
          ?.flat()
          ?.map((err: any) => (typeof err === "string" ? err : err.message)) // 兼容字符串/对象
          ?.filter(Boolean)
          ?.join(", ")}`,
      );
      const appError = buildTranslateV4Error(
        TRANSLATE_V4_ERROR_KEYS.LANGUAGE_PUBLISH_FAILED,
      );

      return {
        success: false,
        errorCode: appError.errorCode,
        errorMsg: appError.errorMsg,
        response: undefined,
      };
    }
  } catch (error) {
    console.error("Error publishAction:", error);
    const appError = buildTranslateV4Error(
      TRANSLATE_V4_ERROR_KEYS.LANGUAGE_PUBLISH_FAILED,
    );
    return {
      success: false,
      errorCode: appError.errorCode,
      errorMsg: appError.errorMsg,
      response: undefined,
    };
  }
};
