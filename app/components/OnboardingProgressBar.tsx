import { useNavigate } from "@remix-run/react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import {
  deriveOnboardingProgress,
  markOnboardingPreviewClicked,
  onboardingStepHref,
  readOnboardingPreviewClicked,
  type OnboardingProgress,
  type OnboardingStepId,
  type OnboardingStepUiState,
} from "~/lib/onboardingProgress";
import { message } from "~/ui/message";

type Props = {
  shop: string;
  /** loader 返回的服务端进度（previewClicked 由客户端 localStorage 合并）。 */
  initial: OnboardingProgress | null;
  /** 页内当前选中语言变化时重算起步/auto 锚定（可选）。 */
  locale?: string | null;
  /** 页内实时信号覆盖（如刚开 auto、刚完成 save）。 */
  overrides?: Partial<{
    trialSaved: boolean;
    starterOk: boolean;
    subscribed: boolean;
    autoOn: boolean;
    preferStarter: boolean;
  }>;
};

const STEP_I18N: Record<OnboardingStepId, string> = {
  trial: "onboarding.step.trial",
  starter: "onboarding.step.starter",
  subscribe: "onboarding.step.subscribe",
};

function useMergedProgress(
  shop: string,
  initial: OnboardingProgress | null,
  locale: string | null | undefined,
  overrides: Props["overrides"],
): OnboardingProgress | null {
  const anchorLocale = locale ?? initial?.locale ?? null;
  const [previewClicked, setPreviewClicked] = useState(false);
  const [previewTick, setPreviewTick] = useState(0);

  useEffect(() => {
    setPreviewClicked(readOnboardingPreviewClicked(shop, anchorLocale));
  }, [shop, anchorLocale, previewTick]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onMark = () => setPreviewTick((n) => n + 1);
    window.addEventListener("ciwi:onboarding-preview", onMark);
    return () => window.removeEventListener("ciwi:onboarding-preview", onMark);
  }, []);

  return useMemo(() => {
    if (!initial) return null;
    return deriveOnboardingProgress({
      isNew: initial.isNew,
      locale: anchorLocale,
      trialSaved: overrides?.trialSaved ?? initial.trialSaved,
      starterOk: overrides?.starterOk ?? initial.starterOk,
      subscribed: overrides?.subscribed ?? initial.subscribed,
      autoOn: overrides?.autoOn ?? initial.autoOn,
      // 店面验收仅 localStorage（不落库）。
      previewClicked: initial.previewClicked || previewClicked,
      preferStarter: overrides?.preferStarter ?? initial.preferStarter,
    });
  }, [initial, anchorLocale, overrides, previewClicked]);
}

/**
 * 供试译/开拓验收 CTA 调用：localStorage 标记 + 通知进度条刷新。
 */
export function notifyOnboardingPreviewMarked(
  shop: string,
  locale: string | null,
): void {
  markOnboardingPreviewClicked(shop, locale);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("ciwi:onboarding-preview"));
  }
}

function CompactBar({
  progress,
  onStepActivate,
}: {
  progress: OnboardingProgress;
  onStepActivate: (id: OnboardingStepId, state: OnboardingStepUiState) => void;
}) {
  const { t } = useTranslation();
  const doneCount = progress.steps.filter((s) => s.state === "done").length;

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 10,
        padding: "8px 12px",
        borderRadius: 8,
        border: "1px solid var(--app-color-border-secondary)",
        background: "var(--p-color-bg-surface)",
      }}
    >
      <span
        style={{
          fontSize: 13,
          fontWeight: 650,
          color: "var(--app-color-text)",
        }}
      >
        {t("onboarding.progressCompact", { done: doneCount, total: 3 })}
      </span>
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        {progress.steps.map((step) => (
          <button
            key={step.id}
            type="button"
            title={t(STEP_I18N[step.id])}
            onClick={() => onStepActivate(step.id, step.state)}
            style={{
              width: 28,
              height: 6,
              padding: 0,
              border: "none",
              borderRadius: 2,
              cursor: step.state === "todo" ? "default" : "pointer",
              background:
                step.state === "done"
                  ? "var(--p-color-bg-fill-brand)"
                  : step.state === "current"
                    ? "var(--p-color-bg-fill-info)"
                    : "var(--p-color-bg-surface-secondary)",
            }}
          />
        ))}
      </div>
      <span
        style={{
          fontSize: 12,
          color: "var(--app-color-text-secondary)",
        }}
      >
        {t("onboarding.progressCurrent", {
          step: t(STEP_I18N[progress.currentStep]),
        })}
      </span>
    </div>
  );
}

function FullBar({
  progress,
  onStepActivate,
}: {
  progress: OnboardingProgress;
  onStepActivate: (id: OnboardingStepId, state: OnboardingStepUiState) => void;
}) {
  const { t } = useTranslation();

  return (
    <div
      role="navigation"
      aria-label={t("onboarding.progressAria")}
      style={{
        display: "flex",
        width: "100%",
        borderRadius: 8,
        border: "1px solid var(--app-color-border-secondary)",
        overflow: "hidden",
        background: "var(--p-color-bg-surface)",
      }}
    >
      {progress.steps.map((step, index) => {
        const st = step.state;
        const cellStyle: CSSProperties = {
          flex: 1,
          minWidth: 0,
          position: "relative",
          padding: "10px 12px 10px 14px",
          borderLeft:
            index === 0
              ? undefined
              : "1px solid var(--app-color-border-secondary)",
          background:
            st === "current"
              ? "var(--p-color-bg-surface-secondary)"
              : st === "done"
                ? "var(--p-color-bg-surface-secondary)"
                : "var(--p-color-bg-surface)",
          cursor: st === "todo" ? "default" : "pointer",
          textAlign: "left",
          borderTop: "none",
          borderRight: "none",
          borderBottom: "none",
        };
        return (
          <button
            key={step.id}
            type="button"
            onClick={() => onStepActivate(step.id, st)}
            style={cellStyle}
          >
            <span
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: 3,
                background:
                  st === "current"
                    ? "var(--p-color-bg-fill-brand)"
                    : st === "done"
                      ? "var(--p-color-border-secondary)"
                      : "transparent",
              }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                fontWeight: 650,
                color:
                  st === "todo"
                    ? "var(--app-color-text-tertiary)"
                    : "var(--app-color-text)",
              }}
            >
              <span style={{ fontVariantNumeric: "tabular-nums" }}>
                {st === "done" ? "✓" : String(index + 1)}
              </span>
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {t(STEP_I18N[step.id])}
              </span>
            </div>
            <div
              style={{
                marginTop: 2,
                fontSize: 12,
                color: "var(--app-color-text-tertiary)",
              }}
            >
              {st === "done"
                ? t("onboarding.stepState.done")
                : st === "current"
                  ? t("onboarding.stepState.current")
                  : t("onboarding.stepState.todo")}
            </div>
          </button>
        );
      })}
    </div>
  );
}

/**
 * 新手漏斗顶栏进度条。挂在试译 / 开拓市场页顶。
 * 漏斗完成后显示紧凑条；visible=false 时不渲染。
 */
export function OnboardingProgressBar({
  shop,
  initial,
  locale,
  overrides,
}: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [narrow, setNarrow] = useState(false);
  const progress = useMergedProgress(shop, initial, locale, overrides);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 720px)");
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  if (!progress?.visible) return null;

  const onStepActivate = (
    id: OnboardingStepId,
    state: OnboardingStepUiState,
  ) => {
    const href = onboardingStepHref(id, state, progress.locale);
    if (!href) {
      message.info(t("onboarding.stepLocked"));
      return;
    }
    navigate(href);
  };

  if (narrow) {
    return (
      <CompactBar progress={progress} onStepActivate={onStepActivate} />
    );
  }

  return <FullBar progress={progress} onStepActivate={onStepActivate} />;
}
