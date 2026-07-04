import { BillingAccessDeniedError } from "./errors.server";
import { loadBillingContext, type BillingContext } from "./billingContext.server";

export async function requireBillingAccess(shop: string): Promise<BillingContext> {
  const ctx = await loadBillingContext(shop);

  if (!ctx.hasAccess) {
    throw new BillingAccessDeniedError(undefined, {
      shop,
      availableTokens: ctx.availableTokens,
      remainingTokens: ctx.remainingTokens,
      usedTokens: ctx.usedTokens,
      subscriptionStatus: ctx.subscription?.status ?? null,
    });
  }

  return ctx;
}

export function billingErrorToResponse(error: unknown): Response | null {
  if (error instanceof BillingAccessDeniedError) {
    return Response.json(
      {
        success: false,
        errorCode: error.code,
        errorMsg: error.message,
        billing: error.details ?? {},
      },
      { status: error.status },
    );
  }
  return null;
}
