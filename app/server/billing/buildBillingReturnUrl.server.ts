import { BillingError, BILLING_ERROR_CODE } from "./errors.server";

export const SHOPIFY_BILLING_RETURN_URL_MAX_LENGTH = 255;

export const BILLING_PAGE_PATH = "/app/pricing";

export const BILLING_RETURN_QUERY_FLAG = "billing_return";

export function isBillingReturnRequest(request: Request): boolean {
  return (
    new URL(request.url).searchParams.get(BILLING_RETURN_QUERY_FLAG) === "1"
  );
}

export function buildShopifyAdminHostParam(shop: string): string {
  const shopDomain = shop.includes(".") ? shop : `${shop}.myshopify.com`;
  return Buffer.from(`${shopDomain}/admin`, "utf-8").toString("base64");
}

function resolveHostParam(shop: string, incoming: URL): string {
  const fromRequest = incoming.searchParams.get("host");
  if (fromRequest) return fromRequest;
  return buildShopifyAdminHostParam(shop);
}

function resolveAppOrigin(request: Request): string {
  const configured = process.env.SHOPIFY_APP_URL?.trim();
  if (configured) {
    const withProtocol = configured.startsWith("http")
      ? configured
      : `https://${configured}`;
    return new URL(withProtocol).origin;
  }
  return new URL(request.url).origin;
}

function shopifyAdminStoreHandle(shop: string): string {
  return shop.replace(/\.myshopify\.com$/i, "");
}

function resolveAdminAppIdentifier(request: Request): string | null {
  const configured =
    process.env.SHOPIFY_ADMIN_APP_HANDLE?.trim() ||
    process.env.HANDLE?.trim() ||
    process.env.SHOPIFY_API_KEY?.trim();
  return configured || null;
}

function buildAdminEmbeddedBillingReturnUrl(
  path: string,
  request: Request,
  shop: string,
): string | null {
  const appIdentifier = resolveAdminAppIdentifier(request);
  if (!appIdentifier) return null;

  const url = new URL(
    `/store/${shopifyAdminStoreHandle(shop)}/apps/${encodeURIComponent(appIdentifier)}${path}`,
    "https://admin.shopify.com",
  );
  url.searchParams.set(BILLING_RETURN_QUERY_FLAG, "1");
  return url.toString();
}

function applyBillingReturnQuery(url: URL, shop: string, incoming: URL): void {
  url.searchParams.set("shop", shop);
  url.searchParams.set(BILLING_RETURN_QUERY_FLAG, "1");
  url.searchParams.set("embedded", "1");
  url.searchParams.set("host", resolveHostParam(shop, incoming));
}

export function buildBillingReturnUrl(
  path: string,
  request: Request,
  shop: string,
): string {
  const adminReturnUrl = buildAdminEmbeddedBillingReturnUrl(path, request, shop);
  if (
    adminReturnUrl &&
    adminReturnUrl.length <= SHOPIFY_BILLING_RETURN_URL_MAX_LENGTH
  ) {
    return adminReturnUrl;
  }

  const origin = resolveAppOrigin(request);
  const incoming = new URL(request.url);

  const url = new URL(path, origin);
  applyBillingReturnQuery(url, shop, incoming);

  const returnUrl = url.toString();
  if (returnUrl.length <= SHOPIFY_BILLING_RETURN_URL_MAX_LENGTH) {
    return returnUrl;
  }

  const minimal = new URL(path, origin);
  minimal.searchParams.set("shop", shop);
  minimal.searchParams.set("embedded", "1");
  minimal.searchParams.set("host", resolveHostParam(shop, incoming));
  const minimalUrl = minimal.toString();
  if (minimalUrl.length <= SHOPIFY_BILLING_RETURN_URL_MAX_LENGTH) {
    return minimalUrl;
  }

  throw new BillingError(
    `Billing returnUrl exceeds Shopify limit (${SHOPIFY_BILLING_RETURN_URL_MAX_LENGTH} chars)`,
    BILLING_ERROR_CODE.SHOPIFY_BILLING_FAILED,
    400,
    { returnUrlLength: minimalUrl.length },
  );
}
