import {
  json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import {
  setAutoTranslate,
  listTargetLocales,
} from "~/server/translateV4/targetLocale.server";

/**
 * GET /api/translate-v4/target-locale —— 列出本店每语言状态（仅迁移后的店）。
 * 返回形状对齐 Java GetLanguageList：{ success, response: [{ target, status, autoTranslate }] }
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  try {
    const rows = await listTargetLocales(session.shop);
    return json({
      success: true,
      response: rows.map((r) => ({
        target: r.locale,
        status: r.status,
        autoTranslate: r.autoTranslate,
      })),
    });
  } catch (err) {
    console.error("[target-locale] list failed:", err);
    return json({ success: false, response: [] });
  }
};

/**
 * POST /api/translate-v4/target-locale —— 语言页按语言自动翻译开关（仅迁移后的店）。
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
      if (!body.locale) return json({ success: false, errorMsg: "缺少 locale" });
      await setAutoTranslate(session.shop, body.locale, Boolean(body.autoTranslate));
      return json({ success: true, response: { locale: body.locale, autoTranslate: !!body.autoTranslate } });
    }
    return json({ success: false, errorMsg: "未知 intent" });
  } catch (err) {
    console.error("[target-locale] action failed:", err);
    return json({ success: false, errorMsg: err instanceof Error ? err.message : String(err) });
  }
};
