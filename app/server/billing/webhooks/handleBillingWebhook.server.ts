import axios from "axios";
import prisma from "../../../db.server";
import { buildShopifyAdminGraphqlUrl } from "../../../lib/shopifyAdminApiVersion";
import {
  sendTsfPurchaseSuccessEmail,
  sendTsfSubscribeSuccessEmail,
  sendTsfSubscriptionRenewalEmail,
  shouldSendTsfSubscriptionRenewalEmail,
} from "../email/billingEmail.server";
import { applyActiveSubscription } from "../subscription/activateSubscription.server";
import { cancelSubscription } from "../subscription/cancelSubscription.server";
import { applyTokenPackPurchase } from "../purchase/applyTokenPack.server";
import {
  findPackPlanByName,
  findSubscriptionPlan,
} from "../plans/planCatalog.server";
import { isSubscriptionRenewal } from "../subscription/renewal.server";
import {
  APP_SUBSCRIPTION_STATUS,
  BILLING_INTERVAL,
  BILLING_LOG_EVENT,
} from "../types.server";

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
      url: buildShopifyAdminGraphqlUrl(shop),
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

async function findRenewalLogForPeriod(params: {
  shop: string;
  referenceId: string;
  nextPeriodEnd: Date;
}) {
  const { shop, referenceId, nextPeriodEnd } = params;
  const nextPeriodEndIso = nextPeriodEnd.toISOString();

  // Turso/SQLite 不支持 Prisma JsonFilter.path 数组写法；先取候选，再内存比对 metadata.nextPeriodEnd。
  const rows = await prisma.billingLog.findMany({
    where: {
      shop,
      eventType: BILLING_LOG_EVENT.SUBSCRIPTION_RENEWED,
      referenceId,
    },
    select: { id: true, metadata: true },
    take: 50,
    orderBy: { createdAt: "desc" },
  });

  return (
    rows.find((row) => {
      const meta = row.metadata as { nextPeriodEnd?: string } | null;
      return meta?.nextPeriodEnd === nextPeriodEndIso;
    }) ?? null
  );
}

/** 标记续费邮件已发送，供 worker nearDue/全量 reconcile 幂等跳过。 */
async function markRenewalEmailSent(logId: string, metadata: unknown): Promise<void> {
  const meta =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? (metadata as Record<string, unknown>)
      : {};
  if (meta.renewalEmailSent === true) return;
  await prisma.billingLog.update({
    where: { id: logId },
    data: {
      metadata: {
        ...meta,
        renewalEmailSent: true,
        renewalEmailClaimedAt: new Date().toISOString(),
        renewalEmailSource: "webhook",
      },
    },
  });
}

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

  const existingSub = await prisma.appSubscription.findUnique({
    where: { shop: params.shop },
  });

  // currentPeriodEnd 必须以 Shopify 为准；仅 Shopify 缺失时才 fallback（优先保留本地已对齐值）。
  const currentPeriodEnd =
    detail?.currentPeriodEnd ??
    existingSub?.currentPeriodEnd ??
    new Date(Date.now() + (INTERVAL_DAYS[billingInterval] ?? 30) * DAY_MS);
  const currentPeriodStart = new Date(
    currentPeriodEnd.getTime() - (INTERVAL_DAYS[billingInterval] ?? 30) * DAY_MS,
  );
  // Shopify createdAt 仅用于试用结束时间推算，禁止用作额度/账期锚点。
  const trialEndsAt =
    detail && detail.trialDays > 0 && detail.createdAt
      ? new Date(detail.createdAt.getTime() + detail.trialDays * DAY_MS)
      : null;

  const isRenewal =
    existingSub != null &&
    existingSub.shopifySubscriptionId === gid &&
    isSubscriptionRenewal(existingSub, currentPeriodEnd);
  const priorActivation = isRenewal
    ? null
    : await prisma.billingLog.findFirst({
        where: {
          shop: params.shop,
          eventType: BILLING_LOG_EVENT.SUBSCRIPTION_ACTIVATED,
          referenceId: gid,
        },
      });

  const priorRenewalForPeriod = isRenewal
    ? await findRenewalLogForPeriod({
        shop: params.shop,
        referenceId: gid,
        nextPeriodEnd: currentPeriodEnd,
      })
    : null;

  const priorRenewalCount =
    isRenewal && existingSub
      ? await prisma.billingLog.count({
          where: {
            shop: params.shop,
            eventType: BILLING_LOG_EVENT.SUBSCRIPTION_RENEWED,
            referenceId: gid,
          },
        })
      : 0;

  const shouldSendRenewalEmail =
    isRenewal &&
    existingSub != null &&
    shouldSendTsfSubscriptionRenewalEmail({
      hadTrial: existingSub.trialEndsAt != null,
      priorRenewalCount,
    });

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

  if (!isRenewal && !priorActivation) {
    void sendTsfSubscribeSuccessEmail({
      shop: params.shop,
      plan,
      billingInterval,
      trialEndsAt,
      trialStartsAt: detail?.createdAt ?? currentPeriodStart,
      effectiveAt: currentPeriodStart,
      accessToken: params.accessToken,
    }).catch((err) => {
      console.error(
        `[billing webhook] subscribe success email failed shop=${params.shop}:`,
        err,
      );
    });
  } else if (shouldSendRenewalEmail && !priorRenewalForPeriod) {
    // 仅当本 webhook 首次落续费账时发信；worker 已续费则由 worker 发信（BillingLog.renewalEmailSent 幂等）。
    void (async () => {
      const ok = await sendTsfSubscriptionRenewalEmail({
        shop: params.shop,
        plan,
        accessToken: params.accessToken,
      });
      if (!ok) return;
      const log = await findRenewalLogForPeriod({
        shop: params.shop,
        referenceId: gid,
        nextPeriodEnd: currentPeriodEnd,
      });
      if (log) {
        await markRenewalEmailSent(log.id, log.metadata);
      }
    })().catch((err) => {
      console.error(
        `[billing webhook] subscription renewal email failed shop=${params.shop}:`,
        err,
      );
    });
  }
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
  accessToken?: string | null;
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

  const priorPurchase = await prisma.billingLog.findFirst({
    where: {
      shop: params.shop,
      eventType: BILLING_LOG_EVENT.TOKEN_PACK_PURCHASED,
      referenceId: gid,
    },
  });

  await applyTokenPackPurchase({
    shop: params.shop,
    plan,
    shopifyPurchaseId: gid,
    metadata: { name: purchase?.name },
  });

  if (!priorPurchase) {
    void sendTsfPurchaseSuccessEmail({
      shop: params.shop,
      plan,
      accessToken: params.accessToken,
    }).catch((err) => {
      console.error(
        `[billing webhook] purchase success email failed shop=${params.shop}:`,
        err,
      );
    });
  }
}
