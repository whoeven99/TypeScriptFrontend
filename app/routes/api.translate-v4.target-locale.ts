import {
  json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import {
  setAutoTranslate,
} from "~/server/translateV4/targetLocale.server";
import { listLanguageStatusFromV4 } from "~/server/translateV4/languageStatus.server";
import {
  buildTranslateV4Error,
  TRANSLATE_V4_ERROR_KEYS,
} from "~/utils/translateV4Errors";

/**
 * GET /api/translate-v4/target-locale —— 列出本店每语言状态。
 * 返回形状对齐 Java GetLanguageList：{ success, response: [{ target, status, autoTranslate }] }
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  try {
    const rows = await listLanguageStatusFromV4(session.shop);
    return json({
      success: true,
      response: rows,
    });
  } catch (err) {
    console.error("[target-locale] list failed:", err);
    const appError = buildTranslateV4Error(
      TRANSLATE_V4_ERROR_KEYS.TARGET_LOCALE_LIST_FAILED,
    );
    return json(
      {
        success: false,
        errorCode: appError.errorCode,
        errorMsg: appError.errorMsg,
        response: [],
      },
      { status: appError.status },
    );
  }
};

/**
 * POST /api/translate-v4/target-locale —— 语言页按语言自动翻译开关。
 * body: { intent: "setAuto", locale, autoTranslate }
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const body = (await request.json().catch(() => ({}))) as {
    intent?: string;
    locale?: string;
    autoTranslate?: boolean;
  };

  try {
    if (body.intent === "setAuto") {
      if (!body.locale) {
        const appError = buildTranslateV4Error(
          TRANSLATE_V4_ERROR_KEYS.TARGET_LOCALE_REQUIRED,
        );
        return json(
          {
            success: false,
            errorCode: appError.errorCode,
            errorMsg: appError.errorMsg,
          },
          { status: appError.status },
        );
      }
      await setAutoTranslate(session.shop, body.locale, Boolean(body.autoTranslate));
      return json({ success: true, response: { locale: body.locale, autoTranslate: !!body.autoTranslate } });
    }
    const appError = buildTranslateV4Error(
      TRANSLATE_V4_ERROR_KEYS.UNKNOWN_ACTION,
    );
    return json(
      {
        success: false,
        errorCode: appError.errorCode,
        errorMsg: appError.errorMsg,
      },
      { status: appError.status },
    );
  } catch (err) {
    console.error("[target-locale] action failed:", err);
    const appError = buildTranslateV4Error(
      TRANSLATE_V4_ERROR_KEYS.TARGET_LOCALE_SAVE_FAILED,
    );
    return json(
      {
        success: false,
        errorCode: appError.errorCode,
        errorMsg: appError.errorMsg,
      },
      { status: appError.status },
    );
  }
};
