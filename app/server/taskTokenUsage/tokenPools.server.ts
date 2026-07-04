import type { AccountBalanceFields } from "./accountBalance.server";

export const TOKEN_POOL_DEDUCTION_ORDER = [
  "trialTokens",
  "subscriptionTokens",
  "purchasedTokens",
] as const;

export type TokenPoolBalances = Pick<
  AccountBalanceFields,
  "subscriptionTokens" | "purchasedTokens" | "trialTokens"
>;

export function canSettlePoolsAtRenewal(account: AccountBalanceFields): boolean {
  if (account.usedTokens <= 0) return false;
  const poolTotal =
    account.subscriptionTokens +
    account.purchasedTokens +
    account.trialTokens;
  return account.usedTokens <= poolTotal;
}

export function settlePoolsAtRenewal(
  account: AccountBalanceFields,
): TokenPoolBalances {
  return deductTokenUsage(
    {
      subscriptionTokens: account.subscriptionTokens,
      purchasedTokens: account.purchasedTokens,
      trialTokens: account.trialTokens,
    },
    account.usedTokens,
  );
}

export function deductTokenUsage(
  pools: TokenPoolBalances,
  amount: number,
): TokenPoolBalances {
  let remaining = Math.max(0, Math.floor(amount));
  const next: TokenPoolBalances = { ...pools };

  for (const key of TOKEN_POOL_DEDUCTION_ORDER) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, Math.max(0, next[key]));
    next[key] -= take;
    remaining -= take;
  }

  return next;
}
