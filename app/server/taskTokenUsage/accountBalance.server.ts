/** Account 行上用于余额计算的字段。 */
export type AccountBalanceFields = {
  subscriptionTokens: number;
  purchasedTokens: number;
  trialTokens: number;
  usedTokens: number;
};

export function getAvailableTokens(account: AccountBalanceFields): number {
  return (
    account.subscriptionTokens + account.purchasedTokens + account.trialTokens
  );
}

export function getRemainingTokens(account: AccountBalanceFields): number {
  return getAvailableTokens(account) - account.usedTokens;
}

export function hasTokenQuota(account: AccountBalanceFields): boolean {
  return account.usedTokens < getAvailableTokens(account);
}
