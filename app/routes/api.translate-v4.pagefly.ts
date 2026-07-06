import {
  json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import {
  editPageFlyTranslations,
  listPageFlyTranslations,
  type PageFlyEditItem,
} from "~/server/translateV4/pageflyTranslation.server";
import {
  buildTranslateV4Error,
  TRANSLATE_V4_ERROR_KEYS,
} from "~/utils/translateV4Errors";

function ok(response: unknown) {
  return json({ success: true, errorCode: null, errorMsg: null, response });
}
function fail(errorKey: keyof typeof TRANSLATE_V4_ERROR_KEYS) {
  const error = buildTranslateV4Error(TRANSLATE_V4_ERROR_KEYS[errorKey]);
  return json(
    {
      success: false,
      errorCode: error.errorCode,
      errorMsg: error.errorMsg,
      response: null,
    },
    { status: error.status },
  );
}

/** GET /api/translate-v4/pagefly?languageCode= —— 列出本店 PageFly 译文。 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const languageCode =
    new URL(request.url).searchParams.get("languageCode")?.trim() ?? "";
  if (!languageCode) return fail("PAGEFLY_LANGUAGE_REQUIRED");

  try {
    return ok(await listPageFlyTranslations(session.shop, languageCode));
  } catch (err) {
    console.error("[pagefly] list failed:", err);
    return fail("PAGEFLY_LIST_FAILED");
  }
};

/**
 * POST /api/translate-v4/pagefly —— PageFly 批量保存。
 * body: { items: PageFlyEditItem[] }
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const body = (await request.json().catch(() => ({}))) as {
    items?: PageFlyEditItem[];
  };
  const items = Array.isArray(body.items) ? body.items : [];
  if (!items.length) return fail("PAGEFLY_INVALID_ITEMS");

  try {
    return ok(await editPageFlyTranslations(session.shop, items));
  } catch (err) {
    console.error("[pagefly] edit failed:", err);
    return fail("PAGEFLY_SAVE_FAILED");
  }
};
