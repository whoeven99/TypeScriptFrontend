/**
 * TSF 新用户首装欢迎邮件（对齐 Spring UserService.addUser）。
 */

import { sendFeishuTextMessage } from "../../feishu/sendFeishuTextMessage.server";
import {
  isFeishuEnabled,
  isSupportFeishuReady,
} from "../../feishu/feishuConfig.server";
import { sendTencentTemplateEmail } from "../../email/tencentSes.server";
import { fetchShopContact } from "../../shop/fetchShopContact.server";
import type { BindingResolution } from "../binding/resolveBillingBinding.server";

const LOG = "[welcomeEmail]";

/** 对齐 Spring MailChimpConstants.FIRST_INSTALL_SUBJECT + template 137916 */
const TEMPLATE_WELCOME = 137916;
const SUBJECT_WELCOME =
  "Welcome to Ciwi-Translator! Unlock a New Language Translation Experience";

function maskEmail(email: string): string {
  const trimmed = email.trim();
  const at = trimmed.indexOf("@");
  if (at <= 0) return "(invalid)";
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}

function logDetail(phase: string, payload: Record<string, unknown>): void {
  console.info(`${LOG} ${phase} ${JSON.stringify(payload)}`);
}

async function notifyWelcomeEmailFailure(params: {
  shop: string;
  reason: string;
  detail?: string;
}): Promise<void> {
  logDetail("failure-notify-start", {
    shop: params.shop,
    reason: params.reason,
    detail: params.detail ?? null,
    feishuEnabled: isFeishuEnabled(),
    feishuReady: isSupportFeishuReady(),
  });

  const message = [
    "[TSF] 新用户欢迎邮件发送失败",
    `shop: ${params.shop}`,
    `reason: ${params.reason}`,
    params.detail ? `detail: ${params.detail}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const result = await sendFeishuTextMessage(message);
  logDetail("failure-notify-result", {
    shop: params.shop,
    ok: result.ok,
    skipped: "skipped" in result ? result.skipped : false,
    reason: "reason" in result ? result.reason : null,
  });
  if (!result.ok && !("skipped" in result && result.skipped)) {
    console.warn(`${LOG} feishu notify failed`, result);
  }
}

/**
 * 发送新用户欢迎邮件。失败时打日志并通知飞书，不抛错。
 */
export async function sendTsfWelcomeEmail(params: {
  shop: string;
  trigger?: string;
}): Promise<boolean> {
  const shop = params.shop.trim();
  const trigger = params.trigger?.trim() || "unknown";

  logDetail("send-start", {
    shop,
    trigger,
    templateId: TEMPLATE_WELCOME,
    subject: SUBJECT_WELCOME,
  });

  if (!shop) {
    console.warn(`${LOG} skip reason=empty_shop trigger=${trigger}`);
    return false;
  }

  const contact = await fetchShopContact(shop);
  logDetail("contact-resolved", {
    shop,
    trigger,
    hasEmail: Boolean(contact.email),
    to: contact.email ? maskEmail(contact.email) : null,
    ownerName: contact.ownerName?.trim() || null,
    userName:
      contact.ownerName?.trim() || (contact.email ? "there" : null),
  });

  if (!contact.email) {
    console.warn(`${LOG} skip reason=no_recipient shop=${shop} trigger=${trigger}`);
    await notifyWelcomeEmailFailure({
      shop,
      reason: "no_recipient",
      detail: "Shopify shop.email / contactEmail 为空",
    });
    return false;
  }

  const userName = contact.ownerName?.trim() || "there";
  logDetail("ses-send-start", {
    shop,
    trigger,
    templateId: TEMPLATE_WELCOME,
    to: maskEmail(contact.email),
    userName,
  });

  const ok = await sendTencentTemplateEmail({
    templateId: TEMPLATE_WELCOME,
    subject: SUBJECT_WELCOME,
    to: contact.email,
    templateData: { user: userName },
  });

  if (ok) {
    logDetail("send-success", {
      shop,
      trigger,
      to: maskEmail(contact.email),
      templateId: TEMPLATE_WELCOME,
    });
    return true;
  }

  console.error(`${LOG} send-failed shop=${shop} trigger=${trigger} to=${maskEmail(contact.email)}`);
  await notifyWelcomeEmailFailure({
    shop,
    reason: "ses_send_failed",
    detail: `to=${maskEmail(contact.email)}`,
  });
  return false;
}

/** bound: true 时异步触发欢迎邮件，不阻塞调用方。 */
export function scheduleTsfWelcomeEmail(
  binding: BindingResolution,
  shop: string,
  trigger = "app-init",
): void {
  if (!binding.bound) {
    logDetail("schedule-skipped", {
      shop,
      trigger,
      reason: "account_not_new",
      persisted: binding.persisted,
      hint: "仅 bound:true（首次创建 TSF Account）会发欢迎邮件",
    });
    return;
  }

  logDetail("schedule-start", {
    shop,
    trigger,
    persisted: binding.persisted,
  });

  void sendTsfWelcomeEmail({ shop, trigger }).catch((error) => {
    console.error(`${LOG} unhandled shop=${shop} trigger=${trigger}`, error);
  });
}
