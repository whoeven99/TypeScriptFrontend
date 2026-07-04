import prisma from "~/db.server";
import { appendBillingLog } from "../billingLog.server";
import { BILLING_LOG_EVENT, APP_SUBSCRIPTION_STATUS } from "../types.server";
import type { BillingGateway } from "./billingGateway.types";
import {
  shopifyCreateOneTimePurchase,
  shopifyCreateSubscription,
} from "./shopifyGraphqlBilling.server";

export const shopifyBillingGateway: BillingGateway = {
  async createSubscription({ admin, shop, plan, returnUrl, trialDays, priceOverride }) {
    const name = plan.shopifyPlanName ?? plan.displayName;
    const { confirmationUrl, subscriptionId } = await shopifyCreateSubscription(
      admin,
      {
        planName: name,
        priceAmount: priceOverride?.amount ?? plan.priceAmount,
        currencyCode: priceOverride?.currencyCode ?? plan.currencyCode,
        billingInterval: plan.billingInterval,
        returnUrl,
        trialDays: trialDays !== undefined ? trialDays : plan.trialDays,
      },
    );

    await prisma.appSubscription.upsert({
      where: { shop },
      create: {
        shop,
        planKey: plan.planKey,
        shopifySubscriptionId: subscriptionId,
        billingInterval: plan.billingInterval ?? "MONTHLY",
        status: APP_SUBSCRIPTION_STATUS.PENDING,
        tokensPerPeriod: plan.tokens,
        confirmationUrl,
      },
      update: {
        planKey: plan.planKey,
        shopifySubscriptionId: subscriptionId,
        billingInterval: plan.billingInterval ?? "MONTHLY",
        status: APP_SUBSCRIPTION_STATUS.PENDING,
        tokensPerPeriod: plan.tokens,
        confirmationUrl,
      },
    });

    return {
      confirmationUrl,
      shopifySubscriptionId: subscriptionId,
    };
  },

  async createOneTimePurchase({ admin, shop, plan, returnUrl, priceOverride }) {
    const name = plan.shopifyPlanName ?? plan.displayName;
    const { confirmationUrl, purchaseId } = await shopifyCreateOneTimePurchase(
      admin,
      {
        planName: name,
        priceAmount: priceOverride?.amount ?? plan.priceAmount,
        currencyCode: priceOverride?.currencyCode ?? plan.currencyCode,
        returnUrl,
      },
    );

    await appendBillingLog({
      shop,
      eventType: BILLING_LOG_EVENT.TOKEN_PACK_INITIATED,
      planKey: plan.planKey,
      referenceId: purchaseId,
      metadata: { confirmationUrl },
    });

    return {
      confirmationUrl,
      shopifyPurchaseId: purchaseId,
    };
  },
};
