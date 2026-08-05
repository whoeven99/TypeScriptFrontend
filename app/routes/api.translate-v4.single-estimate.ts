import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { estimateSingleTranslateCredits } from "~/server/translateV4/singleTranslateEstimate.server";

/**
 * POST /api/translate-v4/single-estimate
 * body: { context, target, key?, customPrompt? }
 * 单字段手动翻译积分预估（展示用，不替代实扣）。
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ ok: false, error: "method not allowed" }, { status: 405 });
  }

  const { session } = await authenticate.admin(request);
  const body = (await request.json().catch(() => ({}))) as {
    context?: string;
    target?: string;
    key?: string;
    customPrompt?: string;
    aiModel?: string;
  };

  const sourceText = typeof body.context === "string" ? body.context : "";
  const target = typeof body.target === "string" ? body.target.trim() : "";
  const fieldKey =
    typeof body.key === "string" && body.key.trim() ? body.key.trim() : "value";
  const customPrompt =
    typeof body.customPrompt === "string"
      ? body.customPrompt.trim().slice(0, 500)
      : "";
  const aiModel =
    typeof body.aiModel === "string" && body.aiModel.trim()
      ? body.aiModel.trim()
      : undefined;

  if (!target) {
    return json({ ok: false, error: "target required" }, { status: 400 });
  }

  try {
    const estimate = await estimateSingleTranslateCredits({
      shop: session.shop,
      sourceText,
      target,
      fieldKey,
      customPrompt: customPrompt || undefined,
      aiModel,
    });
    return json({ ok: true, estimate });
  } catch (err) {
    console.error("[single-estimate] failed", { shop: session.shop, target }, err);
    return json({ ok: false, error: "estimate failed" }, { status: 500 });
  }
};
