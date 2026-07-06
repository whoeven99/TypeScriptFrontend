import type { TFunction } from "i18next";

export const MANAGE_TRANSLATION_ERROR_KEYS = {
  RATE_LIMITED: "RATE_LIMITED",
  SERVER_ERROR: "SERVER_ERROR",
} as const;

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

export function getManageTranslationLoadErrorMessage(
  t: TFunction,
  errorMsg?: string | null,
): string {
  if (errorMsg === MANAGE_TRANSLATION_ERROR_KEYS.RATE_LIMITED) {
    return t("Shopify is temporarily rate limiting requests. Please try again shortly.");
  }
  return t("Failed to load data. Please try again.");
}
