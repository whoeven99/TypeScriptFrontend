import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { isShopMigrated } from "~/server/translateV4/migration.server";
import { getV4JobProgressSummary } from "~/server/translateV4/progress.server";

/** GET /api/translate-v4/task-progress?taskId=&shopName= —— 单任务实时进度（Cosmos + Redis 合并）。 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const taskId = url.searchParams.get("taskId")?.trim() || "";
  const shopName = url.searchParams.get("shopName")?.trim() || session.shop;

  if (!(await isShopMigrated(shopName))) {
    return json({ ok: false, error: "功能未开放" }, { status: 403 });
  }

  if (!taskId) return json({ ok: false, error: "taskId required" }, { status: 400 });

  const summary = await getV4JobProgressSummary(shopName, taskId);
  if (!summary) return json({ ok: false, error: "task not found" }, { status: 404 });

  return json({ ok: true, summary });
};
