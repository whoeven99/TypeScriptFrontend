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

/** 统一返回 Java BaseResponse 形状，前端迁移前后渲染逻辑一致。 */
function ok(response: unknown) {
  return json({ success: true, errorCode: null, errorMsg: null, response });
}
function fail(errorMsg: string, errorCode = 10001) {
  return json({ success: false, errorCode, errorMsg, response: null });
}

/** GET /api/translate-v4/glossary —— 列出本店术语表（仅迁移后的店用）。 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  try {
    return ok(await listGlossaryDo(session.shop));
  } catch (err) {
    console.error("[glossary] list failed:", err);
    return fail(err instanceof Error ? err.message : String(err));
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
          return fail("sourceText/targetText 不能为空");
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
        if (body.id == null) return fail("缺少 id");
        const row = await updateGlossaryDo(shop, Number(body.id), {
          sourceText: body.sourceText ?? "",
          targetText: body.targetText ?? "",
          rangeCode: body.rangeCode,
          type: body.type,
          status: body.status,
        });
        if (!row) return fail("术语不存在或无权限", 10404);
        return ok(row);
      }
      case "delete": {
        const ids = (body.ids ?? []).map((x) => Number(x)).filter((n) => !Number.isNaN(n));
        const count = await deleteGlossaryDo(shop, ids);
        return ok({ count });
      }
      default:
        return fail("未知 intent");
    }
  } catch (err) {
    console.error("[glossary] action failed:", err);
    return fail(err instanceof Error ? err.message : String(err));
  }
};
