import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import {
  getConversation,
  sendMessage,
  setContactEmail,
} from "~/server/translateV4/support.server";

/** 翻译v4 商家端客服面板：GET 拉会话+消息（轮询），POST 发消息 / 留邮箱。 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const markSeen = new URL(request.url).searchParams.get("markSeen") === "true";
  const conversation = await getConversation(session.shop, markSeen);
  return json({ ok: true, conversation });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const body = (await request.json().catch(() => ({}))) as {
    intent?: string;
    content?: string;
    email?: string;
  };

  try {
    if (body.intent === "setEmail") {
      const ok = await setContactEmail(session.shop, body.email ?? "");
      return json({ ok });
    }

    if (body.intent === "send") {
      const content = body.content ?? "";
      if (!content.trim()) {
        return json({ ok: false, error: "消息内容不能为空" }, { status: 400 });
      }
      const message = await sendMessage(session.shop, content);
      if (!message) {
        return json({ ok: false, error: "发送失败" }, { status: 502 });
      }
      return json({ ok: true, message });
    }

    return json({ ok: false, error: "unsupported intent" }, { status: 400 });
  } catch (error) {
    console.error("[api.support] action failed:", error);
    return json(
      { ok: false, error: error instanceof Error ? error.message : "未知错误" },
      { status: 500 },
    );
  }
};
