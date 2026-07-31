import {
  json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { authenticate } from "~/shopify.server";
import {
  buildOnboardingSummary,
  getOnboardingState,
  markOnboardingCompleted,
  markOnboardingEntered,
  markOnboardingSkipped,
  markOnboardingTrialStarted,
  saveOnboardingRecommendation,
} from "~/server/onboarding/onboarding.server";
import { OnboardingFlow } from "./components/OnboardingFlow";

/**
 * GET /app/onboarding —— 首次翻译新手引导（方案 A：聚合 loader 一次性返回全部展示数据）。
 * 直接访问但已 skipped/completed 的用户仍返回数据（页面允许再次跳过/完成），
 * 入口重定向由 `/app` (app._index) 负责，此处不再二次拦截，避免嵌入式重定向问题。
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  // 进入即把 not_started 推进为 preparing（幂等），记录首次进入时间。
  const state =
    (await markOnboardingEntered(shop)) ?? (await getOnboardingState(shop));

  const summary = await buildOnboardingSummary({
    shop,
    accessToken: session.accessToken as string | undefined,
    state,
  });

  // 持久化推荐快照，供埋点/转化追踪（best-effort，失败不影响展示）。
  await saveOnboardingRecommendation(shop, {
    recommendedTargets: summary.locales.suggestedTargets,
    recommendedModules: summary.recommendation.suggestedModuleKeys,
    estimateCredits: summary.estimate?.credits ?? null,
    estimateMinutes: summary.estimate?.minutes ?? null,
    sourceScanId: summary.onboardingState?.sourceScanId ?? null,
  });

  return json({ summary });
};

type OnboardingIntent = "skip" | "complete" | "trial";

/**
 * POST /app/onboarding —— 引导状态流转（只写状态并返回 json，客户端负责跳转，
 * 避免嵌入式 App 内的服务端重定向问题）。
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "") as OnboardingIntent;

  switch (intent) {
    case "skip":
      await markOnboardingSkipped(shop);
      return json({ ok: true, intent });
    case "complete":
      await markOnboardingCompleted(shop, { createdFirstTask: true });
      return json({ ok: true, intent });
    case "trial":
      await markOnboardingTrialStarted(shop);
      return json({ ok: true, intent });
    default:
      return json({ ok: false, error: "unknown intent" }, { status: 400 });
  }
};

export default function OnboardingRoute() {
  const { summary } = useLoaderData<typeof loader>();
  return <OnboardingFlow summary={summary} />;
}
