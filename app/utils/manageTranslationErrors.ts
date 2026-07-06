import type { TFunction } from "i18next";

export const MANAGE_TRANSLATION_ERROR_KEYS = {
  RATE_LIMITED: "RATE_LIMITED",
  SERVER_ERROR: "SERVER_ERROR",
} as const;

function safeStringify(value: unknown, replacer?: any): string {
  try {
    return JSON.stringify(value, replacer, 2);
  } catch {
    return "[unserializable]";
  }
}

function collectErrorTexts(error: unknown): string[] {
  const e = error as any;
  const texts: string[] = [];

  const push = (value: unknown) => {
    if (typeof value === "string" && value.trim()) texts.push(value);
  };

  push(e?.name);
  push(e?.message);
  push(e?.statusText);
  push(e?.response?.statusText);
  push(e?.body?.message);

  if (typeof e?.networkStatusCode === "number") {
    texts.push(String(e.networkStatusCode));
  }
  if (typeof e?.response?.status === "number") {
    texts.push(String(e.response.status));
  }

  const graphQLErrors = [
    ...(Array.isArray(e?.graphQLErrors) ? e.graphQLErrors : []),
    ...(Array.isArray(e?.errors?.graphQLErrors) ? e.errors.graphQLErrors : []),
    ...(Array.isArray(e?.body?.errors) ? e.body.errors : []),
  ];

  for (const item of graphQLErrors) {
    push(item?.message);
    push(item?.extensions?.code);
    push(item?.extensions?.status);
  }

  return texts;
}

export function isManageTranslationRateLimitedError(error: unknown): boolean {
  const texts = collectErrorTexts(error).join(" ").toLowerCase();
  return /429|throttl|rate limit|too many requests|max cost exceeded/.test(texts);
}

export function logManageTranslationGraphQLErrorDetail(
  context: string,
  error: unknown,
): void {
  const e = error as any;
  const response = e?.response;
  const responseHeaders =
    typeof response?.headers?.get === "function"
      ? {
          requestId: response.headers.get("x-request-id"),
          apiVersion: response.headers.get("x-shopify-api-version"),
          apiVersionWarning: response.headers.get(
            "x-shopify-api-version-warning",
          ),
        }
      : undefined;

  const graphQLErrorList = [
    ...(Array.isArray(e?.graphQLErrors) ? e.graphQLErrors : []),
    ...(Array.isArray(e?.errors?.graphQLErrors) ? e.errors.graphQLErrors : []),
    ...(Array.isArray(e?.body?.errors) ? e.body.errors : []),
  ];

  const graphQLErrors = graphQLErrorList.map((gqlError: any) => ({
    message: gqlError?.message,
    path: gqlError?.path,
    extensions: gqlError?.extensions,
    locations: gqlError?.locations,
  }));

  console.error(`[${context}] GraphQL request failed`, {
    name: e?.name,
    message: e?.message,
    networkStatusCode: e?.networkStatusCode ?? e?.errors?.networkStatusCode,
    response: response
      ? {
          status: response?.status,
          statusText: response?.statusText,
          url: response?.url,
          headers: responseHeaders,
        }
      : undefined,
    stack: e?.stack,
  });
  console.error(
    `[${context}] graphQLErrors_full=${safeStringify(graphQLErrors)}`,
  );
  graphQLErrors.forEach((item: any, index: number) => {
    console.error(`[${context}] graphQLError[${index}]`, item);
  });
  console.error(
    `[${context}] rawError_full=${safeStringify(
      e,
      Object.getOwnPropertyNames(e || {}),
    )}`,
  );
  console.error(`[${context}] rawError`, e);
}

export function getManageTranslationLoadErrorMessage(
  t: TFunction,
  errorMsg?: string | null,
): string {
  if (errorMsg === MANAGE_TRANSLATION_ERROR_KEYS.RATE_LIMITED) {
    return t("Shopify is temporarily rate limiting requests. Please try again shortly.");
  }
  return t("Failed to load data. Please try again.");
}
