import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { isShopMigrated } from "~/server/translateV4/migration.server";
import {
  translateSingleText,
  deductQuota,
} from "~/server/translateV4/singleTranslate.server";
import { singleTextTranslateV2ViaJava } from "~/api/JavaServer";

/**
 * POST /api/translate-v4/single —— 单字段手动翻译。
 * 迁移店 → TSF 直接调 LLM；未迁移店 → 代理到 Java singleTextTranslateV2（行为不变）。
 * 返回对齐页面期望：{ success, response: <译文字符串> }
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const body = (await request.json().catch(() => ({}))) as {
    source?: string;
    target?: string;
    resourceType?: string;
    context?: string; // 待翻译原文
    key?: string;
    type?: string;
    resourceId?: string | null;
  };
  const target = (body.target ?? "").trim();
  const text = body.context ?? "";

  try {
    if (await isShopMigrated(shop)) {
      if (!target) return json({ success: false, errorMsg: "缺少目标语言", response: "" });
      const { translatedText, usedTokens } = await translateSingleText({ shop, target, text });
      await deductQuota(shop, usedTokens); // 与 worker 一致：billing 未迁前仍走 Java
      return json({ success: true, response: translatedText });
    }

    // 未迁移：原样代理 Java
    const data = await singleTextTranslateV2ViaJava({
      shopName: shop,
      source: body.source ?? "",
      target,
      resourceType: body.resourceType ?? "",
      context: text,
      key: body.key ?? "",
      type: body.type ?? "",
      server: process.env.SERVER_URL ?? "",
      resourceId: body.resourceId ?? null,
    });
    return json(data);
  } catch (err) {
    console.error(`[single] ${shop} failed:`, err);
    return json({ success: false, errorMsg: err instanceof Error ? err.message : String(err), response: "" });
  }
};
