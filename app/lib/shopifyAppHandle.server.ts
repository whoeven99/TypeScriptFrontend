import { normalizeEnvValue } from "~/config/runtimeEnv.server";

/** Partners app handle by API key (see shopify.app.*.toml). */
const APP_HANDLE_BY_API_KEY: Record<string, string> = {
  dec512b68e658e4f21588e3d4de0e748: "ciwi-test",
  fb9fc15cbec02bd735e2a5b491cf8409: "ciwi-translator",
};

/** Shopify Admin embedded return URL segment: /apps/{handle}/... */
export function resolveShopifyAppHandle(): string {
  const explicit =
    normalizeEnvValue(process.env.SHOPIFY_APP_HANDLE) ||
    normalizeEnvValue(process.env.HANDLE);
  if (explicit) return explicit;

  const apiKey = normalizeEnvValue(process.env.SHOPIFY_API_KEY);
  return APP_HANDLE_BY_API_KEY[apiKey] ?? "ciwi-translator";
}

export function buildShopifyEmbeddedAppReturnUrl(
  shop: string,
  appPath: string,
): URL {
  const storeHandle = shop.split(".")[0];
  const handle = resolveShopifyAppHandle();
  return new URL(
    `https://admin.shopify.com/store/${storeHandle}/apps/${handle}${appPath}`,
  );
}
