import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { getV4Job } from "~/server/translateV4/cosmos.server";
import { getV4JobProgressSummary } from "~/server/translateV4/progress.server";
import { isTrialV4TaskSource } from "~/server/translateV4/types";
import {
  buildLocalizedProductUrl,
  loadTrialProductPreview,
} from "~/server/trialTranslate/preview.server";
import { loadTrialProductDetail } from "~/server/trialTranslate/product.server";

/** GET /api/trial-translate/preview?taskId= —— 试译预览数据。 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const shopName = session.shop;
  const url = new URL(request.url);
  const taskId = url.searchParams.get("taskId")?.trim() || "";

  if (!taskId) {
    return json({ ok: false, error: "trial.error.taskIdRequired" }, { status: 400 });
  }

  const job = await getV4Job(shopName, taskId);
  if (!job || !isTrialV4TaskSource(job.taskSource)) {
    return json({ ok: false, error: "trial.error.taskNotFound" }, { status: 404 });
  }

  const productId = job.resourceIds?.[0] ?? "";
  if (!productId) {
    return json({ ok: false, error: "trial.error.productMissing" }, { status: 400 });
  }

  const summary = await getV4JobProgressSummary(shopName, taskId);
  const { product, primaryDomain } = await loadTrialProductDetail(admin, productId);

  const previewReady =
    job.status === "TRANSLATE_DONE" ||
    job.status === "WRITEBACK_QUEUED" ||
    job.status === "WRITING_BACK" ||
    job.status === "COMPLETED";

  const preview = previewReady
    ? await loadTrialProductPreview(job.blobPrefix, productId)
    : null;

  // 优先 onlineStoreUrl；为空时用 handle 兜底（该字段对不少已发布商品也返回 null）。
  const storefrontUrl =
    product?.onlineStoreUrl ||
    buildLocalizedProductUrl(null, product?.handle, primaryDomain, "");
  const localizedStorefrontUrl = buildLocalizedProductUrl(
    product?.onlineStoreUrl,
    product?.handle,
    primaryDomain,
    job.target,
  );

  return json({
    ok: true,
    job: {
      id: job.id,
      status: job.status,
      source: job.source,
      target: job.target,
      productId,
      errorMessage: job.errorMessage,
    },
    summary,
    product,
    preview,
    storefrontUrl,
    localizedStorefrontUrl,
    previewReady,
  });
};
