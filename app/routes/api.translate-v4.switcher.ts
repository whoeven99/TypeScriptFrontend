import {
  json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import {
  getSwitcherConfigForAdmin,
  saveSwitcherConfigForAdmin,
} from "~/server/storefront/switcherAdmin.server";
import type { SwitcherConfigWriteInput } from "~/lib/switcherConstants";
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

/** GET /api/translate-v4/switcher —— 读取 Switcher 配置（Turso）。 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  try {
    return ok(await getSwitcherConfigForAdmin(session.shop));
  } catch (err) {
    console.error("[switcher] get failed:", err);
    return fail("SWITCHER_LOAD_FAILED");
  }
};

/**
 * POST /api/translate-v4/switcher —— 保存 Switcher 配置（Turso）。
 * body 字段与 Java `saveAndUpdateData` 一致（不含 shopName/server）。
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const body = (await request.json().catch(() => ({}))) as Partial<
    SwitcherConfigWriteInput
  >;

  try {
    const saved = await saveSwitcherConfigForAdmin(shop, body);
    return ok(saved);
  } catch (err) {
    console.error("[switcher] save failed:", err);
    return fail("SWITCHER_SAVE_FAILED");
  }
};
