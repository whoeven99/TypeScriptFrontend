import { isProductionNodeEnv, isTestNodeEnv } from "~/config/nodeEnv.server";

/** 是否启用订阅 / token 校验。默认启用，设 BILLING_ENABLED=false 可关闭。 */
export function isBillingEnabled(): boolean {
  return process.env.BILLING_ENABLED?.trim().toLowerCase() !== "false";
}

export function isBillingTestMode(): boolean {
  return (
    process.env.BILLING_TEST?.trim() === "true" || !isProductionNodeEnv()
  );
}

export function useNoopBillingGateway(): boolean {
  return process.env.BILLING_GATEWAY?.trim().toLowerCase() === "noop";
}

export function isBillingDevCancelEnabled(): boolean {
  if (process.env.BILLING_DEV_CANCEL?.trim() === "false") {
    return false;
  }
  if (process.env.BILLING_DEV_CANCEL?.trim() === "true") {
    return true;
  }
  return isTestNodeEnv() || isBillingTestMode();
}
