import {
  json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import {
  listGlossaryDo,
  createGlossaryDo,
  updateGlossaryDo,
  deleteGlossaryDo,
} from "~/server/translateV4/glossary.server";
import {
  buildTranslateV4Error,
  TRANSLATE_V4_ERROR_KEYS,
} from "~/utils/translateV4Errors";

/** 统一返回 Java BaseResponse 形状，前端迁移前后渲染逻辑一致。 */
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

/** GET /api/translate-v4/glossary —— 列出本店术语表（仅迁移后的店用）。 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  try {
    return ok(await listGlossaryDo(session.shop));
  } catch (err) {
    console.error("[glossary] list failed:", err);
    return fail("GLOSSARY_LIST_FAILED");
  }
};

/**
 * POST /api/translate-v4/glossary —— 术语表增删改（仅迁移后的店用）。
 * body: { intent: "insert"|"update"|"delete", ... }
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const body = (await request.json().catch(() => ({}))) as {
    intent?: string;
    id?: number;
    ids?: number[];
    sourceText?: string;
    targetText?: string;
    rangeCode?: string | null;
    type?: number | boolean;
    status?: number;
  };

  try {
    switch (body.intent) {
      case "insert": {
        if (!body.sourceText || !body.targetText) {
            return fail("GLOSSARY_REQUIRED_FIELDS");
        }
        const row = await createGlossaryDo(shop, {
          sourceText: body.sourceText,
          targetText: body.targetText,
          rangeCode: body.rangeCode,
          type: body.type,
          status: body.status,
        });
        return ok(row);
      }
      case "update": {
          if (body.id == null) return fail("GLOSSARY_ID_REQUIRED");
        const row = await updateGlossaryDo(shop, Number(body.id), {
          sourceText: body.sourceText ?? "",
          targetText: body.targetText ?? "",
          rangeCode: body.rangeCode,
          type: body.type,
          status: body.status,
        });
          if (!row) return fail("GLOSSARY_NOT_FOUND");
        return ok(row);
      }
      case "delete": {
        const ids = (body.ids ?? []).map((x) => Number(x)).filter((n) => !Number.isNaN(n));
          if (!ids.length) return fail("INVALID_REQUEST");
          const count = await deleteGlossaryDo(shop, ids);
          if (count !== ids.length) return fail("GLOSSARY_NOT_FOUND");
          return ok({ count });
      }
      default:
          return fail("UNKNOWN_ACTION");
    }
  } catch (err) {
    console.error("[glossary] action failed:", err);
      return fail("GLOSSARY_SAVE_FAILED");
  }
};
