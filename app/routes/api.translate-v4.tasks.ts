import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import {
  createV4Job,
  existsBlockingV4Job,
} from "~/server/translateV4/cosmos.server";
import { listV4JobSummaries } from "~/server/translateV4/progress.server";
import { resolveOfflineAccessToken } from "~/server/translateV4/token.server";
import {
  getTranslateV4RedisClient,
  V4_HINT_KEYS,
} from "~/server/translateV4/redis.server";
import {
  TRANSLATION_V4_MODULES,
  TS_FRONTEND_TASK_SOURCE,
  type TranslationV4Module,
} from "~/server/translateV4/types";

/** GET /api/translate-v4/tasks —— 列出本店 TsFrontend 创建的任务。 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const shopName = url.searchParams.get("shopName")?.trim() || session.shop;

  const jobs = await listV4JobSummaries(shopName, {
    taskSource: TS_FRONTEND_TASK_SOURCE,
  });
  return json({ ok: true, jobs });
};

/** POST /api/translate-v4/tasks —— 创建一个 TsFrontend 翻译任务，写入 Cosmos 供 worker 消费。 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const body = (await request.json().catch(() => ({}))) as {
    source?: string;
    target?: string;
    modules?: string[];
    limitPerType?: number;
    isCover?: boolean;
    isHandle?: boolean;
    aiModel?: string;
  };

  const source = body.source?.trim() || "zh-CN";
  const target = body.target?.trim() || "";
  if (!target) return json({ ok: false, error: "目标语言不能为空" }, { status: 400 });
  if (target === source)
    return json({ ok: false, error: "目标语言不能和源语言相同" }, { status: 400 });

  const allowedSet = new Set<string>(TRANSLATION_V4_MODULES);
  const modules = (body.modules ?? ["PRODUCT", "COLLECTION", "PAGE", "ARTICLE"])
    .map((m) => m.trim().toUpperCase())
    .filter((m) => allowedSet.has(m)) as TranslationV4Module[];

  if (!modules.length)
    return json({ ok: false, error: "至少选择一个翻译模块" }, { status: 400 });

  const shopName = session.shop;
  if (await existsBlockingV4Job(shopName, source, target)) {
    return json(
      { ok: false, error: "该目标语言已有进行中的翻译任务" },
      { status: 409 },
    );
  }

  // 0 表示「全部」——不设上限；其余正数原样使用（最小 1）
  const rawLimit = Number(body.limitPerType);
  const limitPerType =
    rawLimit === 0 ? Number.MAX_SAFE_INTEGER : Math.max(rawLimit || 20, 1);

  const jobId = crypto.randomUUID();

  // worker 写回译文用的长效 offline token，建任务时落到 job 上
  const shopifyAccessToken =
    (await resolveOfflineAccessToken(shopName, session.accessToken)) ?? "";

  const job = await createV4Job({
    id: jobId,
    shopName,
    shopifyAccessToken,
    source,
    target,
    modules,
    aiModel: body.aiModel?.trim() || "deepseek-v4-flash",
    limitPerType,
    isCover: body.isCover ?? false,
    isHandle: body.isHandle ?? false,
    taskSource: TS_FRONTEND_TASK_SOURCE,
    status: "INIT_QUEUED",
    blobPrefix: `tasks/v4/${shopName}/${jobId}`,
    createdBy: shopName,
  });

  // 推 hint 让 worker 立即拾取（best-effort）
  try {
    await getTranslateV4RedisClient().lpush(
      V4_HINT_KEYS.init,
      JSON.stringify({ taskId: jobId, shopName }),
    );
  } catch (err) {
    console.error("[translateV4] lpush init hint failed:", err);
  }

  console.log(
    `[translateV4] job created id=${jobId} shop=${shopName} ${source}→${target} modules=${modules.join(",")} source=${TS_FRONTEND_TASK_SOURCE}`,
  );
  return json({ ok: true, jobId: job.id });
};
