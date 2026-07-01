/** 全量 v4：店面 Switcher / Liquid / PageFly 均走 TSF（Prisma）。 */
export async function isStorefrontGrayEligible(_shop: string): Promise<boolean> {
  return true;
}

export async function isPageFlyGrayEligible(_shop: string): Promise<boolean> {
  return true;
}
