import { isV2PageWhitelistShop } from "~/server/translateV4/v2PageWhitelist";

/**
 * Widget / Liquid / Switcher 是否走 TSF（v4）：
 * 默认走 v4；只有 v2PageWhitelist 中的店铺回退到 Java。
 */
export async function isStorefrontGrayEligible(shop: string): Promise<boolean> {
  return !isV2PageWhitelistShop(shop);
}

/**
 * PageFly 是否走 TSF（v4）：
 * 默认走 v4；只有 v2PageWhitelist 中的店铺回退到 Java。
 */
export async function isPageFlyGrayEligible(shop: string): Promise<boolean> {
  return !isV2PageWhitelistShop(shop);
}
