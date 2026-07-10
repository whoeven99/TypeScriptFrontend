import prisma from "../../../db.server";
import {
  APP_SUBSCRIPTION_STATUS,
  BILLING_SYSTEM,
} from "../types.server";
import { cancelSubscription } from "./cancelSubscription.server";
import { isSubscriptionRenewal } from "./renewal.server";
import { handleTsfSubscriptionWebhook } from "../webhooks/handleBillingWebhook.server";

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

type ShopifySubscriptionSnapshot = {
  id: string;
  name: string;
  status: string;
  currentPeriodEnd: Date | null;
  intervalRaw: string | null;
};

async function shopifyGraphql<T>(
  shop: string,
  accessToken: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T | null> {
  const apiVersion = process.env.GRAPHQL_VERSION || "2025-04";
  try {
    const resp = await fetch(
      `https://${shop}/admin/api/${apiVersion}/graphql.json`,
      {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, variables }),
      },
    );
    const body = (await resp.json()) as {
      data?: T;
      errors?: unknown;
    };
    if (body.errors) {
      console.warn(
        `[billing reconcile] GraphQL errors shop=${shop}:`,
        body.errors,
      );
      return null;
    }
    return body.data ?? null;
  } catch (err) {
    console.error(`[billing reconcile] GraphQL failed shop=${shop}:`, err);
    return null;
  }
}

function parseShopifySubscription(node: {
  id?: string;
  name?: string;
  status?: string;
  currentPeriodEnd?: string;
  lineItems?: Array<{
    plan?: { pricingDetails?: { interval?: string } };
  }>;
} | null): ShopifySubscriptionSnapshot | null {
  if (!node?.id || !node.status) return null;
  const intervalRaw =
    node.lineItems?.find((li) => li?.plan?.pricingDetails?.interval)?.plan
      ?.pricingDetails?.interval ?? null;
  return {
    id: node.id,
    name: node.name ?? "",
    status: node.status,
    currentPeriodEnd: parseDate(node.currentPeriodEnd),
    intervalRaw,
  };
}

async function fetchShopifySubscriptionByGid(
  shop: string,
  accessToken: string,
  gid: string,
): Promise<ShopifySubscriptionSnapshot | null> {
  const data = await shopifyGraphql<{
    node: {
      id: string;
      name: string;
      status: string;
      currentPeriodEnd: string;
      lineItems: Array<{
        plan: { pricingDetails: { interval?: string } };
      }>;
    } | null;
  }>(
    shop,
    accessToken,
    `query AppSubscriptionById($id: ID!) {
      node(id: $id) {
        ... on AppSubscription {
          id name status currentPeriodEnd
          lineItems {
            plan {
              pricingDetails {
                __typename
                ... on AppRecurringPricing { interval }
              }
            }
          }
        }
      }
    }`,
    { id: gid },
  );
  return parseShopifySubscription(data?.node ?? null);
}

async function fetchActiveShopifySubscription(
  shop: string,
  accessToken: string,
): Promise<ShopifySubscriptionSnapshot | null> {
  const data = await shopifyGraphql<{
    currentAppInstallation: {
      activeSubscriptions: Array<{
        id: string;
        name: string;
        status: string;
        currentPeriodEnd: string;
        lineItems: Array<{
          plan: { pricingDetails: { interval?: string } };
        }>;
      }>;
    };
  }>(
    shop,
    accessToken,
    `query ActiveAppSubscriptions {
      currentAppInstallation {
        activeSubscriptions {
          id name status currentPeriodEnd
          lineItems {
            plan {
              pricingDetails {
                __typename
                ... on AppRecurringPricing { interval }
              }
            }
          }
        }
      }
    }`,
  );
  const active = data?.currentAppInstallation?.activeSubscriptions?.[0];
  return parseShopifySubscription(active ?? null);
}

export type ReconcileShopResult = {
  shop: string;
  action: "renewed" | "activated" | "cancelled" | "skipped" | "error";
  reason?: string;
};

export type SubscriptionReconciliationSummary = {
  scanned: number;
  renewed: number;
  activated: number;
  cancelled: number;
  skipped: number;
  errors: number;
  results: ReconcileShopResult[];
};

/** 单店：Shopify 周期已推进则走与 webhook 相同的入账逻辑。 */
export async function reconcileTsfSubscriptionForShop(
  shop: string,
): Promise<ReconcileShopResult> {
  const binding = await prisma.shopBillingBinding.findUnique({
    where: { shop },
  });
  if (binding?.billingSystem !== BILLING_SYSTEM.TSF) {
    return { shop, action: "skipped", reason: "not_tsf" };
  }

  const local = await prisma.appSubscription.findUnique({ where: { shop } });
  if (!local) {
    return { shop, action: "skipped", reason: "no_local_subscription" };
  }

  const session = await prisma.session.findFirst({
    where: { shop, isOnline: false },
    select: { accessToken: true },
  });
  const accessToken = session?.accessToken;
  if (!accessToken) {
    return { shop, action: "skipped", reason: "no_offline_token" };
  }

  let shopifySub = await fetchShopifySubscriptionByGid(
    shop,
    accessToken,
    local.shopifySubscriptionId,
  );
  if (!shopifySub || shopifySub.status !== APP_SUBSCRIPTION_STATUS.ACTIVE) {
    shopifySub = await fetchActiveShopifySubscription(shop, accessToken);
  }
  if (!shopifySub) {
    return { shop, action: "error", reason: "shopify_fetch_failed" };
  }

  if (
    shopifySub.status === APP_SUBSCRIPTION_STATUS.CANCELLED ||
    shopifySub.status === "EXPIRED"
  ) {
    await cancelSubscription({
      shop,
      shopifySubscriptionId: local.shopifySubscriptionId,
      status: shopifySub.status,
    });
    return { shop, action: "cancelled" };
  }

  if (shopifySub.status !== APP_SUBSCRIPTION_STATUS.ACTIVE) {
    return { shop, action: "skipped", reason: `shopify_status_${shopifySub.status}` };
  }

  const localEndMs = local.currentPeriodEnd?.getTime() ?? 0;
  const shopifyEndMs = shopifySub.currentPeriodEnd?.getTime() ?? 0;
  const needsSync =
    shopifySub.id !== local.shopifySubscriptionId ||
    isSubscriptionRenewal(local, shopifySub.currentPeriodEnd) ||
    shopifyEndMs > localEndMs;

  if (!needsSync) {
    return { shop, action: "skipped", reason: "already_synced" };
  }

  await handleTsfSubscriptionWebhook({
    shop,
    accessToken,
    payload: {
      app_subscription: {
        admin_graphql_api_id: shopifySub.id,
        name: shopifySub.name,
        status: APP_SUBSCRIPTION_STATUS.ACTIVE,
        interval: shopifySub.intervalRaw ?? undefined,
      },
    },
  });

  const after = await prisma.appSubscription.findUnique({ where: { shop } });
  const afterEndMs = after?.currentPeriodEnd?.getTime() ?? 0;
  if (afterEndMs <= localEndMs && shopifySub.id === local.shopifySubscriptionId) {
    return { shop, action: "skipped", reason: "no_change_after_sync" };
  }

  const wasRenewal =
    local.shopifySubscriptionId === shopifySub.id &&
    localEndMs > 0 &&
    afterEndMs > localEndMs;

  return {
    shop,
    action: wasRenewal ? "renewed" : "activated",
  };
}

/** 扫描全部 tsf 店，补齐 Shopify 已续费但 webhook 未入账的订阅。 */
export async function runSubscriptionReconciliation(): Promise<SubscriptionReconciliationSummary> {
  const tsfBindings = await prisma.shopBillingBinding.findMany({
    where: { billingSystem: BILLING_SYSTEM.TSF },
    select: { shop: true },
  });
  const tsfShops = new Set(tsfBindings.map((b) => b.shop));

  const subscriptions = await prisma.appSubscription.findMany({
    where: { shop: { in: [...tsfShops] } },
    select: { shop: true },
    orderBy: { shop: "asc" },
  });

  const results: ReconcileShopResult[] = [];
  for (const { shop } of subscriptions) {
    try {
      results.push(await reconcileTsfSubscriptionForShop(shop));
    } catch (err) {
      console.error(`[billing reconcile] shop=${shop} error:`, err);
      results.push({
        shop,
        action: "error",
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const summary: SubscriptionReconciliationSummary = {
    scanned: subscriptions.length,
    renewed: 0,
    activated: 0,
    cancelled: 0,
    skipped: 0,
    errors: 0,
    results,
  };

  for (const r of results) {
    switch (r.action) {
      case "renewed":
        summary.renewed++;
        break;
      case "activated":
        summary.activated++;
        break;
      case "cancelled":
        summary.cancelled++;
        break;
      case "skipped":
        summary.skipped++;
        break;
      case "error":
        summary.errors++;
        break;
      default: {
        const _exhaustive: never = r.action;
        void _exhaustive;
      }
    }
  }

  console.log(
    `[billing reconcile] done scanned=${summary.scanned} renewed=${summary.renewed} activated=${summary.activated} cancelled=${summary.cancelled} skipped=${summary.skipped} errors=${summary.errors}`,
  );

  return summary;
}
