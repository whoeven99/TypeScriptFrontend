import prisma from "../../../db.server";
import { ensureAccount } from "../account/ensureAccount.server";
import { appendBillingLog } from "../billingLog.server";
import type { PlanRecord } from "../plans/planCatalog.server";
import { BILLING_LOG_EVENT } from "../types.server";

/**
 * 加量包入账（结转、永不过期）。
 * 幂等：以 Shopify purchase GID 为 referenceId，重复 webhook 不重复加。
 */
export async function applyTokenPackPurchase(params: {
  shop: string;
  plan: PlanRecord;
  /** Shopify AppPurchaseOneTime GID。 */
  shopifyPurchaseId: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const { shop, plan, shopifyPurchaseId } = params;

  await ensureAccount(shop);

  const prior = await prisma.billingLog.findFirst({
    where: {
      shop,
      eventType: BILLING_LOG_EVENT.TOKEN_PACK_PURCHASED,
      referenceId: shopifyPurchaseId,
    },
  });
  if (prior) return;

  await prisma.account.update({
    where: { shop },
    data: { purchasedCredits: { increment: plan.credits } },
  });

  await appendBillingLog({
    shop,
    eventType: BILLING_LOG_EVENT.TOKEN_PACK_PURCHASED,
    planKey: plan.planKey,
    referenceId: shopifyPurchaseId,
    creditsDelta: plan.credits,
    metadata: params.metadata,
  });
}
