import type { Account, AppSubscription } from "~/generated/prisma";
import prisma from "~/db.server";
import { ensureAccount } from "./account/ensureAccount.server";
import { isBillingEnabled } from "./constants.server";
import {
  getAvailableTokens,
  getRemainingTokens,
  hasTokenQuota,
} from "~/server/taskTokenUsage/accountBalance.server";
import { listEnabledPlans, type PlanRecord } from "./plans/planCatalog.server";

export type BillingContext = {
  shop: string;
  billingRequired: boolean;
  hasAccess: boolean;
  availableTokens: number;
  remainingTokens: number;
  usedTokens: number;
  account: Account;
  subscription: AppSubscription | null;
  plans: PlanRecord[];
};

export async function loadBillingContext(shop: string): Promise<BillingContext> {
  const account = await ensureAccount(shop);
  const subscription = await prisma.appSubscription.findUnique({
    where: { shop },
  });

  const plans = isBillingEnabled() ? await listEnabledPlans() : [];
  const billingRequired = isBillingEnabled();
  const availableTokens = getAvailableTokens(account);
  const hasAccess = !billingRequired || hasTokenQuota(account);

  return {
    shop,
    billingRequired,
    hasAccess,
    availableTokens,
    remainingTokens: getRemainingTokens(account),
    usedTokens: account.usedTokens,
    account,
    subscription,
    plans,
  };
}
