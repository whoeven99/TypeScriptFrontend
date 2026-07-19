import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { ensureTrialLocaleEnabled } from "~/server/trialTranslate/locale.server";
import { loadShopLocalesForTranslation } from "~/server/translateV4/shopLocales.server";
import { getV4Job, updateV4Job } from "~/server/translateV4/cosmos.server";
import {
  getTranslateV4RedisClient,
  v4HintKey,
} from "~/server/translateV4/redis.server";
import { isTrialV4TaskSource } from "~/server/translateV4/types";

/** POST /api/trial-translate/save —— 用户确认后把试译任务推进到写回。 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shopName = session.shop;

  const body = (await request.json().catch(() => ({}))) as {
    taskId?: string;
  };
  const taskId = body.taskId?.trim() || "";
  if (!taskId) {
    return json({ ok: false, error: "trial.error.taskIdRequired" }, { status: 400 });
  }

  const job = await getV4Job(shopName, taskId);
  if (!job || !isTrialV4TaskSource(job.taskSource)) {
    return json({ ok: false, error: "trial.error.taskNotFound" }, { status: 404 });
  }

  if (job.status === "COMPLETED") {
    return json({ ok: true, alreadySaved: true, status: job.status });
  }

  if (
    job.status === "WRITEBACK_QUEUED" ||
    job.status === "WRITING_BACK"
  ) {
    return json({ ok: true, alreadySaving: true, status: job.status });
  }

  if (job.status !== "TRANSLATE_DONE") {
    return json(
      { ok: false, error: "trial.error.notReadyToSave", status: job.status },
      { status: 409 },
    );
  }

  const ensuredLocale = await ensureTrialLocaleEnabled({
    shop: shopName,
    accessToken: job.shopifyAccessToken || session.accessToken || "",
    locale: job.target,
    primaryLocale: job.source,
  });
  if (!ensuredLocale.ok) {
    return json(
      { ok: false, error: ensuredLocale.error || "trial.error.addLanguageFailed" },
      { status: 400 },
    );
  }
  const refreshedLocales = await loadShopLocalesForTranslation({
    shop: shopName,
    accessToken: job.shopifyAccessToken || session.accessToken || "",
  });

  const writebackTotal =
    job.metrics?.writebackTotal ||
    job.metrics?.translateDone ||
    job.metrics?.translateTotal ||
    0;

  const updated = await updateV4Job(shopName, taskId, {
    status: "WRITEBACK_QUEUED",
    claimedBy: null,
    pauseAfterWriteback: null,
    errorStage: null,
    errorMessage: null,
    metrics: {
      ...job.metrics,
      writebackTotal,
    },
  });

  if (!updated) {
    return json({ ok: false, error: "trial.error.saveFailed" }, { status: 500 });
  }

  try {
    await getTranslateV4RedisClient().lpush(
      v4HintKey("writeback", "manual"),
      JSON.stringify({ taskId, shopName }),
    );
  } catch (err) {
    console.error("[trialTranslate] lpush writeback hint failed:", err);
  }

  console.log(`[trialTranslate] save → WRITEBACK_QUEUED task=${taskId} shop=${shopName}`);
  return json({
    ok: true,
    status: "WRITEBACK_QUEUED",
    localeOptions: refreshedLocales.localeOptions,
    primaryLocale: refreshedLocales.primaryLocale,
  });
};
