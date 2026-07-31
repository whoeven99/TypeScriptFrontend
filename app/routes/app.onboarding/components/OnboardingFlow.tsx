import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useFetcher } from "@remix-run/react";
import { Page, BlockStack } from "@shopify/polaris";
import { useTranslation } from "react-i18next";
import { message } from "~/ui/message";
import { reportClientLog } from "~/utils/clientLog";
import { createTranslateV4Tasks } from "~/lib/createTranslateV4Tasks";
import { expandV2ModuleKeys } from "~/server/translateV4/moduleCatalog";
import { DEFAULT_AI_MODEL } from "~/routes/app.translate-v4/constants";
import type { OnboardingSummary } from "../types";
import { PreparingStep } from "./PreparingStep";
import { RecommendationStep } from "./RecommendationStep";
import { ActionFooter, type PrimaryCtaKind } from "./ActionFooter";

type Step = "preparing" | "recommendation";

/** Preparing 页最短停留（方案 8.1：1.5~2.5s 的仪式感，不拖慢开始）。 */
const PREPARING_MIN_MS = 2200;

function resolvePrimaryCta(summary: OnboardingSummary): PrimaryCtaKind {
  const hasTargets = summary.locales.suggestedTargets.length > 0;
  if (!hasTargets) return "configure";
  const needsMore =
    summary.estimate?.needsMoreCredits ??
    summary.bootstrap.remainingCredits <= 0;
  if (!needsMore) return "create";
  // 有试用资格（从未激活过订阅）→ 开启试用；否则升级订阅。
  return summary.bootstrap.isNew === true ? "trial" : "upgrade";
}

export function OnboardingFlow({ summary }: { summary: OnboardingSummary }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fetcher = useFetcher();
  const [step, setStep] = useState<Step>("preparing");
  const [creating, setCreating] = useState(false);
  const viewedRef = useRef(false);

  const primaryCta = useMemo(() => resolvePrimaryCta(summary), [summary]);

  const track = useCallback(
    (event: string, context?: Record<string, unknown>) => {
      void reportClientLog(
        {
          event,
          kind: "action",
          level: "info",
          status: "success",
          shop: summary.shop,
          route: "/app/onboarding",
          context,
        },
        { beacon: true },
      );
    },
    [summary.shop],
  );

  // onboarding_viewed（仅一次）
  useEffect(() => {
    if (viewedRef.current) return;
    viewedRef.current = true;
    track("onboarding_viewed", { primaryCta });
  }, [track, primaryCta]);

  // Preparing → Recommendation 自动推进
  useEffect(() => {
    if (step !== "preparing") return;
    const timer = window.setTimeout(() => {
      setStep("recommendation");
      track("onboarding_preparing_completed");
      track("onboarding_recommendation_viewed", {
        suggestedTargets: summary.locales.suggestedTargets,
        primaryCta,
      });
    }, PREPARING_MIN_MS);
    return () => window.clearTimeout(timer);
  }, [step, track, summary.locales.suggestedTargets, primaryCta]);

  const postIntent = useCallback(
    (intent: "skip" | "complete" | "trial") => {
      fetcher.submit({ intent }, { method: "POST" });
    },
    [fetcher],
  );

  const handleSkip = useCallback(() => {
    track("onboarding_skipped");
    postIntent("skip");
    navigate("/app/translate-v4");
  }, [track, postIntent, navigate]);

  const handleCustomize = useCallback(() => {
    track("onboarding_customize_clicked");
    navigate("/app/translate-v4");
  }, [track, navigate]);

  const handleConfigureLanguages = useCallback(() => {
    track("onboarding_configure_languages");
    navigate("/app/language");
  }, [track, navigate]);

  const handleTrialOrUpgrade = useCallback(() => {
    track(
      primaryCta === "trial"
        ? "onboarding_trial_clicked"
        : "onboarding_upgrade_clicked",
    );
    postIntent("trial");
    navigate("/app/pricing");
  }, [track, primaryCta, postIntent, navigate]);

  const handleCreateTask = useCallback(async () => {
    if (creating) return;
    setCreating(true);
    try {
      const targetOptions = summary.locales.availableTargets.map((tgt) => ({
        value: tgt.value,
        label: tgt.label,
      }));
      const result = await createTranslateV4Tasks({
        source: summary.locales.source,
        targets: summary.locales.suggestedTargets,
        modules: expandV2ModuleKeys(summary.recommendation.suggestedModuleKeys),
        aiModel: DEFAULT_AI_MODEL,
        isCover: false,
        isHandle: false,
        targetOptions,
        shop: summary.shop,
      });

      if (result.validationError) {
        message.warning(t("onboarding.action.createInvalid"));
        setCreating(false);
        return;
      }
      if (result.created.length === 0) {
        message.error(t("onboarding.action.createFailed"));
        setCreating(false);
        return;
      }

      track("onboarding_task_created", {
        created: result.created.length,
        failed: result.failed.length,
      });
      message.success(t("onboarding.action.createSuccess"));
      postIntent("complete");
      navigate("/app/translate-v4");
    } catch (err) {
      console.error("[onboarding] create task failed:", err);
      message.error(t("onboarding.action.createFailed"));
      setCreating(false);
    }
  }, [creating, summary, t, track, postIntent, navigate]);

  const handlePrimary = useCallback(() => {
    switch (primaryCta) {
      case "create":
        void handleCreateTask();
        return;
      case "trial":
      case "upgrade":
        handleTrialOrUpgrade();
        return;
      case "configure":
        handleConfigureLanguages();
        return;
      default:
        return;
    }
  }, [primaryCta, handleCreateTask, handleTrialOrUpgrade, handleConfigureLanguages]);

  return (
    <Page narrowWidth title={t("onboarding.pageTitle")}>
      <BlockStack gap="500">
        {step === "preparing" ? (
          <PreparingStep summary={summary} />
        ) : (
          <>
            <RecommendationStep summary={summary} />
            <ActionFooter
              primaryCta={primaryCta}
              creating={creating}
              onPrimary={handlePrimary}
              onCustomize={handleCustomize}
              onSkip={handleSkip}
            />
          </>
        )}
      </BlockStack>
    </Page>
  );
}
