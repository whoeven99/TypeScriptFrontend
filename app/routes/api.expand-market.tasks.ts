import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { evaluateCreateTaskQuotaGuard } from "~/server/billing/quota/createTaskQuotaGuard.server";
import { getAccountQuota } from "~/server/billing/quota/getAccountQuota.server";
import {
  createV4Job,
  existsBlockingV4Job,
} from "~/server/translateV4/cosmos.server";
import { listV4JobSummaries } from "~/server/translateV4/progress.server";
import { resolveOfflineAccessToken } from "~/server/translateV4/token.server";
import {
  getTranslateV4RedisClient,
  v4HintKey,
} from "~/server/translateV4/redis.server";
import {
  TS_FRONTEND_EXPAND_TASK_SOURCE,
  V4_LIMIT_UNLIMITED,
} from "~/server/translateV4/types";
import { loadShopLocalesForTranslation } from "~/server/translateV4/shopLocales.server";
import { buildStarterPackEstimate } from "~/server/expandMarket/starterPack.server";
import {
  defaultManualV4Modules,
  expandV2ModuleKeys,
} from "~/server/translateV4/moduleCatalog";

/** GET /api/expand-market/tasks —— 列出本店开拓市场翻译任务。 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const jobs = await listV4JobSummaries(session.shop, {
    limit: 30,
    taskSource: TS_FRONTEND_EXPAND_TASK_SOURCE,
    escalateStuck: false,
  });
  return json({ ok: true, jobs });
};

/**
 * POST /api/expand-market/tasks —— 创建开拓市场翻译任务。
 * - starter：全部 PRODUCT（含选项），resourceIds=null，isCover 默认 true
 * - fullStore：默认手动全模块，一次性建仓其余内容
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);

  const body = (await request.json().catch(() => ({}))) as {
    source?: string;
    target?: string;
    aiModel?: string;
    isCover?: boolean;
    mode?: "starter" | "full" | "fullStore";
  };

  const shopName = session.shop;
  const locales = await loadShopLocalesForTranslation({
    shop: shopName,
    accessToken: session.accessToken ?? "",
  });
  const source = body.source?.trim() || locales.primaryLocale || "en";
  const target = body.target?.trim() || "";
  if (!target) {
    return json({ ok: false, error: "expand.validation.selectTarget" }, { status: 400 });
  }
  if (target === source) {
    return json({ ok: false, error: "expand.validation.sameAsSource" }, { status: 400 });
  }

  const published = locales.rows.some((r) => r.locale === target && r.published);
  if (!published) {
    return json(
      { ok: false, error: "expand.error.localeNotPublished" },
      { status: 400 },
    );
  }

  const mode =
    body.mode === "fullStore" || body.mode === "full" ? "fullStore" : "starter";

  const estimate = await buildStarterPackEstimate({
    shop: shopName,
    admin,
    remainingCredits: (await getAccountQuota(shopName))?.remainingCredits ?? 0,
  });
  if (estimate.productCount <= 0) {
    return json({ ok: false, error: "expand.error.noProducts" }, { status: 400 });
  }

  if (mode === "starter") {
    if (estimate.needsPurchase) {
      return json(
        {
          ok: false,
          error: "expand.error.insufficientCredits",
          estimatedCredits: estimate.estimatedCredits,
          remainingCredits: estimate.remainingCredits,
        },
        { status: 402 },
      );
    }
  } else {
    const need = estimate.fullStoreEstimatedCredits ?? estimate.estimatedCredits;
    if (need > 0 && estimate.remainingCredits < need) {
      return json(
        {
          ok: false,
          error: "expand.error.insufficientCreditsFullStore",
          estimatedCredits: need,
          remainingCredits: estimate.remainingCredits,
        },
        { status: 402 },
      );
    }
  }

  const quotaGuard = await evaluateCreateTaskQuotaGuard(shopName);
  if (!quotaGuard.ok) {
    return json({ ok: false, error: quotaGuard.error }, { status: quotaGuard.status });
  }

  if (await existsBlockingV4Job(shopName, source, target)) {
    return json(
      { ok: false, error: "expand.error.blockingTaskExists" },
      { status: 409 },
    );
  }

  const jobId = crypto.randomUUID();
  const shopifyAccessToken =
    (await resolveOfflineAccessToken(shopName, session.accessToken)) ?? "";

  // 起步/全店建仓均默认完整翻译，避免空跑 COMPLETED。
  const isCover = body.isCover ?? true;
  const modules =
    mode === "starter"
      ? expandV2ModuleKeys(["products"])
      : defaultManualV4Modules();

  const job = await createV4Job({
    id: jobId,
    shopName,
    shopifyAccessToken,
    source,
    target,
    modules,
    aiModel: body.aiModel?.trim() || "gpt-4.1-nano",
    limitPerType: V4_LIMIT_UNLIMITED,
    isCover,
    isHandle: false,
    resourceIds: null,
    taskSource: TS_FRONTEND_EXPAND_TASK_SOURCE,
    status: "INIT_QUEUED",
    blobPrefix: `tasks/expand/${shopName}/${jobId}`,
    createdBy: shopName,
  });

  try {
    await getTranslateV4RedisClient().lpush(
      v4HintKey("init", "manual"),
      JSON.stringify({ taskId: jobId, shopName }),
    );
  } catch (err) {
    console.error("[expandMarket] lpush init hint failed:", err);
  }

  console.log(
    `[expandMarket] job created id=${jobId} shop=${shopName} ${source}→${target}` +
      ` mode=${mode} modules=${modules.length}`,
  );
  return json({
    ok: true,
    jobId: job.id,
    mode,
  });
};
