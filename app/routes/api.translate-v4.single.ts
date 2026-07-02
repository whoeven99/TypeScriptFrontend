import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import {
  translateSingleText,
  deductQuota,
} from "~/server/translateV4/singleTranslate.server";

/**
 * POST /api/translate-v4/single —— 单字段手动翻译（TSF LLM + Java 额度扣减）。
 * 返回对齐页面期望：{ success, response: <译文字符串> }
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const body = (await request.json().catch(() => ({}))) as {
    source?: string;
    target?: string;
    resourceType?: string;
    context?: string;
    key?: string;
    type?: string;
    resourceId?: string | null;
  };
  const target = (body.target ?? "").trim();
  const text = body.context ?? "";
  const source = (body.source ?? "en").trim() || "en";
  const fieldKey = body.key?.trim() || "value";
  const shopifyType = body.type?.trim() || body.resourceType?.trim();

  try {
    if (!target) return json({ success: false, errorMsg: "缺少目标语言", response: "" });
    const { translatedText, usedTokens } = await translateSingleText({
      shop,
      target,
      text,
      source,
      fieldKey,
      shopifyType,
    });
    await deductQuota(shop, usedTokens);
    return json({ success: true, response: translatedText });
  } catch (err) {
    console.error(`[single] ${shop} failed:`, err);
    return json({ success: false, errorMsg: err instanceof Error ? err.message : String(err), response: "" });
  }
};
