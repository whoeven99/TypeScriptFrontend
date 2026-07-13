/**
 * TSF 新用户首装欢迎邮件（对齐 Spring UserService.addUser）。
 */

import { sendFeishuTextMessage } from "../../feishu/sendFeishuTextMessage.server";
import { sendTencentTemplateEmail } from "../../email/tencentSes.server";
import { fetchShopContact } from "../../shop/fetchShopContact.server";
import type { BindingResolution } from "../binding/resolveBillingBinding.server";

const LOG = "[welcomeEmail]";

/** 对齐 Spring MailChimpConstants.FIRST_INSTALL_SUBJECT + template 137916 */
const TEMPLATE_WELCOME = 137916;
const SUBJECT_WELCOME =
  "Welcome to Ciwi-Translator! Unlock a New Language Translation Experience";

async function notifyWelcomeEmailFailure(params: {
  shop: string;
  reason: string;
  detail?: string;
}): Promise<void> {
  const message = [
    "[TSF] 新用户欢迎邮件发送失败",
    `shop: ${params.shop}`,
    `reason: ${params.reason}`,
    params.detail ? `detail: ${params.detail}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const result = await sendFeishuTextMessage(message);
  if (!result.ok && !("skipped" in result && result.skipped)) {
    console.warn(`${LOG} feishu notify failed`, result);
  }
}

/**
 * 发送新用户欢迎邮件。失败时打日志并通知飞书，不抛错。
 */
export async function sendTsfWelcomeEmail(params: {
  shop: string;
}): Promise<boolean> {
  const shop = params.shop.trim();
  if (!shop) {
    console.warn(`${LOG} skip: empty shop`);
    return false;
  }

  const contact = await fetchShopContact(shop);
  if (!contact.email) {
    console.warn(`${LOG} no shop email shop=${shop}`);
    await notifyWelcomeEmailFailure({
      shop,
      reason: "no_recipient",
      detail: "Shopify shop.email / contactEmail 为空",
    });
    return false;
  }

  const userName = contact.ownerName?.trim() || "there";
  const ok = await sendTencentTemplateEmail({
    templateId: TEMPLATE_WELCOME,
    subject: SUBJECT_WELCOME,
    to: contact.email,
    templateData: { user: userName },
  });

  if (ok) {
    console.info(`${LOG} sent shop=${shop}`);
    return true;
  }

  console.error(`${LOG} send failed shop=${shop}`);
  await notifyWelcomeEmailFailure({
    shop,
    reason: "ses_send_failed",
    detail: `to=${contact.email}`,
  });
  return false;
}

/** bound: true 时异步触发欢迎邮件，不阻塞调用方。 */
export function scheduleTsfWelcomeEmail(
  binding: BindingResolution,
  shop: string,
): void {
  if (!binding.bound) return;
  void sendTsfWelcomeEmail({ shop });
}
