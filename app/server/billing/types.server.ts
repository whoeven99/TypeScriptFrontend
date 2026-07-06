// 新用户系统（仅新用户启用）计费相关常量/枚举。老用户仍走 Spring 账本。

/** 账本归属：决定某个 shop 走新系统还是老 Java 系统。 */
export const BILLING_SYSTEM = {
  LEGACY: "legacy",
  TSF: "tsf",
} as const;
export type BillingSystem = (typeof BILLING_SYSTEM)[keyof typeof BILLING_SYSTEM];

/** 订阅状态。 */
export const APP_SUBSCRIPTION_STATUS = {
  PENDING: "PENDING",
  ACTIVE: "ACTIVE",
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED",
} as const;
export type AppSubscriptionStatus =
  (typeof APP_SUBSCRIPTION_STATUS)[keyof typeof APP_SUBSCRIPTION_STATUS];

/** 套餐类型。 */
export const PLAN_KIND = {
  SUBSCRIPTION: "SUBSCRIPTION",
  ONE_TIME_PACK: "ONE_TIME_PACK",
  INTERNAL_TRIAL: "INTERNAL_TRIAL",
} as const;
export type PlanKind = (typeof PLAN_KIND)[keyof typeof PLAN_KIND];

/** 订阅周期。 */
export const BILLING_INTERVAL = {
  MONTHLY: "MONTHLY",
  ANNUAL: "ANNUAL",
} as const;
export type BillingInterval =
  (typeof BILLING_INTERVAL)[keyof typeof BILLING_INTERVAL];

/** 计费流水事件类型。 */
export const BILLING_LOG_EVENT = {
  TRIAL_GRANTED: "TRIAL_GRANTED",
  SUBSCRIPTION_ACTIVATED: "SUBSCRIPTION_ACTIVATED",
  SUBSCRIPTION_RENEWED: "SUBSCRIPTION_RENEWED",
  SUBSCRIPTION_CANCELLED: "SUBSCRIPTION_CANCELLED",
  TOKEN_PACK_PURCHASED: "TOKEN_PACK_PURCHASED",
} as const;
export type BillingLogEvent =
  (typeof BILLING_LOG_EVENT)[keyof typeof BILLING_LOG_EVENT];
