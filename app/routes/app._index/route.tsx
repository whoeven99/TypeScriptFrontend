import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { withEmbeddedSearch } from "~/utils/embeddedAction";
import { shouldRedirectToOnboarding } from "~/server/onboarding/onboarding.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const search = new URL(request.url).search;

  // 首次安装用户：满足条件时先进新手引导，否则维持默认进入翻译页。
  // 决策失败一律降级为默认流程，避免阻断入口。
  let toOnboarding = false;
  try {
    toOnboarding = await shouldRedirectToOnboarding(session.shop);
  } catch (err) {
    console.error("[app._index] onboarding gate failed:", err);
  }

  throw redirect(
    withEmbeddedSearch(
      toOnboarding ? "/app/onboarding" : "/app/translate-v4",
      search,
    ),
  );
};

export default function Index() {
  return null;
}
