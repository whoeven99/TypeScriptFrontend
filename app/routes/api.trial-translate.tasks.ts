import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import {
  createV4Job,
  existsBlockingTrialJob,
} from "~/server/translateV4/cosmos.server";
import { listV4JobSummaries } from "~/server/translateV4/progress.server";
import { resolveOfflineAccessToken } from "~/server/translateV4/token.server";
import {
  getTranslateV4RedisClient,
  v4HintKey,
} from "~/server/translateV4/redis.server";
import {
  TS_FRONTEND_TRIAL_TASK_SOURCE,
  V4_LIMIT_UNLIMITED,
} from "~/server/translateV4/types";
import { loadShopLocalesForTranslation } from "~/server/translateV4/shopLocales.server";

/** GET /api/trial-translate/tasks —— 列出本店试译任务。 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shopName = session.shop;

  const jobs = await listV4JobSummaries(shopName, {
    limit: 20,
    taskSource: TS_FRONTEND_TRIAL_TASK_SOURCE,
    escalateStuck: false,
  });
  return json({ ok: true, jobs });
};

/** POST /api/trial-translate/tasks —— 创建单商品免费试译任务。 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);

  const body = (await request.json().catch(() => ({}))) as {
    productId?: string;
    source?: string;
    target?: string;
    aiModel?: string;
  };

  const productId = body.productId?.trim() || "";
  if (!productId.startsWith("gid://shopify/Product/")) {
    return json({ ok: false, error: "trial.validation.selectProduct" }, { status: 400 });
  }

  const shopName = session.shop;
  const locales = await loadShopLocalesForTranslation({
    shop: shopName,
    accessToken: session.accessToken ?? "",
  });
  const source = body.source?.trim() || locales.primaryLocale || "en";
  const target = body.target?.trim() || "";
  if (!target) {
    return json({ ok: false, error: "trial.validation.selectTarget" }, { status: 400 });
  }
  if (target === source) {
    return json({ ok: false, error: "trial.validation.sameAsSource" }, { status: 400 });
  }

  // 确认商品存在
  const productCheck = await admin.graphql(
    `#graphql
      query TrialProductExists($id: ID!) {
        product(id: $id) { id title }
      }
    `,
    { variables: { id: productId } },
  );
  const productJson = (await productCheck.json()) as {
    data?: { product?: { id?: string } | null };
  };
  if (!productJson.data?.product?.id) {
    return json({ ok: false, error: "trial.validation.productNotFound" }, { status: 404 });
  }

  if (await existsBlockingTrialJob(shopName, productId, target)) {
    return json(
      { ok: false, error: "trial.error.blockingTaskExists" },
      { status: 409 },
    );
  }

  const jobId = crypto.randomUUID();
  const shopifyAccessToken =
    (await resolveOfflineAccessToken(shopName, session.accessToken)) ?? "";

  const job = await createV4Job({
    id: jobId,
    shopName,
    shopifyAccessToken,
    source,
    target,
    modules: ["PRODUCT"],
    aiModel: body.aiModel?.trim() || "gpt-4.1-nano",
    limitPerType: V4_LIMIT_UNLIMITED,
    isCover: true,
    isHandle: false,
    resourceIds: [productId],
    taskSource: TS_FRONTEND_TRIAL_TASK_SOURCE,
    status: "INIT_QUEUED",
    blobPrefix: `tasks/trial/${shopName}/${jobId}`,
    createdBy: shopName,
  });

  try {
    await getTranslateV4RedisClient().lpush(
      v4HintKey("init", "manual"),
      JSON.stringify({ taskId: jobId, shopName }),
    );
  } catch (err) {
    console.error("[trialTranslate] lpush init hint failed:", err);
  }

  console.log(
    `[trialTranslate] job created id=${jobId} shop=${shopName} product=${productId} ${source}→${target}`,
  );
  return json({ ok: true, jobId: job.id });
};
