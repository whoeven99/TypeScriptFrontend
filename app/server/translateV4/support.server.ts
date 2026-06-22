import axios from "axios";

/**
 * 翻译v4 客服：把消息桥接到 Spark 的 /api/external-support（shared-secret 鉴权）。
 * base 用 SPARK_SUPPORT_URL，密钥用 SPARK_SUPPORT_SECRET，固定 source=translate-v4。
 * 数据结构与 Spark `app/server/support/supportStore.server.ts` 的 DTO 保持一致。
 */
const SOURCE = "translate-v4";

export type SupportMessage = {
  id: string;
  sender: string; // "shop" | "ops"
  senderName: string | null;
  content: string;
  createdAt: string;
};

export type SupportConversation = {
  id: string;
  status: string;
  contactEmail: string | null;
  shopEmail: string | null;
  unreadForShop: number;
  messages: SupportMessage[];
};

function resolveBase(): string | null {
  return process.env.SPARK_SUPPORT_URL?.trim()?.replace(/\/+$/, "") || null;
}

function headers(): Record<string, string> {
  return { "x-support-secret": process.env.SPARK_SUPPORT_SECRET?.trim() ?? "" };
}

/** 拉某店的翻译v4客服会话；markSeen=true 时清运营回复未读。失败返回 null。 */
export async function getConversation(
  shop: string,
  markSeen: boolean,
): Promise<SupportConversation | null> {
  const base = resolveBase();
  if (!base) return null;
  try {
    const res = await axios.get<{ ok: boolean; conversation?: SupportConversation }>(
      base,
      {
        params: { shop, source: SOURCE, markSeen: markSeen ? "true" : "false" },
        headers: headers(),
        timeout: 8000,
      },
    );
    return res.data?.ok && res.data.conversation ? res.data.conversation : null;
  } catch (err) {
    console.error("[translateV4] getConversation failed:", err);
    return null;
  }
}

/** 商家发消息。返回新消息或 null（失败）。 */
export async function sendMessage(
  shop: string,
  content: string,
): Promise<SupportMessage | null> {
  const base = resolveBase();
  if (!base) return null;
  try {
    const res = await axios.post<{ ok: boolean; message?: SupportMessage }>(
      base,
      { intent: "send", shop, source: SOURCE, content },
      { headers: headers(), timeout: 8000 },
    );
    return res.data?.ok && res.data.message ? res.data.message : null;
  } catch (err) {
    console.error("[translateV4] sendMessage failed:", err);
    return null;
  }
}

/** 商家留联系邮箱。返回是否成功。 */
export async function setContactEmail(
  shop: string,
  email: string,
): Promise<boolean> {
  const base = resolveBase();
  if (!base) return false;
  try {
    const res = await axios.post<{ ok: boolean }>(
      base,
      { intent: "setEmail", shop, source: SOURCE, email },
      { headers: headers(), timeout: 8000 },
    );
    return Boolean(res.data?.ok);
  } catch (err) {
    console.error("[translateV4] setContactEmail failed:", err);
    return false;
  }
}
