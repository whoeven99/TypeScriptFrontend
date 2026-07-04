import type { ShopifyAdminGraphqlClient } from "./shopifyAdmin.types";
import type { PlanRecord } from "../plans/planCatalog.server";

export type BillingGateway = {
  createSubscription(params: {
    admin: ShopifyAdminGraphqlClient;
    shop: string;
    plan: PlanRecord;
    returnUrl: string;
    trialDays?: number | null;
  }): Promise<{ confirmationUrl: string | null; shopifySubscriptionId: string }>;

  createOneTimePurchase(params: {
    admin: ShopifyAdminGraphqlClient;
    shop: string;
    plan: PlanRecord;
    returnUrl: string;
  }): Promise<{ confirmationUrl: string | null; shopifyPurchaseId: string }>;
};
