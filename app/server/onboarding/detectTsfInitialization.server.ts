import prisma from "~/db.server";
import { hasInstallTrialGranted } from "./onboarding.server";

/** 对齐 Java InitializationDetection 字段语义：true = 已完成，可跳过。 */
export type TsfInitializationDetection = {
  insertCharsByShopName: boolean;
  addUserSubscriptionPlan: boolean;
  addDefaultLanguagePack: boolean;
};

export async function detectTsfInitialization(
  shop: string,
): Promise<TsfInitializationDetection> {
  const [trialGranted, languagePack, subscription] = await Promise.all([
    hasInstallTrialGranted(shop),
    prisma.shopLanguagePack.findUnique({
      where: { shop },
      select: { shop: true },
    }),
    prisma.appSubscription.findUnique({
      where: { shop },
      select: { shop: true },
    }),
  ]);

  return {
    insertCharsByShopName: trialGranted,
    addUserSubscriptionPlan: subscription != null,
    addDefaultLanguagePack: languagePack != null,
  };
}
