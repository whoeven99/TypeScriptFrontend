import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
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
    /** 管理页当前译文；有值时跳过 TM 缓存、强制 LLM 重译。 */
    translated?: string;
  };
  const target = (body.target ?? "").trim();
  const text = body.context ?? "";
  const existingTranslation = body.translated ?? "";
  const source = (body.source ?? "en").trim() || "en";
  const fieldKey = body.key?.trim() || "value";
  const shopifyType = body.type?.trim() || body.resourceType?.trim();

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
    const { translatedText, usedTokens } = await translateSingleText({
      shop,
      target,
      text,
      source,
      fieldKey,
      shopifyType,
      existingTranslation,
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
