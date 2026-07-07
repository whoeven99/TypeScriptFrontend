import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { getV4JobProgressSummary } from "~/server/translateV4/progress.server";

/** GET /api/translate-v4/task-progress?taskId=&shopName= —— 单任务实时进度（Cosmos + Redis 合并）。 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const taskId = url.searchParams.get("taskId")?.trim() || "";
  const shopName = url.searchParams.get("shopName")?.trim() || session.shop;

  if (!taskId) return json({ ok: false, error: "v4.error.taskIdRequired" }, { status: 400 });

  const summary = await getV4JobProgressSummary(shopName, taskId);
  if (!summary) return json({ ok: false, error: "v4.error.taskNotFound" }, { status: 404 });

  return json({ ok: true, summary });
};
