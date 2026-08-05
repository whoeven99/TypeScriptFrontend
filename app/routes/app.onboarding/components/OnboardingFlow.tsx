import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useFetcher } from "@remix-run/react";
import { Page, BlockStack } from "@shopify/polaris";
import { useTranslation } from "react-i18next";
import { message } from "~/ui/message";
import { reportClientLog } from "~/utils/clientLog";
import { createTranslateV4Tasks } from "~/lib/createTranslateV4Tasks";
import { expandV2ModuleKeys } from "~/server/translateV4/moduleCatalog";
import { DEFAULT_AI_MODEL } from "~/routes/app.translate-v4/constants";
import type {
  OnboardingFastCoverageSnapshot,
  OnboardingSummary,
} from "../types";
import { PreparingStep, type PreparingPhase } from "./PreparingStep";
import { RecommendationStep } from "./RecommendationStep";
import { ActionFooter, type PrimaryCtaKind } from "./ActionFooter";

type Step = "preparing" | "recommendation";

function resolvePrimaryCta(summary: OnboardingSummary): PrimaryCtaKind {
  const hasTargets = summary.locales.suggestedTargets.length > 0;
  if (!hasTargets) return "configure";
  const needsMore =
    summary.estimate?.needsMoreCredits ??
    summary.bootstrap.remainingCredits <= 0;
  if (!needsMore) return "create";
  return summary.bootstrap.isNew === true ? "trial" : "upgrade";
}

export function OnboardingFlow({ summary }: { summary: OnboardingSummary }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fetcher = useFetcher();
  const [step, setStep] = useState<Step>("preparing");
  const [phase, setPhase] = useState<PreparingPhase>("boot");
  const [creating, setCreating] = useState(false);
  const [fastCoverage, setFastCoverage] =
    useState<OnboardingFastCoverageSnapshot | null>(null);
  const [coverageDone, setCoverageDone] = useState(0);
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const viewedRef = useRef(false);
  const prepareStartedRef = useRef(false);

  const primaryCta = useMemo(() => resolvePrimaryCta(summary), [summary]);
  const plan = summary.fastCoveragePlan;

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

  useEffect(() => {
    if (viewedRef.current) return;
    viewedRef.current = true;
    track("onboarding_viewed", { primaryCta });
  }, [track, primaryCta]);

  const goRecommendation = useCallback(
    (snapshot: OnboardingFastCoverageSnapshot | null) => {
      setPhase("done");
      setStep("recommendation");
      track("onboarding_preparing_completed", {
        fastCoverageComplete: snapshot?.complete ?? false,
        fastCoveragePercent: snapshot?.percent ?? null,
        locale: snapshot?.locale ?? plan?.locale ?? null,
      });
      track("onboarding_recommendation_viewed", {
        suggestedTargets: summary.locales.suggestedTargets,
        primaryCta,
      });
    },
    [track, plan?.locale, summary.locales.suggestedTargets, primaryCta],
  );

  // Preparing：loader 数据就绪 → 快扫 1 语 × 5 模块（真进度）→ 推荐页
  useEffect(() => {
    if (step !== "preparing" || prepareStartedRef.current) return;
    prepareStartedRef.current = true;

    let cancelled = false;

    void (async () => {
      setPhase("locales");
      // 让首屏勾选有一帧可见
      await new Promise((r) => window.setTimeout(r, 280));
      if (cancelled) return;

      if (!plan || plan.labels.length === 0) {
        setPhase("recommendation");
        await new Promise((r) => window.setTimeout(r, 200));
        if (!cancelled) goRecommendation(null);
        return;
      }

      setPhase("coverage");
      const doneLabels: Array<{
        label: string;
        translated: number;
        total: number;
      }> = [];
      let latest: OnboardingFastCoverageSnapshot | null = null;

      for (const label of plan.labels) {
        if (cancelled) return;
        setActiveLabel(label);
        try {
          const res = await fetch("/api/onboarding/fast-coverage", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              locale: plan.locale,
              localeLabel: plan.localeLabel,
              label,
              doneLabels,
            }),
          });
          const data = (await res.json().catch(() => null)) as {
            ok?: boolean;
            justDone?: { label: string; translated: number; total: number };
            snapshot?: OnboardingFastCoverageSnapshot;
          } | null;
          if (data?.ok && data.justDone) {
            doneLabels.push(data.justDone);
            if (data.snapshot) {
              latest = data.snapshot;
              setFastCoverage(data.snapshot);
            }
          }
        } catch (err) {
          console.warn("[onboarding] fast-coverage label failed:", label, err);
        }
        setCoverageDone(doneLabels.length);
      }

      if (cancelled) return;
      setActiveLabel(null);
      setPhase("recommendation");
      await new Promise((r) => window.setTimeout(r, 200));
      if (!cancelled) goRecommendation(latest);
    })();

    return () => {
      cancelled = true;
    };
  }, [step, plan, goRecommendation]);

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
  }, [
    primaryCta,
    handleCreateTask,
    handleTrialOrUpgrade,
    handleConfigureLanguages,
  ]);

  return (
    <Page narrowWidth title={t("onboarding.pageTitle")}>
      <BlockStack gap="500">
        {step === "preparing" ? (
          <PreparingStep
            summary={summary}
            phase={phase}
            coverageDone={coverageDone}
            coverageTotal={plan?.labels.length ?? 0}
            activeLabel={activeLabel}
            coverageLocaleLabel={plan?.localeLabel ?? null}
          />
        ) : (
          <>
            <RecommendationStep
              summary={summary}
              fastCoverage={fastCoverage}
            />
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
