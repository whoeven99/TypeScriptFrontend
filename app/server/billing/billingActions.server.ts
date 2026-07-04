import type { BillingPriceOverride } from "./gateway/billingGateway.types";
import type { ShopifyAdminGraphqlClient } from "./gateway/shopifyAdmin.types";
import {
  BILLING_PAGE_PATH,
  buildBillingReturnUrl,
} from "./buildBillingReturnUrl.server";
import { BillingError, BILLING_ERROR_CODE } from "./errors.server";
import { getBillingGateway } from "./gateway/getBillingGateway.server";
import { getPlanByKey } from "./plans/planCatalog.server";
import { PLAN_CATALOG_KIND } from "./types.server";

export async function startSubscriptionCheckout(params: {
  admin: ShopifyAdminGraphqlClient;
  shop: string;
  planKey: string;
  request: Request;
  trialDays?: number | null;
  priceOverride?: BillingPriceOverride;
}): Promise<{ confirmationUrl: string | null }> {
  const plan = await getPlanByKey(params.planKey);
  if (plan.kind !== PLAN_CATALOG_KIND.SUBSCRIPTION) {
    throw new BillingError(
      "Plan is not a subscription",
      BILLING_ERROR_CODE.INVALID_PLAN_KIND,
      400,
    );
  }

  const returnUrl = buildBillingReturnUrl(
    BILLING_PAGE_PATH,
    params.request,
    params.shop,
  );

  const gateway = getBillingGateway();
  const result = await gateway.createSubscription({
    admin: params.admin,
    shop: params.shop,
    plan,
    returnUrl,
    trialDays: params.trialDays,
    priceOverride: params.priceOverride,
  });

  return { confirmationUrl: result.confirmationUrl };
}

export async function startTokenPackCheckout(params: {
  admin: ShopifyAdminGraphqlClient;
  shop: string;
  planKey: string;
  request: Request;
  priceOverride?: BillingPriceOverride;
}): Promise<{ confirmationUrl: string | null }> {
  const plan = await getPlanByKey(params.planKey);
  if (plan.kind !== PLAN_CATALOG_KIND.ONE_TIME_PACK) {
    throw new BillingError(
      "Plan is not a one-time token pack",
      BILLING_ERROR_CODE.INVALID_PLAN_KIND,
      400,
    );
  }

  const returnUrl = buildBillingReturnUrl(
    BILLING_PAGE_PATH,
    params.request,
    params.shop,
  );

  const gateway = getBillingGateway();
  const result = await gateway.createOneTimePurchase({
    admin: params.admin,
    shop: params.shop,
    plan,
    returnUrl,
    priceOverride: params.priceOverride,
  });

  return { confirmationUrl: result.confirmationUrl };
}
