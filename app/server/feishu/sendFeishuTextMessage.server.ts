import {
  isFeishuEnabled,
  resolveSupportFeishuWebhookUrl,
} from "./feishuConfig.server";

const LOG = "[Feishu]";

export type SendFeishuResult =
  | { ok: true }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; reason: string };

/** 向翻译客服飞书群机器人发送纯文本消息。 */
export async function sendFeishuTextMessage(message: string): Promise<SendFeishuResult> {
  try {
    if (!isFeishuEnabled()) {
      console.info(`${LOG} skipped reason=disabled`);
      return { ok: false, skipped: true, reason: "disabled" };
    }

    const webhookUrl = resolveSupportFeishuWebhookUrl();
    if (!webhookUrl) {
      console.info(`${LOG} skipped reason=no_webhook_url`);
      return { ok: false, skipped: true, reason: "no_webhook_url" };
    }

    console.info(`${LOG} start send messageLength=${message.length}`);

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        msg_type: "text",
        content: { text: message },
      }),
    });

    const text = await res.text();
    let body: { code?: number; msg?: string; raw?: string };
    try {
      body = JSON.parse(text) as { code?: number; msg?: string };
    } catch {
      body = { raw: text };
    }

    if (!res.ok || (body.code !== undefined && body.code !== 0)) {
      console.error(
        `${LOG} failed httpStatus=${res.status} body=${JSON.stringify(body).slice(0, 400)}`,
      );
      return { ok: false, reason: "webhook_error" };
    }

    console.info(`${LOG} success`);
    return { ok: true };
  } catch (error) {
    console.error(`${LOG} failed`, error);
    return { ok: false, reason: "exception" };
  }
}
