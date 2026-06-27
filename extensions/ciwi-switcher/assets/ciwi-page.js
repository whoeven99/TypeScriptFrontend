/** Shared TTL for storefront translation/image payloads (matches switcher config). */
export const CIWI_TRANSLATION_TTL_MS = 1000 * 60 * 60;

export function buildTranslationCacheKey(prefix, parts) {
  return `ciwi_${prefix}:${parts.filter(Boolean).join(":")}`;
}

/**
 * Resolve storefront page context from Liquid hidden inputs with Shopify global fallbacks.
 */
export function getCiwiPageContext(ciwiBlock) {
  const readInput = (name) =>
    ciwiBlock?.querySelector(`input[name="${name}"]`)?.value?.trim() || "";

  const pageType =
    readInput("page_type") ||
    window.Shopify?.Analytics?.meta?.page?.pageType ||
    window.Shopify?.theme?.pageType ||
    "";

  const templateName =
    readInput("template_name") ||
    window.Shopify?.theme?.template ||
    "";

  const productId = readInput("product_id");

  const isProductPage =
    pageType === "product" ||
    templateName === "product" ||
    Boolean(productId);

  const isHomePage =
    pageType === "index" ||
    templateName === "index";

  const hasPageFly = Boolean(
    document.querySelector('[data-pf-type], .__pf') ||
      document.querySelector(
        '[id*="pagefly"], [class*="pagefly"], [class*="PageFly"]',
      ),
  );

  return {
    pageType,
    templateName,
    productId,
    isProductPage,
    isHomePage,
    hasPageFly,
  };
}

/** Normalize API payloads so useCacheThenRefresh/setWithTTL can persist them. */
export function asCacheableTranslationResponse(data) {
  if (!data || data.success === false) return data;
  if (data.success === true) return data;
  if (data.response !== undefined) return { success: true, ...data };
  return data;
}
