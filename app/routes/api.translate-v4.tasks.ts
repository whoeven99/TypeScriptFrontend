import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { getNormalizedQuotaRemaining } from "~/lib/translationQuota";
import { getShopCreditQuota } from "~/server/billing/quota/quotaRouter.server";
import { loadAppBootstrapJavaData } from "~/server/appBootstrap.server";
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
  V4_LIMIT_UNLIMITED,
  type TranslationV4Module,
} from "~/server/translateV4/types";
import { defaultManualV4Modules } from "~/server/translateV4/moduleCatalog";

async function validateCreateQuotaGuard(shopName: string): Promise<
  | { ok: true }
  | {
      ok: false;
      status: number;
      error: string;
    }
> {
  const quota = await getShopCreditQuota(shopName);
  const remainingCredits = getNormalizedQuotaRemaining(quota);
  if (remainingCredits == null) {
    return {
      ok: false,
      status: 503,
      error: "v4.create.quotaUnavailable",
    };
  }
  if (remainingCredits > 0) {
    return { ok: true };
  }

  const bootstrap = await loadAppBootstrapJavaData({
    shop: shopName,
    server: process.env.SERVER_URL || "",
  });
  const normalizedPlanType = bootstrap.plan.type?.trim().toLowerCase() || "";
  const hasPaidPlan =
    normalizedPlanType !== "" && normalizedPlanType !== "free";

  if (hasPaidPlan || bootstrap.plan.isInFreePlanTime) {
    return { ok: true };
  }

  if (bootstrap.isNew === null) {
    return {
      ok: false,
      status: 409,
      error: "v4.create.quotaCheckPending",
    };
  }

  return {
    ok: false,
    status: 403,
    error: bootstrap.isNew
      ? "v4.create.noCreditsTrial"
      : "v4.create.noCreditsPricing",
  };
}

/** GET /api/translate-v4/tasks —— 列出本店 v4 任务（手动 + 自动）。 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const shopName = url.searchParams.get("shopName")?.trim() || session.shop;

  const jobs = await listV4JobSummaries(shopName, { limit: 50 });
  return json({ ok: true, jobs });
};

/** POST /api/translate-v4/tasks —— 创建一个 TsFrontend 翻译任务，写入 Cosmos 供 worker 消费。 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const body = (await request.json().catch(() => ({}))) as {
    source?: string;
    target?: string;
    modules?: string[];
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
  const modules = (body.modules ?? defaultManualV4Modules())
    .map((m) => m.trim().toUpperCase())
    .filter((m) => allowedSet.has(m)) as TranslationV4Module[];

  if (!modules.length)
    return json({ ok: false, error: "至少选择一个翻译模块" }, { status: 400 });

  const shopName = session.shop;
  const quotaGuard = await validateCreateQuotaGuard(shopName);
  if (!quotaGuard.ok) {
    return json({ ok: false, error: quotaGuard.error }, { status: quotaGuard.status });
  }

  if (await existsBlockingV4Job(shopName, source, target)) {
    return json(
      { ok: false, error: "该目标语言已有进行中的翻译任务" },
      { status: 409 },
    );
  }

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
    aiModel: body.aiModel?.trim() || "gpt-4.1-nano",
    limitPerType: V4_LIMIT_UNLIMITED,
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
