import prisma from "~/db.server";
import { appendCommonEventLog, COMMON_EVENT_TYPE } from "~/server/commonEventLog/commonEventLog.server";
import { hasInstallTrialGranted } from "~/server/onboarding/onboarding.server";
import { isTsfBillingShop } from "./isTsfBillingShop.server";

export type BillingRoute = "tsf" | "java";

export async function hasTsfOnboardingMarkers(shop: string): Promise<boolean> {
  const settings = await prisma.shopTranslationSettings.findUnique({
    where: { shop },
    select: { migratedToTsf: true },
  });
  if (settings?.migratedToTsf) return true;
  return hasInstallTrialGranted(shop);
}

/** 读取已缓存的计费分流结果（避免重复调 Java InitializationDetection）。 */
export async function getCachedBillingRoute(
  shop: string,
): Promise<BillingRoute | null> {
  const row = await prisma.commonEventLog.findFirst({
    where: {
      shop,
      eventType: COMMON_EVENT_TYPE.BILLING_ROUTE_RESOLVED,
    },
    orderBy: { createdAt: "desc" },
    select: { metadata: true },
  });
  if (!row?.metadata || typeof row.metadata !== "object") return null;
  const route = (row.metadata as { route?: string }).route;
  if (route === "tsf" || route === "java") return route;
  return null;
}

export async function persistBillingRoute(
  shop: string,
  route: BillingRoute,
): Promise<void> {
  await appendCommonEventLog({
    shop,
    eventType: COMMON_EVENT_TYPE.BILLING_ROUTE_RESOLVED,
    metadata: { route },
  });
}

/**
 * 是否走 TSF 本地计费/bootstrap/quota（新用户路径）。
 * 有 Account、已迁移、已发过试用、或已缓存 tsf 路由 → true。
 */
export async function usesTsfBilling(shop: string): Promise<boolean> {
  if (await isTsfBillingShop(shop)) return true;
  if (await hasTsfOnboardingMarkers(shop)) return true;
  const cached = await getCachedBillingRoute(shop);
  return cached === "tsf";
}
