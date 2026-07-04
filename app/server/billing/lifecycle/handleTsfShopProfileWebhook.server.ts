import prisma from "~/db.server";
import { loadShopProfileFieldsFromShopify } from "~/server/onboarding/loadShopProfileFromShopify.server";
import { upsertShopProfile } from "~/server/onboarding/onboarding.server";
import { resolveOfflineAccessToken } from "~/server/translateV4/token.server";

async function refreshShopProfileFromShopify(params: {
  shop: string;
  fallbackAccessToken?: string;
}): Promise<void> {
  const accessToken =
    (await resolveOfflineAccessToken(params.shop, params.fallbackAccessToken)) ??
    params.fallbackAccessToken;
  if (!accessToken) {
    console.warn(`[Billing] shop webhook skip — no accessToken shop=${params.shop}`);
    return;
  }

  const fields = await loadShopProfileFieldsFromShopify({
    shop: params.shop,
    accessToken,
  });
  if (!fields) return;

  await upsertShopProfile({ shop: params.shop, ...fields });

  if (fields.defaultLanguage) {
    await prisma.shopTranslationSettings.updateMany({
      where: { shop: params.shop, migratedToTsf: true },
      data: { primaryLocale: fields.defaultLanguage },
    });
  }
}

/** TSF 用户 SHOP_UPDATE / THEMES_PUBLISH：刷新 ShopProfile，不转发 Java。 */
export async function handleTsfShopProfileWebhook(params: {
  shop: string;
  sessionAccessToken?: string;
}): Promise<void> {
  await refreshShopProfileFromShopify({
    shop: params.shop,
    fallbackAccessToken: params.sessionAccessToken,
  });
}