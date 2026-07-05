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

function ok(response: unknown) {
  return json({ success: true, errorCode: null, errorMsg: null, response });
}
function fail(errorMsg: string, errorCode = 10001) {
  return json({ success: false, errorCode, errorMsg, response: null });
}

/** GET /api/translate-v4/pagefly?languageCode= —— 列出本店 PageFly 译文。 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const languageCode =
    new URL(request.url).searchParams.get("languageCode")?.trim() ?? "";
  if (!languageCode) return fail("languageCode 不能为空");

  try {
    return ok(await listPageFlyTranslations(session.shop, languageCode));
  } catch (err) {
    console.error("[pagefly] list failed:", err);
    return fail(err instanceof Error ? err.message : String(err));
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

  try {
    return ok(await editPageFlyTranslations(session.shop, items));
  } catch (err) {
    console.error("[pagefly] edit failed:", err);
    return fail(err instanceof Error ? err.message : String(err));
  }
};
