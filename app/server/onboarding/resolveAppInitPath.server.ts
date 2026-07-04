import { InitializationDetection } from "~/api/JavaServer";
import {
  getCachedBillingRoute,
  hasTsfOnboardingMarkers,
  persistBillingRoute,
  type BillingRoute,
} from "~/server/billing/billingRoute.server";
import { isTsfBillingShop } from "~/server/billing/isTsfBillingShop.server";

export type AppInitPath = BillingRoute;

/**
 * 决定安装/init 走 TSF 还是 Java：
 * - 已有 Turso Account / TSF onboarding 标记 / 缓存 tsf → TSF
 * - Java 已有计费/额度记录 → Java（老用户，Phase 1 不迁）
 * - 其余（全新安装）→ TSF（结果写入 CommonEventLog，避免重复探测 Java）
 */
export async function resolveAppInitPath(shop: string): Promise<AppInitPath> {
  if (await isTsfBillingShop(shop)) {
    return "tsf";
  }

  const cached = await getCachedBillingRoute(shop);
  if (cached) {
    return cached;
  }

  if (await hasTsfOnboardingMarkers(shop)) {
    await persistBillingRoute(shop, "tsf");
    return "tsf";
  }

  try {
    const init = await InitializationDetection({ shop });
    if (init?.success && init.response) {
      const legacy =
        Boolean(init.response.insertCharsByShopName) ||
        Boolean(init.response.addUserSubscriptionPlan);
      if (legacy) {
        await persistBillingRoute(shop, "java");
        return "java";
      }
    }
  } catch (error) {
    console.warn(`[onboarding] InitializationDetection failed shop=${shop}:`, error);
  }

  await persistBillingRoute(shop, "tsf");
  return "tsf";
}
