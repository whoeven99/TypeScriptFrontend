import {
  json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { isShopMigrated } from "~/server/translateV4/migration.server";
import {
  getSwitcherConfigForAdmin,
  saveSwitcherConfigForAdmin,
} from "~/server/storefront/switcherAdmin.server";
import type { SwitcherConfigWriteInput } from "~/server/storefront/switcherData.server";

function ok(response: unknown) {
  return json({ success: true, errorCode: null, errorMsg: null, response });
}

function fail(errorMsg: string, errorCode = 10001) {
  return json({ success: false, errorCode, errorMsg, response: null });
}

async function assertMigratedShop(shop: string) {
  if (!(await isShopMigrated(shop))) {
    return fail("not migrated", 403);
  }
  return null;
}

/** GET /api/translate-v4/switcher —— 灰度店读取 Switcher 配置（Turso）。 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const blocked = await assertMigratedShop(session.shop);
  if (blocked) return blocked;

  try {
    return ok(await getSwitcherConfigForAdmin(session.shop));
  } catch (err) {
    console.error("[switcher] get failed:", err);
    return fail(err instanceof Error ? err.message : String(err));
  }
};

/**
 * POST /api/translate-v4/switcher —— 灰度店保存 Switcher 配置（Turso）。
 * body 字段与 Java `saveAndUpdateData` 一致（不含 shopName/server）。
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const blocked = await assertMigratedShop(shop);
  if (blocked) return blocked;

  const body = (await request.json().catch(() => ({}))) as Partial<
    SwitcherConfigWriteInput & { shopName?: string; server?: string }
  >;

  try {
    const saved = await saveSwitcherConfigForAdmin(shop, body);
    return ok(saved);
  } catch (err) {
    console.error("[switcher] save failed:", err);
    return fail(err instanceof Error ? err.message : String(err));
  }
};
