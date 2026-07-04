import type { BillingGateway } from "./billingGateway.types";
import type { PlanRecord } from "../plans/planCatalog.server";
import type { ShopifyAdminGraphqlClient } from "./shopifyAdmin.types";
import { applyActiveSubscription } from "../subscription/activateSubscription.server";
import { applyTokenPackPurchase } from "../purchase/applyTokenPack.server";

export const noopBillingGateway: BillingGateway = {
  async createSubscription({ shop, plan }) {
    const fakeId = `gid://shopify/AppSubscription/noop-${Date.now()}`;
    await applyActiveSubscription({
      shop,
      shopifySubscriptionId: fakeId,
      planKey: plan.planKey,
      billingInterval: plan.billingInterval ?? "MONTHLY",
      tokensPerPeriod: plan.tokens,
      period: {
        planKey: plan.planKey,
        tokensPerPeriod: plan.tokens,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    return { confirmationUrl: null, shopifySubscriptionId: fakeId };
  },

  async createOneTimePurchase({ shop, plan }) {
    const fakeId = `gid://shopify/AppPurchaseOneTime/noop-${Date.now()}`;
    await applyTokenPackPurchase({
      shop,
      plan,
      shopifyPurchaseId: fakeId,
      metadata: { noop: true },
    });
    return { confirmationUrl: null, shopifyPurchaseId: fakeId };
  },
};

export type NoopBillingGateway = typeof noopBillingGateway;

export function isShopifyAdminClient(
  value: ShopifyAdminGraphqlClient | unknown,
): value is ShopifyAdminGraphqlClient {
  return (
    typeof value === "object" &&
    value != null &&
    typeof (value as ShopifyAdminGraphqlClient).graphql === "function"
  );
}

export function assertShopifyAdminClient(
  value: ShopifyAdminGraphqlClient | unknown,
): ShopifyAdminGraphqlClient {
  if (!isShopifyAdminClient(value)) {
    throw new Error("Invalid Shopify admin GraphQL client");
  }
  return value;
}

export type SubscriptionCheckoutParams = {
  admin: ShopifyAdminGraphqlClient;
  shop: string;
  plan: PlanRecord;
  returnUrl: string;
  trialDays?: number | null;
};

export type TokenPackCheckoutParams = {
  admin: ShopifyAdminGraphqlClient;
  shop: string;
  plan: PlanRecord;
  returnUrl: string;
};
