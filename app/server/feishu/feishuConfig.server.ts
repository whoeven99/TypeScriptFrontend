/** 翻译客服飞书 Webhook（商家发消息后通知运营）。 */
const SUPPORT_WEBHOOK_ENV = "FEISHU_WEBHOOK_URL_SUPPORT";

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value.trim() === "") return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1") return true;
  if (normalized === "false" || normalized === "0") return false;
  return defaultValue;
}

export function isFeishuEnabled(): boolean {
  return parseBoolean(process.env.FEISHU_ENABLED, true);
}

export function resolveSupportFeishuWebhookUrl(): string | null {
  const url = process.env[SUPPORT_WEBHOOK_ENV]?.trim();
  return url && url.length > 0 ? url : null;
}

export function isSupportFeishuReady(): boolean {
  return isFeishuEnabled() && resolveSupportFeishuWebhookUrl() !== null;
}
