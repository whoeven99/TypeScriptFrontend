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

/** GET /api/translate-v4/liquid —— 列出本店 Liquid 规则。 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  try {
    return ok(await listLiquidDo(session.shop));
  } catch (err) {
    console.error("[liquid] list failed:", err);
    return fail("LIQUID_LIST_FAILED");
  }
};

/**
 * POST /api/translate-v4/liquid —— Liquid 增删改。
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
          return fail("LIQUID_REQUIRED_FIELDS");
        }
        const row = await createLiquidDo(shop, {
          sourceText: body.sourceText,
          targetText: body.targetText,
          languageCode: body.languageCode,
          replacementMethod: body.replacementMethod,
        });
        if (row === "duplicate") {
          return fail("LIQUID_DUPLICATE_RULE");
        }
        return ok(row);
      }
      case "update": {
        if (!body.id) return fail("LIQUID_ID_REQUIRED");
        if (!body.sourceText || !body.targetText || !body.languageCode) {
          return fail("LIQUID_REQUIRED_FIELDS");
        }
        const row = await updateLiquidDo(shop, body.id, {
          sourceText: body.sourceText,
          targetText: body.targetText,
          languageCode: body.languageCode,
          replacementMethod: body.replacementMethod,
        });
        if (row === "duplicate") {
          return fail("LIQUID_DUPLICATE_RULE");
        }
        if (!row) return fail("LIQUID_NOT_FOUND");
        return ok(row);
      }
      case "delete": {
        const ids = (body.ids ?? []).filter((x) => typeof x === "string" && x);
        if (!ids.length) return fail("INVALID_REQUEST");
        const deleted = await deleteLiquidDo(shop, ids);
        if (!deleted.length) return fail("LIQUID_NOT_FOUND");
        return ok(deleted);
      }
      case "toggleReplacementMethod": {
        if (!body.id) return fail("LIQUID_ID_REQUIRED");
        const next = await toggleLiquidReplacementMethod(shop, body.id);
        if (next == null) return fail("LIQUID_NOT_FOUND");
        return ok(next);
      }
      default:
        return fail("UNKNOWN_ACTION");
    }
  } catch (err) {
    console.error("[liquid] action failed:", err);
    return fail("LIQUID_SAVE_FAILED");
  }
};
