import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { loadAppBootstrapData } from "~/server/appBootstrap.server";
import { loadOnboardingWizardComplete } from "~/server/onboarding/progress.server";
import { withEmbeddedSearch } from "~/utils/embeddedAction";

/**
 * `/app` 默认落地：
 * - 引导已结束（订 + 自动更新）→ 语言就绪页（无 locale 则智能翻译）
 * - 从未激活过订阅（isNew）→ 试译商品（新人首装路径）
 * - 其余 → 翻译 v4
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const search = new URL(request.url).search;

  try {
    const wizard = await loadOnboardingWizardComplete(session.shop);
    if (wizard.complete) {
      // 引导已结束 → 智能翻译首页；带 celebrate 让首页顶部弹一次「就绪带」。
      const dest = wizard.locale
        ? `/app/translate-v4?celebrate=${encodeURIComponent(wizard.locale)}`
        : "/app/translate-v4";
      throw redirect(withEmbeddedSearch(dest, search));
    }
  } catch (err) {
    if (err instanceof Response) throw err;
    console.error("[app._index] wizard check failed:", err);
  }

  let isNew = false;
  try {
    const bootstrap = await loadAppBootstrapData(session.shop);
    isNew = Boolean(bootstrap.isNew);
  } catch (err) {
    console.error("[app._index] bootstrap failed, fallback translate-v4:", err);
  }

  const dest = isNew ? "/app/trial-translate" : "/app/translate-v4";
  throw redirect(withEmbeddedSearch(dest, search));
};

export default function Index() {
  return null;
}
