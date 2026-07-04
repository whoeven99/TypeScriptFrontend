import type { ActionFunctionArgs } from "@remix-run/node";
import prisma from "~/db.server";
import type { ShopifyAdminGraphqlClient } from "../gateway/shopifyAdmin.types";
import { BillingError } from "../errors.server";
import {
  startSubscriptionCheckout,
  startTokenPackCheckout,
} from "../billingActions.server";
import {
  resolveSubscriptionPlanKey,
  resolveTokenPackPlanKey,
} from "./resolvePricingPlanKey.server";

type PricingActionResult = {
  success: boolean;
  errorCode: number;
  errorMsg: string;
  response: { confirmationUrl?: string | null } | null;
};

function pricingSuccess(confirmationUrl: string | null): PricingActionResult {
  return {
    success: true,
    errorCode: 0,
    errorMsg: "",
    response: { confirmationUrl },
  };
}

function pricingFailure(errorMsg = "SERVER_ERROR"): PricingActionResult {
  return {
    success: false,
    errorCode: 10001,
    errorMsg,
    response: null,
  };
}

export async function handleTsfPricingAction(params: {
  admin: ShopifyAdminGraphqlClient;
  shop: string;
  request: Request;
  payInfo: unknown;
  payForPlan: unknown;
  cancelId: unknown;
}): Promise<PricingActionResult | Record<string, unknown> | null> {
  if (params.payInfo) {
    return handleTsfTokenPackCheckout(params);
  }
  if (params.payForPlan) {
    return handleTsfSubscriptionCheckout(params);
  }
  if (params.cancelId) {
    return handleTsfSubscriptionCancel(params);
  }
  return null;
}

async function handleTsfTokenPackCheckout(params: {
  admin: ShopifyAdminGraphqlClient;
  shop: string;
  request: Request;
  payInfo: unknown;
}): Promise<PricingActionResult> {
  const payInfo = params.payInfo as {
    name?: string;
    price?: { amount?: number; currencyCode?: string };
  };

  const planKey = resolveTokenPackPlanKey(payInfo?.name ?? "");
  if (!planKey) {
    return pricingFailure("Unknown token pack");
  }

  try {
    const result = await startTokenPackCheckout({
      admin: params.admin,
      shop: params.shop,
      planKey,
      request: params.request,
      priceOverride:
        payInfo?.price?.amount != null
          ? {
              amount: String(payInfo.price.amount),
              currencyCode: payInfo.price.currencyCode ?? "USD",
            }
          : undefined,
    });
    return pricingSuccess(result.confirmationUrl);
  } catch (error) {
    console.error("[Billing] TSF token pack checkout failed:", error);
    if (error instanceof BillingError) {
      return pricingFailure(error.message);
    }
    return pricingFailure();
  }
}

async function handleTsfSubscriptionCheckout(params: {
  admin: ShopifyAdminGraphqlClient;
  shop: string;
  request: Request;
  payForPlan: unknown;
}): Promise<PricingActionResult> {
  const payForPlan = params.payForPlan as {
    title?: string;
    yearly?: boolean;
    monthlyPrice?: number;
    yearlyPrice?: number;
    trialDays?: number;
  };

  const planKey = resolveSubscriptionPlanKey(
    payForPlan?.title ?? "",
    Boolean(payForPlan?.yearly),
  );
  if (!planKey) {
    return pricingFailure("Unknown subscription plan");
  }

  const priceAmount = payForPlan?.yearly
    ? String((payForPlan.yearlyPrice ?? 0) * 12)
    : String(payForPlan?.monthlyPrice ?? 0);

  try {
    const result = await startSubscriptionCheckout({
      admin: params.admin,
      shop: params.shop,
      planKey,
      request: params.request,
      trialDays: payForPlan?.trialDays ?? 0,
      priceOverride: {
        amount: priceAmount,
        currencyCode: "USD",
      },
    });
    return pricingSuccess(result.confirmationUrl);
  } catch (error) {
    console.error("[Billing] TSF subscription checkout failed:", error);
    if (error instanceof BillingError) {
      return pricingFailure(error.message);
    }
    return pricingFailure();
  }
}

async function handleTsfSubscriptionCancel(params: {
  admin: ShopifyAdminGraphqlClient;
  shop: string;
  cancelId: unknown;
}): Promise<Record<string, unknown> | null> {
  try {
    const response = await params.admin.graphql(
      `#graphql
      mutation AppSubscriptionCancel($id: ID!, $prorate: Boolean) {
        appSubscriptionCancel(id: $id, prorate: $prorate) {
          userErrors {
            field
            message
          }
          appSubscription {
            id
            status
          }
        }
      }`,
      {
        variables: {
          id: params.cancelId,
        },
      },
    );

    const data = await response.json();
    console.log(`[Billing] TSF cancel plan shop=${params.shop}:`, data);
    return data;
  } catch (error) {
    console.error("[Billing] TSF cancel subscription failed:", error);
    return null;
  }
}

/** TSF 用户当前可取消的 Shopify 订阅 GID。 */
export async function getTsfActiveSubscriptionId(
  shop: string,
): Promise<string | null> {
  const sub = await prisma.appSubscription.findUnique({
    where: { shop },
    select: { shopifySubscriptionId: true, status: true },
  });
  if (!sub?.shopifySubscriptionId) return null;
  if (sub.status !== "ACTIVE" && sub.status !== "PENDING") return null;
  return sub.shopifySubscriptionId;
}

export type TsfPricingActionArgs = Pick<
  ActionFunctionArgs,
  "request"
> & {
  admin: ShopifyAdminGraphqlClient;
  shop: string;
  payInfo: unknown;
  payForPlan: unknown;
  cancelId: unknown;
};
