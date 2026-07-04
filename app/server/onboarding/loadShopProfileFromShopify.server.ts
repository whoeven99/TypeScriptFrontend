import { queryShopBaseConfigData } from "~/api/admin";
import type { UpsertShopProfileParams } from "./onboarding.server";

export async function loadShopProfileFieldsFromShopify(params: {
  shop: string;
  accessToken: string;
}): Promise<Omit<UpsertShopProfileParams, "shop"> | null> {
  const shopData = await queryShopBaseConfigData({
    shop: params.shop,
    accessToken: params.accessToken,
  });
  if (!shopData?.shop) {
    return null;
  }

  const shopOwnerName = shopData.shop.shopOwnerName ?? "";
  const lastSpaceIndex = shopOwnerName.lastIndexOf(" ");
  const firstName =
    lastSpaceIndex > 0
      ? shopOwnerName.substring(0, lastSpaceIndex)
      : shopOwnerName;
  const lastName =
    lastSpaceIndex > 0 ? shopOwnerName.substring(lastSpaceIndex + 1) : "";
  const themesData = shopData.themes?.nodes?.[0];
  const defaultLanguageData = shopData.shopLocales?.find(
    (item: { primary?: boolean }) => item?.primary,
  )?.locale;

  return {
    accessToken: params.accessToken,
    email: shopData.shop.email ?? "",
    firstName: firstName || "",
    lastName: lastName || "",
    userTag: shopOwnerName,
    defaultThemeId: themesData?.id ?? null,
    defaultThemeName: themesData?.name ?? null,
    defaultLanguage: defaultLanguageData ?? null,
  };
}
