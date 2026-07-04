import type { ActionFunctionArgs } from "@remix-run/node";
import { queryNextTransType, queryPreviousTransType } from "~/api/admin";
import { authenticate } from "~/shopify.server";
import { registerManageTranslations } from "~/server/shopify/translations.server";
import { getManageTranslationLanguage } from "./manageTranslationRoute.server";

export type SeoContentResourceActionConfig = {
  resourceType: string;
};

function parseFormJson<T>(formData: FormData, key: string, fallback: T): T {
  const raw = formData.get(key);
  if (raw == null || raw === "") return fallback;
  try {
    return JSON.parse(String(raw)) as T;
  } catch {
    return fallback;
  }
}

export function createSeoContentResourceAction(
  config: SeoContentResourceActionConfig,
) {
  return async ({ request }: ActionFunctionArgs) => {
    const searchTerm = getManageTranslationLanguage(request);
    const adminAuthResult = await authenticate.admin(request);
    const { shop, accessToken } = adminAuthResult.session;
    const { admin } = adminAuthResult;

    const formData = await request.formData();
    const startCursor = parseFormJson<{ cursor?: string } | null>(
      formData,
      "startCursor",
      null,
    );
    const endCursor = parseFormJson<{ cursor?: string } | null>(
      formData,
      "endCursor",
      null,
    );
    const confirmData = parseFormJson<any[]>(formData, "confirmData", []);
    const refreshResourceIds = parseFormJson<string[]>(
      formData,
      "refreshResourceIds",
      [],
    );

    if (startCursor) {
      try {
        const response = await queryPreviousTransType({
          shop,
          accessToken: accessToken as string,
          resourceType: config.resourceType,
          startCursor: startCursor.cursor,
          locale: searchTerm || "",
        });
        return { success: true, errorCode: 0, errorMsg: "", response };
      } catch (error) {
        console.error("[manageTranslation] previous page failed:", error);
        return {
          success: false,
          errorCode: 10001,
          errorMsg: "SERVER_ERROR",
          response: undefined,
        };
      }
    }

    if (endCursor) {
      try {
        const response = await queryNextTransType({
          shop,
          accessToken: accessToken as string,
          resourceType: config.resourceType,
          endCursor: endCursor.cursor,
          locale: searchTerm || "",
        });
        return { success: true, errorCode: 0, errorMsg: "", response };
      } catch (error) {
        console.error("[manageTranslation] next page failed:", error);
        return {
          success: false,
          errorCode: 10001,
          errorMsg: "SERVER_ERROR",
          response: undefined,
        };
      }
    }

    if (refreshResourceIds.length > 0) {
      try {
        const response = await admin.graphql(
          `#graphql
            query refreshSeoContentResources($resourceIds: [ID!]!, $locale: String!) {
              translatableResourcesByIds(resourceIds: $resourceIds, first: 250) {
                nodes {
                  resourceId
                  translatableContent {
                    key
                    digest
                    locale
                    type
                    value
                  }
                  translations(locale: $locale) {
                    key
                    value
                  }
                }
              }
            }`,
          {
            variables: {
              resourceIds: refreshResourceIds,
              locale: searchTerm || "",
            },
          },
        );
        const data = await response.json();
        return {
          success: true,
          errorCode: 0,
          errorMsg: "",
          response: {
            nodes: data.data?.translatableResourcesByIds?.nodes || [],
            pageInfo: null,
          },
        };
      } catch (error) {
        console.error("[manageTranslation] refresh current page failed:", error);
        return {
          success: false,
          errorCode: 10001,
          errorMsg: "SERVER_ERROR",
          response: undefined,
        };
      }
    }

    if (confirmData.length > 0) {
      const data = await registerManageTranslations({
        admin,
        shop,
        confirmData,
      });

      return {
        success: true,
        errorCode: 0,
        errorMsg: "",
        response: data,
      };
    }

    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: null,
    };
  };
}
