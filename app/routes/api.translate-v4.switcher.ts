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

function ok(response: unknown) {
  return json({ success: true, errorCode: null, errorMsg: null, response });
}

function fail(errorMsg: string, errorCode = 10001) {
  return json({ success: false, errorCode, errorMsg, response: null });
}

/** GET /api/translate-v4/switcher —— 读取 Switcher 配置（Turso）。 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  try {
    return ok(await getSwitcherConfigForAdmin(session.shop));
  } catch (err) {
    console.error("[switcher] get failed:", err);
    return fail(err instanceof Error ? err.message : String(err));
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
    return fail(err instanceof Error ? err.message : String(err));
  }
};
