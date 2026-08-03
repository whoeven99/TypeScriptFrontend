import prisma from "~/db.server";
import { buildShopProfilePromptBlock } from "./shopProfilePrompt.server";

export async function loadShopProfilePromptBlock(
  shop: string,
): Promise<string | undefined> {
  const normalizedShop = shop.trim();
  if (!normalizedShop) return undefined;

  try {
    const profile = await prisma.shopProfile.findUnique({
      where: { shop: normalizedShop },
      select: {
        industry: true,
        keywords: true,
        description: true,
        brandTone: true,
      },
    });

    if (!profile) return undefined;

    return (
      buildShopProfilePromptBlock({
        industry: profile.industry,
        keywords: Array.isArray(profile.keywords)
          ? (profile.keywords as string[])
          : [],
        description: profile.description,
        brandTone: profile.brandTone,
      }) ?? undefined
    );
  } catch (error) {
    console.error("[single] load ShopProfile prompt block failed", {
      shop: normalizedShop,
      error,
    });
    return undefined;
  }
}
