import prisma from "~/db.server";

/** 首次进入 v4 时确保 ShopTranslationSettings 存在（幂等）。 */
export async function ensureShopV4Settings(
  shop: string,
  primaryLocale = "en",
): Promise<void> {
  await prisma.shopTranslationSettings.upsert({
    where: { shop },
    create: {
      shop,
      primaryLocale,
      targets: [],
      autoTranslate: false,
    },
    update: { primaryLocale },
  });
}
