/**
 * Remix 应用侧 Tencent SES 发信（计费邮件等 webhook 场景）。
 * worker 进程有独立实现，此处仅供 app/server 使用。
 */

import { ses } from "tencentcloud-sdk-nodejs-ses";

const LOG = "[tencentSes]";

/** 对齐 Spring MailChimpConstants.CC_EMAIL_ARRAY / workerEmail */
const DEFAULT_CC = ["feynman@ciwi.ai", "yewen@ciwi.ai"] as const;

const FROM_EMAIL =
  process.env.TENCENT_FROM_EMAIL?.trim() || "support@msg.ciwi.ai";

type SesClientInstance = InstanceType<typeof ses.v20201002.Client>;

let _client: SesClientInstance | null = null;

function getSesClient(): SesClientInstance | null {
  if (_client) return _client;
  const secretId = process.env.TENCENT_CLOUD_KEY_ID?.trim();
  const secretKey = process.env.TENCENT_CLOUD_KEY?.trim();
  if (!secretId || !secretKey) {
    console.warn(`${LOG} missing Tencent SES credentials`);
    return null;
  }
  const region = process.env.TENCENT_SES_REGION?.trim() || "ap-hongkong";
  _client = new ses.v20201002.Client({
    credential: { secretId, secretKey },
    region,
  });
  return _client;
}

/** 数字格式化为千分位（对齐 Java NumberFormat.getNumberInstance(Locale.US)）。 */
export function formatUsNumber(n: number): string {
  return n.toLocaleString("en-US");
}

/** 去掉 .myshopify.com 后缀。 */
export function parseShopDisplayName(shop: string): string {
  return shop.replace(/\.myshopify\.com$/i, "");
}

/**
 * 通过腾讯云模板发信。
 * 凭证缺失或 SDK 失败时返回 false，不抛错（webhook 不因邮件失败而中断）。
 */
export async function sendTencentTemplateEmail(params: {
  templateId: number;
  subject: string;
  templateData: Record<string, string>;
  to: string;
  cc?: string[];
}): Promise<boolean> {
  const client = getSesClient();
  if (!client) return false;

  const to = params.to.trim();
  if (!to) {
    console.warn(`${LOG} skip send: empty recipient templateId=${params.templateId}`);
    return false;
  }

  const cc = params.cc ?? [...DEFAULT_CC];

  try {
    const resp = await client.SendEmail({
      FromEmailAddress: FROM_EMAIL,
      Destination: [to],
      Cc: cc,
      Subject: params.subject,
      Template: {
        TemplateID: params.templateId,
        TemplateData: JSON.stringify(params.templateData),
      },
    });
    const requestId =
      typeof resp === "object" && resp !== null && "RequestId" in resp
        ? String((resp as { RequestId?: string }).RequestId ?? "").trim()
        : "";
    if (!requestId) {
      console.warn(`${LOG} send missing RequestId templateId=${params.templateId}`);
      return false;
    }
    return true;
  } catch (e) {
    console.error(
      `${LOG} send failed templateId=${params.templateId}`,
      e instanceof Error ? e.message : e,
    );
    return false;
  }
}

/** 仅测试用 */
export function resetTencentSesClientForTests(): void {
  _client = null;
}
