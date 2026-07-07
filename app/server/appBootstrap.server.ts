import {
  GetUserSubscriptionPlan,
  GetUserWords,
  IsInFreePlanTime,
  IsOpenFreePlan,
} from "~/api/JavaServer";
import type { ShopLocalesType } from "~/routes/app.language/route";
import type { LoadedShopLocales } from "~/server/translateV4/shopLocales.server";
import { isTsfBillingShop } from "~/server/billing/binding/resolveBillingBinding.server";
import { getTsfBootstrapData } from "~/server/billing/bootstrap/getTsfBootstrapData.server";

export type AppBootstrapPlan = {
  id: number;
  type: string;
  feeType: number;
  isInFreePlanTime: boolean;
};

export type AppBootstrapJavaData = {
  plan: AppBootstrapPlan;
  updateTime: string | null;
  chars?: number;
  totalChars?: number;
  isNew: boolean | null;
};

const defaultPlan: AppBootstrapPlan = {
  id: 2,
  type: "Free",
  feeType: 0,
  isInFreePlanTime: false,
};

function normalizePlanUpdateTime(value: unknown): string | null {
  if (!value) return null;
  const time = new Date(String(value));
  if (Number.isNaN(time.getTime())) return null;
  return time.toISOString();
}

/** 从已加载的店铺语言构造 Redux 用的 source / targets。 */
export function bootstrapLocalesFromLoaded(loaded: LoadedShopLocales): {
  source: { code: string; name: string };
  targets: ShopLocalesType[];
} {
  const primary = loaded.rows.find((row) => row.primary);
  const source = {
    code: primary?.locale ?? "en",
    name: primary?.name ?? "",
  };
  const targets = loaded.rows
    .filter((row) => !row.primary)
    .map((row) => ({
      locale: row.locale,
      name: row.name,
      primary: row.primary,
      published: row.published,
    }));

  return { source, targets };
}

/** Java 侧订阅/配额等 —— 非首屏阻塞，由客户端 `/api/app-bootstrap` 拉取。 */
export async function loadAppBootstrapJavaData({
  shop,
  server,
}: {
  shop: string;
  server: string;
}): Promise<AppBootstrapJavaData> {
  // 新系统（tsf）用户：订阅/额度来自 Turso 账本，不走 Java。
  if (await isTsfBillingShop(shop)) {
    return getTsfBootstrapData(shop);
  }

  const [
    subscriptionResult,
    freePlanTimeResult,
    wordsResult,
    openFreePlanResult,
  ] = await Promise.allSettled([
    GetUserSubscriptionPlan({ shop, server }),
    IsInFreePlanTime({ shop, server }),
    GetUserWords({ shop, server }),
    IsOpenFreePlan({ shop, server }),
  ]);

  const subscription =
    subscriptionResult.status === "fulfilled"
      ? subscriptionResult.value
      : undefined;
  const freePlanTime =
    freePlanTimeResult.status === "fulfilled"
      ? freePlanTimeResult.value
      : undefined;
  const words =
    wordsResult.status === "fulfilled" ? wordsResult.value : undefined;
  const openFreePlan =
    openFreePlanResult.status === "fulfilled"
      ? openFreePlanResult.value
      : undefined;

  const plan: AppBootstrapPlan = {
    ...defaultPlan,
    ...(subscription?.success
      ? {
          id: subscription?.response?.userSubscriptionPlan || defaultPlan.id,
          type: subscription?.response?.planType || defaultPlan.type,
          feeType: subscription?.response?.feeType || defaultPlan.feeType,
        }
      : null),
    isInFreePlanTime: freePlanTime?.success
      ? Boolean(freePlanTime?.response)
      : defaultPlan.isInFreePlanTime,
  };

  return {
    plan,
    updateTime: subscription?.success
      ? normalizePlanUpdateTime(subscription?.response?.currentPeriodEnd)
      : null,
    chars: words?.success ? words?.response?.chars : undefined,
    totalChars: words?.success ? words?.response?.totalChars : undefined,
    isNew: openFreePlan?.success ? !openFreePlan?.response : null,
  };
}
