import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { evaluateCreateTaskQuotaGuard } from "~/server/billing/quota/createTaskQuotaGuard.server";
import {
  translateSingleText,
  deductQuota,
} from "~/server/translateV4/singleTranslate.server";
import {
  buildTranslateV4Error,
  TRANSLATE_V4_ERROR_KEYS,
} from "~/utils/translateV4Errors";

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
    customPrompt?: string;
    aiModel?: string;
  };
  const target = (body.target ?? "").trim();
  const text = body.context ?? "";
  const source = (body.source ?? "en").trim() || "en";
  const fieldKey = body.key?.trim() || "value";
  const shopifyType = body.type?.trim() || body.resourceType?.trim();
  // 上限保护：自定义提示词最多 500 字，超出截断，避免撑爆 system prompt。
  const customPrompt = (body.customPrompt ?? "").trim().slice(0, 500);
  const aiModel = body.aiModel?.trim() || "gpt-4.1-nano";

  try {
    if (!target) {
      const appError = buildTranslateV4Error(
        TRANSLATE_V4_ERROR_KEYS.SINGLE_TARGET_REQUIRED,
      );
      return json(
        {
          success: false,
          errorCode: appError.errorCode,
          errorMsg: appError.errorMsg,
          response: "",
        },
        { status: appError.status },
      );
    }

    const quotaGuard = await evaluateCreateTaskQuotaGuard(shop);
    if (!quotaGuard.ok) {
      return json(
        {
          success: false,
          errorCode: 403,
          errorMsg: quotaGuard.error,
          response: "",
        },
        { status: quotaGuard.status },
      );
    }

    console.log("[single] api", {
      shop,
      source,
      target,
      fieldKey,
      shopifyType,
      aiModel,
      original: text,
      customPrompt,
    });

    const { translatedText, usedTokens } = await translateSingleText({
      shop,
      target,
      text,
      source,
      fieldKey,
      shopifyType,
      aiModel,
      customPrompt,
    });
    await deductQuota(shop, usedTokens);
    return json({ success: true, response: translatedText });
  } catch (err) {
    console.error(`[single] ${shop} failed:`, err);
    const appError = buildTranslateV4Error(
      TRANSLATE_V4_ERROR_KEYS.SINGLE_TRANSLATE_FAILED,
    );
    return json(
      {
        success: false,
        errorCode: appError.errorCode,
        errorMsg: appError.errorMsg,
        response: "",
      },
      { status: appError.status },
    );
  }
};
