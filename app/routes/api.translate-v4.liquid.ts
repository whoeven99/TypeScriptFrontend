import {
  json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import {
  listLiquidDo,
  createLiquidDo,
  updateLiquidDo,
  deleteLiquidDo,
  toggleLiquidReplacementMethod,
} from "~/server/translateV4/liquidRule.server";

function ok(response: unknown) {
  return json({ success: true, errorCode: null, errorMsg: null, response });
}
function fail(errorMsg: string, errorCode = 10001) {
  return json({ success: false, errorCode, errorMsg, response: null });
}

/** GET /api/translate-v4/liquid —— 列出本店 Liquid 规则（仅迁移后的店用）。 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  try {
    return ok(await listLiquidDo(session.shop));
  } catch (err) {
    console.error("[liquid] list failed:", err);
    return fail(err instanceof Error ? err.message : String(err));
  }
};

/**
 * POST /api/translate-v4/liquid —— Liquid 增删改（仅迁移后的店用）。
 * body: { intent: "insert"|"update"|"delete"|"toggleReplacementMethod", ... }
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const body = (await request.json().catch(() => ({}))) as {
    intent?: string;
    id?: string;
    ids?: string[];
    sourceText?: string;
    targetText?: string;
    languageCode?: string;
    replacementMethod?: boolean;
  };

  try {
    switch (body.intent) {
      case "insert": {
        if (!body.sourceText || !body.targetText || !body.languageCode) {
          return fail("sourceText/targetText/languageCode 不能为空");
        }
        const row = await createLiquidDo(shop, {
          sourceText: body.sourceText,
          targetText: body.targetText,
          languageCode: body.languageCode,
          replacementMethod: body.replacementMethod,
        });
        if (row === "duplicate") {
          return fail("Liquid data already exists");
        }
        return ok(row);
      }
      case "update": {
        if (!body.id) return fail("缺少 id");
        if (!body.sourceText || !body.targetText || !body.languageCode) {
          return fail("sourceText/targetText/languageCode 不能为空");
        }
        const row = await updateLiquidDo(shop, body.id, {
          sourceText: body.sourceText,
          targetText: body.targetText,
          languageCode: body.languageCode,
          replacementMethod: body.replacementMethod,
        });
        if (row === "duplicate") {
          return fail("Liquid data already exists");
        }
        if (!row) return fail("规则不存在或无权限", 10404);
        return ok(row);
      }
      case "delete": {
        const ids = (body.ids ?? []).filter((x) => typeof x === "string" && x);
        const deleted = await deleteLiquidDo(shop, ids);
        return ok(deleted);
      }
      case "toggleReplacementMethod": {
        if (!body.id) return fail("缺少 id");
        const next = await toggleLiquidReplacementMethod(shop, body.id);
        if (next == null) return fail("规则不存在或无权限", 10404);
        return ok(next);
      }
      default:
        return fail("未知 intent");
    }
  } catch (err) {
    console.error("[liquid] action failed:", err);
    return fail(err instanceof Error ? err.message : String(err));
  }
};
