/**
 * Worker 内订阅对账：对比 Shopify currentPeriodEnd，落后则按 webhook 同语义续费入账。
 * 只在 worker 调度；不调用 TSF Web，避免拖垮线上 App。
 */
import { randomUUID } from "node:crypto";
import {
  canSettleAtRenewal,
  settlePoolsAtRenewal,
} from "./accountBalance.js";
import {
  getOfflineAccessTokenFromTsf,
  getTsfDb,
  hasTsfDbCredentials,
} from "./tsfDb.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const INTERVAL_DAYS: Record<string, number> = {
  MONTHLY: 30,
  ANNUAL: 365,
};

type ReconcileAction =
  | "renewed"
  | "activated"
  | "cancelled"
  | "skipped"
  | "error";

type ReconcileShopResult = {
  shop: string;
  action: ReconcileAction;
  reason?: string;
};

type LocalSubscription = {
  shop: string;
  planKey: string;
  shopifySubscriptionId: string;
  billingInterval: string;
  status: string;
  creditsPerPeriod: number;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
};

type ShopifySubscriptionSnapshot = {
  id: string;
  name: string;
  status: string;
  currentPeriodEnd: Date | null;
  intervalRaw: string | null;
};

let running = false;

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

function toSqlDate(d: Date | null): string | null {
  return d ? d.toISOString() : null;
}

function mapInterval(raw?: string | null): string {
  if (!raw) return "MONTHLY";
  const v = raw.trim().toUpperCase();
  if (v === "EVERY_30_DAYS" || v === "MONTHLY") return "MONTHLY";
  if (v === "ANNUAL" || v === "YEARLY") return "ANNUAL";
  return "MONTHLY";
}

function isRenewal(
  previous: LocalSubscription,
  nextPeriodEnd: Date | null,
): boolean {
  if (!previous.currentPeriodEnd || !nextPeriodEnd) return false;
  if (previous.status !== "ACTIVE") return false;
  return nextPeriodEnd.getTime() > previous.currentPeriodEnd.getTime();
}

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
    const body = (await resp.json()) as { data?: T; errors?: unknown };
    if (body.errors) {
      console.warn(`[billingReconcile] GraphQL errors shop=${shop}:`, body.errors);
      return null;
    }
    return body.data ?? null;
  } catch (err) {
    console.error(`[billingReconcile] GraphQL failed shop=${shop}:`, err);
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

async function fetchShopifySubscription(
  shop: string,
  accessToken: string,
  gid: string,
): Promise<ShopifySubscriptionSnapshot | null> {
  const byId = await shopifyGraphql<{
    node: {
      id: string;
      name: string;
      status: string;
      currentPeriodEnd: string;
      lineItems: Array<{ plan: { pricingDetails: { interval?: string } } }>;
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
  const parsed = parseShopifySubscription(byId?.node ?? null);
  if (parsed && parsed.status === "ACTIVE") return parsed;

  const active = await shopifyGraphql<{
    currentAppInstallation: {
      activeSubscriptions: Array<{
        id: string;
        name: string;
        status: string;
        currentPeriodEnd: string;
        lineItems: Array<{ plan: { pricingDetails: { interval?: string } } }>;
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
  return parseShopifySubscription(
    active?.currentAppInstallation?.activeSubscriptions?.[0] ?? null,
  );
}

async function findPlanCredits(
  shopifyPlanName: string,
  billingInterval: string,
): Promise<{ planKey: string; credits: number } | null> {
  const rs = await getTsfDb().execute({
    sql: `SELECT planKey, credits FROM PlanCatalog
          WHERE kind = 'SUBSCRIPTION'
            AND shopifyPlanName = ?
            AND billingInterval = ?
            AND enabled = 1
          LIMIT 1`,
    args: [shopifyPlanName, billingInterval],
  });
  const row = rs.rows[0];
  if (!row) return null;
  return {
    planKey: String(row.planKey),
    credits: Number(row.credits) || 0,
  };
}

async function archivePeriodAndRenew(params: {
  shop: string;
  local: LocalSubscription;
  account: {
    subscriptionCredits: number;
    purchasedCredits: number;
    trialCredits: number;
    usedCredits: number;
  };
  next: {
    planKey: string;
    creditsPerPeriod: number;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
  };
}): Promise<void> {
  const { shop, local, account, next } = params;
  const db = getTsfDb();
  const now = new Date().toISOString();

  if (local.currentPeriodStart && local.currentPeriodEnd) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO AccountPeriodUsage (
              id, shop, appSubscriptionId, planKey, periodStart, periodEnd,
              usedCredits, subscriptionCreditsAllocated,
              purchasedCreditsRemaining, trialCreditsRemaining, archivedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        randomUUID(),
        shop,
        local.shopifySubscriptionId,
        local.planKey,
        toSqlDate(local.currentPeriodStart),
        toSqlDate(local.currentPeriodEnd),
        account.usedCredits,
        local.creditsPerPeriod,
        account.purchasedCredits,
        account.trialCredits,
        now,
      ],
    });
  }

  await db.execute({
    sql: `INSERT INTO BillingLog (
            id, shop, eventType, planKey, referenceId, creditsDelta, usedCredits, metadata, createdAt
          ) VALUES (?, ?, 'SUBSCRIPTION_RENEWED', ?, ?, NULL, ?, ?, ?)`,
    args: [
      randomUUID(),
      shop,
      local.planKey,
      local.shopifySubscriptionId,
      account.usedCredits,
      JSON.stringify({
        previousPeriodEnd: local.currentPeriodEnd?.toISOString() ?? null,
        nextPeriodEnd: next.currentPeriodEnd.toISOString(),
        source: "worker_reconcile",
      }),
      now,
    ],
  });

  const settled = canSettleAtRenewal(account)
    ? settlePoolsAtRenewal(account)
    : {
        subscriptionCredits: account.subscriptionCredits,
        purchasedCredits: account.purchasedCredits,
        trialCredits: account.trialCredits,
      };

  await db.execute({
    sql: `UPDATE AppSubscription SET
            planKey = ?, creditsPerPeriod = ?,
            currentPeriodStart = ?, currentPeriodEnd = ?,
            status = 'ACTIVE', updatedAt = ?
          WHERE shop = ?`,
    args: [
      next.planKey,
      next.creditsPerPeriod,
      toSqlDate(next.currentPeriodStart),
      toSqlDate(next.currentPeriodEnd),
      now,
      shop,
    ],
  });

  await db.execute({
    sql: `UPDATE Account SET
            usedCredits = 0,
            subscriptionCredits = ?,
            purchasedCredits = ?,
            trialCredits = ?,
            updatedAt = ?
          WHERE shop = ?`,
    args: [
      next.creditsPerPeriod,
      settled.purchasedCredits,
      settled.trialCredits,
      now,
      shop,
    ],
  });
}

async function cancelLocalSubscription(
  shop: string,
  local: LocalSubscription,
  status: string,
): Promise<void> {
  const db = getTsfDb();
  const now = new Date().toISOString();
  const acc = await db.execute({
    sql: `SELECT subscriptionCredits FROM Account WHERE shop = ? LIMIT 1`,
    args: [shop],
  });
  const previous = Math.max(0, Number(acc.rows[0]?.subscriptionCredits ?? 0));
  const removed = Math.min(previous, Math.max(0, local.creditsPerPeriod));

  await db.execute({
    sql: `INSERT INTO BillingLog (
            id, shop, eventType, planKey, referenceId, creditsDelta, usedCredits, metadata, createdAt
          ) VALUES (?, ?, 'SUBSCRIPTION_CANCELLED', ?, ?, ?, NULL, ?, ?)`,
    args: [
      randomUUID(),
      shop,
      local.planKey,
      local.shopifySubscriptionId,
      -removed,
      JSON.stringify({
        status,
        previousSubscriptionCredits: previous,
        cancelledAt: now,
        source: "worker_reconcile",
      }),
      now,
    ],
  });

  await db.execute({
    sql: `UPDATE Account SET subscriptionCredits = ?, updatedAt = ? WHERE shop = ?`,
    args: [previous - removed, now, shop],
  });
  await db.execute({
    sql: `DELETE FROM AccountPeriodUsage WHERE appSubscriptionId = ?`,
    args: [local.shopifySubscriptionId],
  });
  await db.execute({
    sql: `DELETE FROM AppSubscription WHERE shop = ?`,
    args: [shop],
  });
}

async function activateOrReplaceSubscription(params: {
  shop: string;
  shopifySub: ShopifySubscriptionSnapshot;
  planKey: string;
  billingInterval: string;
  creditsPerPeriod: number;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
}): Promise<"activated"> {
  const {
    shop,
    shopifySub,
    planKey,
    billingInterval,
    creditsPerPeriod,
    currentPeriodStart,
    currentPeriodEnd,
  } = params;
  const db = getTsfDb();
  const now = new Date().toISOString();

  await db.execute({
    sql: `INSERT INTO AppSubscription (
            shop, planKey, shopifySubscriptionId, billingInterval, status,
            creditsPerPeriod, trialEndsAt, currentPeriodStart, currentPeriodEnd,
            cancelledAt, rawPayload, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, 'ACTIVE', ?, NULL, ?, ?, NULL, ?, ?, ?)
          ON CONFLICT(shop) DO UPDATE SET
            planKey = excluded.planKey,
            shopifySubscriptionId = excluded.shopifySubscriptionId,
            billingInterval = excluded.billingInterval,
            status = 'ACTIVE',
            creditsPerPeriod = excluded.creditsPerPeriod,
            currentPeriodStart = excluded.currentPeriodStart,
            currentPeriodEnd = excluded.currentPeriodEnd,
            cancelledAt = NULL,
            rawPayload = excluded.rawPayload,
            updatedAt = excluded.updatedAt`,
    args: [
      shop,
      planKey,
      shopifySub.id,
      billingInterval,
      creditsPerPeriod,
      toSqlDate(currentPeriodStart),
      toSqlDate(currentPeriodEnd),
      JSON.stringify({ source: "worker_reconcile", name: shopifySub.name }),
      now,
      now,
    ],
  });

  await db.execute({
    sql: `UPDATE Account SET subscriptionCredits = ?, updatedAt = ? WHERE shop = ?`,
    args: [creditsPerPeriod, now, shop],
  });

  const prior = await db.execute({
    sql: `SELECT id FROM BillingLog
          WHERE shop = ? AND eventType = 'SUBSCRIPTION_ACTIVATED' AND referenceId = ?
          LIMIT 1`,
    args: [shop, shopifySub.id],
  });
  if (!prior.rows[0]) {
    await db.execute({
      sql: `INSERT INTO BillingLog (
              id, shop, eventType, planKey, referenceId, creditsDelta, usedCredits, metadata, createdAt
            ) VALUES (?, ?, 'SUBSCRIPTION_ACTIVATED', ?, ?, ?, NULL, ?, ?)`,
      args: [
        randomUUID(),
        shop,
        planKey,
        shopifySub.id,
        creditsPerPeriod,
        JSON.stringify({ billingInterval, source: "worker_reconcile" }),
        now,
      ],
    });
  }

  return "activated";
}

async function reconcileOneShop(
  shop: string,
  local: LocalSubscription,
): Promise<ReconcileShopResult> {
  const accessToken = await getOfflineAccessTokenFromTsf(shop);
  if (!accessToken) {
    return { shop, action: "skipped", reason: "no_offline_token" };
  }

  const shopifySub = await fetchShopifySubscription(
    shop,
    accessToken,
    local.shopifySubscriptionId,
  );
  if (!shopifySub) {
    return { shop, action: "error", reason: "shopify_fetch_failed" };
  }

  if (shopifySub.status === "CANCELLED" || shopifySub.status === "EXPIRED") {
    await cancelLocalSubscription(shop, local, shopifySub.status);
    return { shop, action: "cancelled" };
  }

  if (shopifySub.status !== "ACTIVE") {
    return {
      shop,
      action: "skipped",
      reason: `shopify_status_${shopifySub.status}`,
    };
  }

  const billingInterval = mapInterval(shopifySub.intervalRaw) || local.billingInterval;
  const plan =
    (await findPlanCredits(shopifySub.name, billingInterval)) ?? {
      planKey: local.planKey,
      credits: local.creditsPerPeriod,
    };

  const currentPeriodEnd =
    shopifySub.currentPeriodEnd ??
    new Date(Date.now() + (INTERVAL_DAYS[billingInterval] ?? 30) * DAY_MS);
  const currentPeriodStart = new Date(
    currentPeriodEnd.getTime() - (INTERVAL_DAYS[billingInterval] ?? 30) * DAY_MS,
  );

  const localEndMs = local.currentPeriodEnd?.getTime() ?? 0;
  const shopifyEndMs = currentPeriodEnd.getTime();
  const needsSync =
    shopifySub.id !== local.shopifySubscriptionId ||
    isRenewal(local, currentPeriodEnd) ||
    shopifyEndMs > localEndMs;

  if (!needsSync) {
    return { shop, action: "skipped", reason: "already_synced" };
  }

  if (
    shopifySub.id === local.shopifySubscriptionId &&
    isRenewal(local, currentPeriodEnd)
  ) {
    const accRs = await getTsfDb().execute({
      sql: `SELECT subscriptionCredits, purchasedCredits, trialCredits, usedCredits
            FROM Account WHERE shop = ? LIMIT 1`,
      args: [shop],
    });
    const acc = accRs.rows[0];
    if (!acc) {
      return { shop, action: "error", reason: "no_account" };
    }
    await archivePeriodAndRenew({
      shop,
      local,
      account: {
        subscriptionCredits: Number(acc.subscriptionCredits ?? 0),
        purchasedCredits: Number(acc.purchasedCredits ?? 0),
        trialCredits: Number(acc.trialCredits ?? 0),
        usedCredits: Number(acc.usedCredits ?? 0),
      },
      next: {
        planKey: plan.planKey,
        creditsPerPeriod: plan.credits,
        currentPeriodStart,
        currentPeriodEnd,
      },
    });
    return { shop, action: "renewed" };
  }

  await activateOrReplaceSubscription({
    shop,
    shopifySub,
    planKey: plan.planKey,
    billingInterval,
    creditsPerPeriod: plan.credits,
    currentPeriodStart,
    currentPeriodEnd,
  });
  return { shop, action: "activated" };
}

export async function runBillingSubscriptionReconcile(): Promise<void> {
  if (running) {
    console.warn("[billingReconcile] skip: already running");
    return;
  }
  if (!hasTsfDbCredentials()) {
    console.warn("[billingReconcile] skip: TSF Turso not configured");
    return;
  }

  running = true;
  const started = Date.now();
  const summary = {
    scanned: 0,
    renewed: 0,
    activated: 0,
    cancelled: 0,
    skipped: 0,
    errors: 0,
  };

  try {
    const db = getTsfDb();
    const rs = await db.execute(`
      SELECT s.shop, s.planKey, s.shopifySubscriptionId, s.billingInterval, s.status,
             s.creditsPerPeriod, s.currentPeriodStart, s.currentPeriodEnd
      FROM AppSubscription s
      JOIN ShopBillingBinding b ON b.shop = s.shop
      WHERE b.billingSystem = 'tsf'
      ORDER BY s.shop ASC
    `);

    summary.scanned = rs.rows.length;

    for (const row of rs.rows) {
      const shop = String(row.shop);
      const local: LocalSubscription = {
        shop,
        planKey: String(row.planKey),
        shopifySubscriptionId: String(row.shopifySubscriptionId),
        billingInterval: String(row.billingInterval),
        status: String(row.status),
        creditsPerPeriod: Number(row.creditsPerPeriod) || 0,
        currentPeriodStart: parseDate(row.currentPeriodStart),
        currentPeriodEnd: parseDate(row.currentPeriodEnd),
      };

      let result: ReconcileShopResult;
      try {
        result = await reconcileOneShop(shop, local);
      } catch (err) {
        console.error(`[billingReconcile] shop=${shop} error:`, err);
        result = {
          shop,
          action: "error",
          reason: err instanceof Error ? err.message : String(err),
        };
      }

      switch (result.action) {
        case "renewed":
          summary.renewed++;
          console.log(`[billingReconcile] renewed ${shop}`);
          break;
        case "activated":
          summary.activated++;
          console.log(`[billingReconcile] activated ${shop}`);
          break;
        case "cancelled":
          summary.cancelled++;
          console.log(`[billingReconcile] cancelled ${shop}`);
          break;
        case "skipped":
          summary.skipped++;
          break;
        case "error":
          summary.errors++;
          console.warn(
            `[billingReconcile] error ${shop}: ${result.reason ?? ""}`,
          );
          break;
        default: {
          const _exhaustive: never = result.action;
          void _exhaustive;
        }
      }
    }

    console.log(
      `[billingReconcile] done scanned=${summary.scanned} renewed=${summary.renewed} activated=${summary.activated} cancelled=${summary.cancelled} skipped=${summary.skipped} errors=${summary.errors} (${Date.now() - started}ms)`,
    );
  } catch (err) {
    console.error("[billingReconcile] failed:", err);
  } finally {
    running = false;
  }
}
