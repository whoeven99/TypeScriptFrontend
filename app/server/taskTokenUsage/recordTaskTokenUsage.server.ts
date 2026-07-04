import prisma from "~/db.server";
import type { ParsedTokenUsage } from "./parseUsageMetadata.server";

export async function recordTaskTokenUsage(params: {
  shop: string;
  usage: ParsedTokenUsage;
}): Promise<void> {
  const shop = params.shop.trim();
  if (!shop || params.usage.totalTokens <= 0) return;

  try {
    await prisma.account.upsert({
      where: { shop },
      create: {
        shop,
        usedTokens: params.usage.totalTokens,
      },
      update: {
        usedTokens: { increment: params.usage.totalTokens },
      },
    });
  } catch (error) {
    console.error("[TaskTokenUsage] recordTaskTokenUsage failed:", error);
  }
}
