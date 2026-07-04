import { InitializationDetection } from "~/api/JavaServer";
import { isTsfBillingShop } from "~/server/billing/isTsfBillingShop.server";

export type AppInitPath = "tsf" | "java";

/**
 * 决定安装/init 走 TSF 还是 Java：
 * - 已有 Turso Account → TSF
 * - Java 已有计费/额度记录 → Java（老用户，Phase 1 不迁）
 * - 其余（全新安装）→ TSF
 */
export async function resolveAppInitPath(shop: string): Promise<AppInitPath> {
  if (await isTsfBillingShop(shop)) {
    return "tsf";
  }

  try {
    const init = await InitializationDetection({ shop });
    if (init?.success && init.response) {
      const legacy =
        Boolean(init.response.insertCharsByShopName) ||
        Boolean(init.response.addUserSubscriptionPlan);
      if (legacy) {
        return "java";
      }
    }
  } catch (error) {
    console.warn(`[onboarding] InitializationDetection failed shop=${shop}:`, error);
  }

  return "tsf";
}
