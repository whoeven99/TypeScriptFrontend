import axios from "axios";
import { applyActiveSubscription } from "../subscription/activateSubscription.server";
import { cancelSubscription } from "../subscription/cancelSubscription.server";
import { applyTokenPackPurchase } from "../purchase/applyTokenPack.server";
import {
  findPackPlanByName,
  findSubscriptionPlan,
} from "../plans/planCatalog.server";
import { APP_SUBSCRIPTION_STATUS, BILLING_INTERVAL } from "../types.server";

const DAY_MS = 24 * 60 * 60 * 1000;
const INTERVAL_DAYS: Record<string, number> = {
  [BILLING_INTERVAL.MONTHLY]: 30,
  [BILLING_INTERVAL.ANNUAL]: 365,
};

/** Shopify interval（EVERY_30_DAYS / ANNUAL / every_30_days）→ 内部 MONTHLY / ANNUAL。 */
function mapInterval(raw?: string | null): string | null {
  if (!raw) return null;
  const v = raw.trim().toUpperCase();
  if (v === "EVERY_30_DAYS" || v === "MONTHLY") return BILLING_INTERVAL.MONTHLY;
  if (v === "ANNUAL" || v === "YEARLY") return BILLING_INTERVAL.ANNUAL;
  return null;
}

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

type SubscriptionDetail = {
  currentPeriodEnd: Date | null;
  createdAt: Date | null;
  trialDays: number;
  interval: string | null;
};

/**
 * 查 Shopify 订阅详情补齐 webhook payload 缺失字段（currentPeriodEnd / trialDays / interval）。
 * 失败返回 null，调用方降级用 payload/推算值。
 */
async function fetchSubscriptionDetail(
  shop: string,
  accessToken: string,
  gid: string,
): Promise<SubscriptionDetail | null> {
  try {
    const response = await axios({
      url: `https://${shop}/admin/api/${process.env.GRAPHQL_VERSION}/graphql.json`,
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
      data: {
        query: `query AppSubscriptionById($id: ID!) {
          node(id: $id) {
            ... on AppSubscription {
              id
              status
              currentPeriodEnd
              trialDays
              createdAt
              lineItems {
                plan {
                  pricingDetails {
                    __typename
                    ... on AppRecurringPricing {
                      interval
                    }
                  }
                }
              }
            }
          }
        }`,
        variables: { id: gid },
      },
    });
    const node = response.data?.data?.node;
    if (!node) return null;
    const intervalRaw = node.lineItems?.find(
      (li: { plan?: { pricingDetails?: { interval?: string } } }) =>
        li?.plan?.pricingDetails?.interval,
    )?.plan?.pricingDetails?.interval;
    return {
      currentPeriodEnd: parseDate(node.currentPeriodEnd),
      createdAt: parseDate(node.createdAt),
      trialDays: Number(node.trialDays) || 0,
      interval: mapInterval(intervalRaw),
    };
  } catch (err) {
    console.error(`[billing webhook] fetchSubscriptionDetail failed shop=${shop}:`, err);
    return null;
  }
}

type SubscriptionPayload = {
  admin_graphql_api_id?: string;
  name?: string;
  status?: string;
  interval?: string;
};

/**
 * tsf 用户订阅 webhook（APP_SUBSCRIPTIONS_UPDATE）：ACTIVE 激活/续费，CANCELLED/EXPIRED 取消。
 * 账本函数内置幂等（referenceId=订阅 GID），webhook 重发安全。
 */
export async function handleTsfSubscriptionWebhook(params: {
  shop: string;
  accessToken?: string | null;
  payload: { app_subscription?: SubscriptionPayload } | null;
}): Promise<void> {
  const sub = params.payload?.app_subscription;
  const gid = sub?.admin_graphql_api_id;
  const status = sub?.status;
  if (!gid || !status) return;

  if (status === APP_SUBSCRIPTION_STATUS.CANCELLED || status === "EXPIRED") {
    await cancelSubscription({ shop: params.shop, shopifySubscriptionId: gid, status });
    return;
  }

  if (status !== APP_SUBSCRIPTION_STATUS.ACTIVE) {
    // FROZEN / PENDING / DECLINED 等：不改额度，等下次状态流转。
    return;
  }

  const detail = params.accessToken
    ? await fetchSubscriptionDetail(params.shop, params.accessToken, gid)
    : null;

  const billingInterval =
    detail?.interval ?? mapInterval(sub?.interval) ?? BILLING_INTERVAL.MONTHLY;

  const plan = await findSubscriptionPlan({
    shopifyPlanName: sub?.name ?? "",
    billingInterval,
  });
  if (!plan) {
    console.warn(
      `[billing webhook] no subscription plan match shop=${params.shop} name=${sub?.name} interval=${billingInterval}`,
    );
    return;
  }

  const now = Date.now();
  const currentPeriodEnd =
    detail?.currentPeriodEnd ??
    new Date(now + (INTERVAL_DAYS[billingInterval] ?? 30) * DAY_MS);
  const currentPeriodStart = new Date(
    currentPeriodEnd.getTime() - (INTERVAL_DAYS[billingInterval] ?? 30) * DAY_MS,
  );
  const trialEndsAt =
    detail && detail.trialDays > 0 && detail.createdAt
      ? new Date(detail.createdAt.getTime() + detail.trialDays * DAY_MS)
      : null;

  await applyActiveSubscription({
    shop: params.shop,
    shopifySubscriptionId: gid,
    planKey: plan.planKey,
    billingInterval,
    creditsPerPeriod: plan.credits,
    trialEndsAt,
    period: {
      currentPeriodStart,
      currentPeriodEnd,
      creditsPerPeriod: plan.credits,
      planKey: plan.planKey,
    },
    rawPayload: (params.payload ?? undefined) as Record<string, unknown> | undefined,
  });
}

type PurchasePayload = {
  admin_graphql_api_id?: string;
  name?: string;
  status?: string;
};

/**
 * tsf 用户一次性购包 webhook（APP_PURCHASES_ONE_TIME_UPDATE）：ACTIVE 入账加量包。
 * 幂等：referenceId=purchase GID。
 */
export async function handleTsfPurchaseWebhook(params: {
  shop: string;
  payload: { app_purchase_one_time?: PurchasePayload } | null;
}): Promise<void> {
  const purchase = params.payload?.app_purchase_one_time;
  const gid = purchase?.admin_graphql_api_id;
  if (!gid || purchase?.status !== "ACTIVE") return;

  const plan = await findPackPlanByName(purchase?.name ?? "");
  if (!plan) {
    console.warn(
      `[billing webhook] no pack plan match shop=${params.shop} name=${purchase?.name}`,
    );
    return;
  }

  await applyTokenPackPurchase({
    shop: params.shop,
    plan,
    shopifyPurchaseId: gid,
    metadata: { name: purchase?.name },
  });
}
