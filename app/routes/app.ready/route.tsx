import { redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { withEmbeddedSearch } from "~/utils/embeddedAction";
import { loadOnboardingWizardComplete } from "~/server/onboarding/progress.server";

/**
 * `/app/ready` 已退役：就绪体验合并进智能翻译首页顶部的「就绪带」。
 * 保留此路由仅做兼容重定向（邮件 / 旧深链），带 celebrate 触发一次就绪带。
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const localeParam = url.searchParams.get("locale")?.trim() || "";

  let locale = localeParam;
  if (!locale) {
    try {
      const wizard = await loadOnboardingWizardComplete(session.shop);
      locale = wizard.locale || "";
    } catch (err) {
      console.error("[app.ready] wizard check failed:", err);
    }
  }

  const dest = locale
    ? `/app/translate-v4?celebrate=${encodeURIComponent(locale)}`
    : "/app/translate-v4";
  throw redirect(withEmbeddedSearch(dest, url.search));
};

export default function AppReadyRedirect() {
  return null;
}
