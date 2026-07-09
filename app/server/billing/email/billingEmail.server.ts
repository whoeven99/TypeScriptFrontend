/**
 * TSF 计费邮件（对齐 Spring OrderService 购买/订阅成功通知）。
 */

import prisma from "../../../db.server";
import {
  formatUsNumber,
  parseShopDisplayName,
  sendTencentTemplateEmail,
} from "../../email/tencentSes.server";
import { fetchShopContact } from "../../shop/fetchShopContact.server";
import { getAccountQuota } from "../quota/getAccountQuota.server";
import type { PlanRecord } from "../plans/planCatalog.server";
import { BILLING_INTERVAL } from "../types.server";

const LOG = "[billingEmail]";

// ─── 模板 ID / 主题（对齐 Spring MailChimpConstants + OrderService）────────────
const TEMPLATE_PURCHASE_SUCCESS = 138372;
const TEMPLATE_SUBSCRIBE_MONTHLY = 139251;
const TEMPLATE_SUBSCRIBE_ANNUAL = 146081;
const TEMPLATE_TRIAL_SUCCESS = 146220;
/** 对齐 Spring TencentEmailService.sendSubscribeEmail（自动续费/周期额度发放）。 */
const TEMPLATE_SUBSCRIPTION_RENEWAL = 143058;

const SUBJECT_PURCHASE_SUCCESS =
  "Confirmation of Successful Credits Purchase｜Ciwi-translator";
const SUBJECT_PLAN_UPGRADE = "Plan Upgrade Successful!｜Ciwi-translator";
const SUBJECT_TRIAL_SUCCESS =
  "You're now on your 5-day free trial｜Ciwi-translator";
const SUBJECT_SUBSCRIPTION_RENEWAL =
  "Your Credits Have Been Added!｜Ciwi-translator";

function formatCreditsLabel(credits: number): string {
  return `${formatUsNumber(credits)} Credits`;
}

function formatUtcDateTime(value: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())} ` +
    `${pad(value.getUTCHours())}:${pad(value.getUTCMinutes())}:${pad(value.getUTCSeconds())} UTC`
  );
}

function parsePriceAmount(priceAmount: string): number {
  const n = Number.parseFloat(priceAmount);
  return Number.isFinite(n) ? n : 0;
}

function resolveTotalCreditsLabel(
  purchasedCredits: number,
  quota: Awaited<ReturnType<typeof getAccountQuota>>,
): string {
  if (!quota) return formatCreditsLabel(purchasedCredits);
  const available = quota.remainingCredits;
  if (purchasedCredits > available) {
    return formatCreditsLabel(purchasedCredits);
  }
  return formatCreditsLabel(available);
}

async function resolveRecipient(
  shop: string,
  accessToken?: string | null,
): Promise<{ email: string; userName: string } | null> {
  const contact = await fetchShopContact(shop, accessToken);
  if (!contact.email) {
    console.warn(`${LOG} no shop email shop=${shop}`);
    return null;
  }
  return {
    email: contact.email,
    userName: contact.ownerName?.trim() || "there",
  };
}

/**
 * 加量包购买成功邮件（模板 138372）。
 * 对齐 OrderService.sendPurchaseSuccessEmail。
 */
export async function sendTsfPurchaseSuccessEmail(params: {
  shop: string;
  plan: PlanRecord;
  accessToken?: string | null;
}): Promise<boolean> {
  const recipient = await resolveRecipient(params.shop, params.accessToken);
  if (!recipient) return false;

  const quota = await getAccountQuota(params.shop);
  const amount = parsePriceAmount(params.plan.priceAmount);

  const ok = await sendTencentTemplateEmail({
    templateId: TEMPLATE_PURCHASE_SUCCESS,
    subject: SUBJECT_PURCHASE_SUCCESS,
    to: recipient.email,
    templateData: {
      user: recipient.userName,
      number_of_credits: formatCreditsLabel(params.plan.credits),
      amount: `$${amount.toFixed(2)}`,
      shop_name: parseShopDisplayName(params.shop),
      total_credits_count: resolveTotalCreditsLabel(params.plan.credits, quota),
    },
  });

  console.info(
    `${LOG} purchase email shop=${params.shop} credits=${params.plan.credits} ok=${ok}`,
  );
  return ok;
}

/**
 * 订阅激活成功邮件：试用（146220）或付费月/年（139251 / 146081）。
 * 对齐 OrderService.sendSubscribeSuccessEmail。
 */
export async function sendTsfSubscribeSuccessEmail(params: {
  shop: string;
  plan: PlanRecord;
  billingInterval: string;
  trialEndsAt?: Date | null;
  trialStartsAt?: Date | null;
  effectiveAt?: Date | null;
  accessToken?: string | null;
}): Promise<boolean> {
  const recipient = await resolveRecipient(params.shop, params.accessToken);
  if (!recipient) return false;

  const planName =
    params.plan.shopifyPlanName ?? params.plan.displayName ?? params.plan.planKey;
  const now = Date.now();
  const inTrial =
    params.trialEndsAt != null && params.trialEndsAt.getTime() > now;

  if (inTrial) {
    const trialStart = params.trialStartsAt ?? new Date();
    const trialEnd = params.trialEndsAt!;
    const ok = await sendTencentTemplateEmail({
      templateId: TEMPLATE_TRIAL_SUCCESS,
      subject: SUBJECT_TRIAL_SUCCESS,
      to: recipient.email,
      templateData: {
        user: recipient.userName,
        new_plan_name: planName,
        "Start date": formatUtcDateTime(trialStart),
        "End date": formatUtcDateTime(trialEnd),
      },
    });
    console.info(`${LOG} trial subscribe email shop=${params.shop} ok=${ok}`);
    return ok;
  }

  const monthlyPrice = parsePriceAmount(params.plan.priceAmount);
  const isAnnual = params.billingInterval === BILLING_INTERVAL.ANNUAL;
  const feeDisplay = isAnnual
    ? `$${(monthlyPrice * 12).toFixed(2)}`
    : `$${monthlyPrice.toFixed(2)}`;

  const sub = await prisma.appSubscription.findUnique({
    where: { shop: params.shop },
    select: { currentPeriodStart: true, createdAt: true },
  });
  const effectiveAt =
    params.effectiveAt ??
    sub?.currentPeriodStart ??
    sub?.createdAt ??
    new Date();

  const ok = await sendTencentTemplateEmail({
    templateId: isAnnual ? TEMPLATE_SUBSCRIBE_ANNUAL : TEMPLATE_SUBSCRIBE_MONTHLY,
    subject: SUBJECT_PLAN_UPGRADE,
    to: recipient.email,
    templateData: {
      user: recipient.userName,
      new_plan_name: planName,
      new_fee: feeDisplay,
      effective_date: formatUtcDateTime(effectiveAt),
      shop_name: parseShopDisplayName(params.shop),
    },
  });

  console.info(
    `${LOG} subscribe email shop=${params.shop} plan=${planName} annual=${isAnnual} ok=${ok}`,
  );
  return ok;
}

/**
 * 是否应在本次续费 webhook 发送自动付费邮件。
 * - 无试用：第 1 次续费（第 2 个计费周期）起发送。
 * - 有试用：试用结束首次扣款不发；从第 2 次续费（第 3 个计费周期）起发送。
 */
export function shouldSendTsfSubscriptionRenewalEmail(params: {
  hadTrial: boolean;
  priorRenewalCount: number;
}): boolean {
  if (params.hadTrial) {
    return params.priorRenewalCount >= 1;
  }
  return true;
}

/**
 * 订阅自动续费成功邮件（模板 143058）。
 * 对齐 Spring TencentEmailService.sendSubscribeEmail。
 */
export async function sendTsfSubscriptionRenewalEmail(params: {
  shop: string;
  plan: PlanRecord;
  accessToken?: string | null;
}): Promise<boolean> {
  const recipient = await resolveRecipient(params.shop, params.accessToken);
  if (!recipient) return false;

  const quota = await getAccountQuota(params.shop);
  const totalCredits = quota?.remainingCredits ?? params.plan.credits;

  const ok = await sendTencentTemplateEmail({
    templateId: TEMPLATE_SUBSCRIPTION_RENEWAL,
    subject: SUBJECT_SUBSCRIPTION_RENEWAL,
    to: recipient.email,
    templateData: {
      user: recipient.userName,
      shop_name: parseShopDisplayName(params.shop),
      number_of_credits: formatUsNumber(params.plan.credits),
      total_credits_count: formatUsNumber(totalCredits),
    },
  });

  console.info(
    `${LOG} renewal email shop=${params.shop} credits=${params.plan.credits} ok=${ok}`,
  );
  return ok;
}
