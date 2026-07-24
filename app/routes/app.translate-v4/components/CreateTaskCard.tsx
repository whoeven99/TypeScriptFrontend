import { useMemo, useState, type ReactNode } from "react";
import type { CSSProperties } from "react";
import { BlockStack, Checkbox, Select } from "@shopify/polaris";
import { Link } from "@remix-run/react";
import { useTranslation } from "react-i18next";
import { v4Colors, v4CardStyle } from "../v4Styles";
import {
  AI_MODEL_OPTIONS,
  CREATE_TASK_MODULE_LABELS,
  CREATE_TASK_MODULE_OPTIONS,
} from "../constants";
import { localeRegionCode, localeShortName } from "../localeDisplay";
import type { ShopLocaleOption } from "~/lib/createTranslateV4Tasks";
import { formatExpandCredits } from "~/lib/expandMarket";
import { getV4AiModelLabel, getV4ModuleLabel } from "../v4I18n";
import Button from "~/ui/components/AppButton";
import {
  formatEstimateCredits,
  type CreateTaskEstimateView,
} from "../useCreateTaskEstimate";

export type { CreateTaskEstimateView };

type Props = {
  targetOptions: ShopLocaleOption[];
  targets: string[];
  onTargetsChange: (values: string[]) => void;
  modules: string[];
  onModulesChange: (values: string[]) => void;
  creating: boolean;
  onCreate: () => void;
  aiModel: string;
  onAiModelChange: (v: string) => void;
  isCover: boolean;
  onIsCoverChange: (v: boolean) => void;
  isHandle: boolean;
  onIsHandleChange: (v: boolean) => void;
  advancedDefaultOpen?: boolean;
  submitPlacement?: "header" | "footer-center";
  createDisabled?: boolean;
  disabledMessage?: string | null;
  /** 就绪带「补齐」等引导提示，可关。 */
  guideHint?: string | null;
  onDismissGuideHint?: () => void;
  estimate?: CreateTaskEstimateView | null;
};

type TargetOption = { value: string; label: string; regionCode: string };

export function CreateTaskCard({
  targetOptions,
  targets,
  onTargetsChange,
  modules,
  onModulesChange,
  creating,
  onCreate,
  aiModel,
  onAiModelChange,
  isCover,
  onIsCoverChange,
  isHandle,
  onIsHandleChange,
  advancedDefaultOpen = false,
  submitPlacement = "header",
  createDisabled = false,
  disabledMessage = null,
  guideHint = null,
  onDismissGuideHint,
  estimate = null,
}: Props) {
  const { t } = useTranslation();
  const canCreate =
    targets.length > 0 && modules.length > 0 && !creating && !createDisabled;
  const [advancedOpen, setAdvancedOpen] = useState(advancedDefaultOpen);

  // 顺序固定（按名称），避免点选时 chip 跳动。
  const localeChips = useMemo<TargetOption[]>(
    () =>
      [...targetOptions]
        .map((opt) => ({
          value: opt.value,
          label: localeShortName(opt.value, opt.label),
          regionCode: localeRegionCode(opt.value),
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [targetOptions],
  );

  const aiModelOptions = useMemo(
    () =>
      AI_MODEL_OPTIONS.map((option) => ({
        ...option,
        label: getV4AiModelLabel(option.value, t),
      })),
    [t],
  );

  // 翻译内容改为内联多选 chip：顺序固定（避免点选时跳动），选中态与上方语言同色。
  const moduleChips = CREATE_TASK_MODULE_OPTIONS.map((mod) => ({
    value: mod,
    label: getV4ModuleLabel(mod, t) || CREATE_TASK_MODULE_LABELS[mod] || mod,
  }));
  const allTargetValues = targetOptions.map((option) => option.value);
  const allModuleValues = moduleChips.map((mod) => mod.value);
  const productModuleValue =
    moduleChips.find((mod) => mod.value === "products")?.value ??
    moduleChips[0]?.value;
  const isFullScope =
    targets.length > 0 &&
    targets.length === allTargetValues.length &&
    modules.length === allModuleValues.length;

  const toggleTarget = (value: string) => {
    onTargetsChange(
      targets.includes(value)
        ? targets.filter((item) => item !== value)
        : [...targets, value],
    );
  };

  const toggleModule = (value: string) => {
    onModulesChange(
      modules.includes(value)
              display: "flex",
              flexDirection: "row",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "8px 12px",
              maxWidth: "100%",
              minWidth: 0,
            }}
          >
            <EstimateInline
              estimate={estimate}
              canEstimate={targets.length > 0 && modules.length > 0}
            />
            {submitButton}
          </div>
        ) : null}
      </div>

      {guideHint ? (
        <div
          style={{
            marginBottom: 14,
            padding: "10px 12px",
            borderRadius: 10,
            background: "var(--p-color-bg-surface-info)",
            border: "1px solid rgba(84, 103, 255, 0.18)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div
            style={{
              fontSize: 12,
              lineHeight: "18px",
              color: "var(--p-color-text-info)",
              flex: 1,
            }}
          >
            {guideHint}
          </div>
          {onDismissGuideHint ? (
            <button
              type="button"
              onClick={onDismissGuideHint}
              aria-label={t("v4.createTask.dismissGuide")}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: v4Colors.textMuted,
                padding: 0,
                lineHeight: 1,
                fontSize: 14,
              }}
            >
              ×
            </button>
          ) : null}
        </div>
      ) : null}

      <ScopeReview
        targetCount={targets.length}
        totalTargetCount={allTargetValues.length}
        moduleCount={modules.length}
        totalModuleCount={allModuleValues.length}
        isFullScope={isFullScope}
        canKeepOneLanguage={targets.length > 1}
        canProductsOnly={
          Boolean(productModuleValue) &&
          (modules.length !== 1 || modules[0] !== productModuleValue)
        }
        canSelectAll={!isFullScope && allTargetValues.length > 0 && allModuleValues.length > 0}
        onKeepOneLanguage={() => {
          const first = targets[0] ?? allTargetValues[0];
          if (first) onTargetsChange([first]);
        }}
        onProductsOnly={() => {
          if (productModuleValue) onModulesChange([productModuleValue]);
        }}
        onSelectAll={() => {
          onTargetsChange(allTargetValues);
          onModulesChange(allModuleValues);
        }}
      />
        </div>
        {submitPlacement === "header" ? (
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "8px 12px",
              maxWidth: "100%",
              minWidth: 0,
            }}
          >
            <EstimateInline
              estimate={estimate}
              canEstimate={targets.length > 0 && modules.length > 0}
            />
            {submitButton}
          </div>
        ) : null}
      </div>
      {guideHint ? (
        <div
          style={{
            marginBottom: 14,
            padding: "10px 12px",
            borderRadius: 10,
            background: "var(--p-color-bg-surface-info)",
            border: "1px solid rgba(84, 103, 255, 0.18)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div
            style={{
              fontSize: 12,
              lineHeight: "18px",
              color: "var(--p-color-text-info)",
              flex: 1,
            }}
          >
            {guideHint}
          </div>
          {onDismissGuideHint ? (
            <button
              type="button"
              onClick={onDismissGuideHint}
              aria-label={t("v4.createTask.dismissGuide")}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: v4Colors.textMuted,
                padding: 0,
                lineHeight: 1,
                fontSize: 14,
              }}
            >
              ×
            </button>
          ) : null}
        </div>
      ) : null}

      <ScopeReview
        targetCount={targets.length}
        totalTargetCount={allTargetValues.length}
        moduleCount={modules.length}
        totalModuleCount={allModuleValues.length}
        isFullScope={isFullScope}
        canKeepOneLanguage={targets.length > 1}
        canProductsOnly={
          Boolean(productModuleValue) &&
          (modules.length !== 1 || modules[0] !== productModuleValue)
        }
        canSelectAll={
          !isFullScope && allTargetValues.length > 0 && allModuleValues.length > 0
        }
        onKeepOneLanguage={() => {
          const first = targets[0] ?? allTargetValues[0];
          if (first) onTargetsChange([first]);
        }}
        onProductsOnly={() => {
          if (productModuleValue) onModulesChange([productModuleValue]);
        }}
        onSelectAll={() => {
          onTargetsChange(allTargetValues);
          onModulesChange(allModuleValues);
        }}
      />

      <div style={{ marginBottom: 16 }}>
        <SectionHeader title={t("v4.createTask.targetLanguages")} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {localeChips.map((locale) => {
            const selected = targets.includes(locale.value);
            return (
              <button
                key={locale.value}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleTarget(locale.value)}
                style={moduleChipStyle(selected)}
              >
                <span
                  style={{
                    opacity: selected ? 0.85 : 0.7,
                    marginRight: 5,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.02em",
                  }}
                >
                  {locale.regionCode}
                </span>
                {locale.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <SectionHeader title={t("v4.createTask.content")} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {moduleChips.map((mod) => {
            const selected = modules.includes(mod.value);
            return (
              <button
                key={mod.value}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleModule(mod.value)}
                style={moduleChipStyle(selected)}
              >
                {mod.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        style={{
          padding: advancedOpen ? "14px 14px 0" : "14px",
          borderRadius: 12,
          background: v4Colors.cardSubdued,
          border: `1px dashed ${v4Colors.cardBorder}`,
          transition: "padding 0.42s cubic-bezier(0.22, 0.61, 0.36, 1)",
        }}
      >
        <button
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
          aria-expanded={advancedOpen}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            gap: 8,
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: 13,
            fontWeight: 600,
            color: v4Colors.text,
            userSelect: "none",
          }}
        >
          <span style={{ minWidth: 0, textAlign: "left", lineHeight: 1.35, overflowWrap: "anywhere" }}>
            {t("v4.createTask.advancedSettings")}
          </span>
          <span
            className={`v4-caret${advancedOpen ? " v4-caret--open" : ""}`}
            aria-hidden
            style={{ flexShrink: 0 }}
          >
            ⌄
          </span>
        </button>

        <div
          className="v4-collapse"
          style={{
            maxHeight: advancedOpen ? 420 : 0,
            opacity: advancedOpen ? 1 : 0,
          }}
        >
          <div style={{ marginTop: 12 }}>
            <SectionLabel>{t("v4.createTask.aiModel")}</SectionLabel>
            <div style={{ marginBottom: 16 }}>
              <Select
                label={t("v4.createTask.aiModel")}
                labelHidden
                options={aiModelOptions}
                value={aiModel}
                onChange={onAiModelChange}
              />
            </div>
            <SectionLabel>{t("v4.createTask.translationOptions")}</SectionLabel>
            <BlockStack gap="300">
              <Checkbox
                label={t("v4.createTask.overwriteExisting")}
                checked={isCover}
                onChange={onIsCoverChange}
              />
              <Checkbox
                label={t("v4.createTask.translateHandle")}
                checked={isHandle}
                onChange={onIsHandleChange}
              />
            </BlockStack>
          </div>
        </div>
      </div>

      {submitPlacement === "footer-center" ? (
        <div
          style={{
            marginTop: 22,
            paddingTop: 18,
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px 12px",
          }}
        >
          <EstimateInline
            estimate={estimate}
            canEstimate={targets.length > 0 && modules.length > 0}
          />
          {submitButton}
        </div>
      ) : null}
    </div>
  );
}

function ScopeReview({
  targetCount,
  totalTargetCount,
  moduleCount,
  totalModuleCount,
  isFullScope,
  canKeepOneLanguage,
  canProductsOnly,
  canSelectAll,
  onKeepOneLanguage,
  onProductsOnly,
  onSelectAll,
}: {
  targetCount: number;
  totalTargetCount: number;
  moduleCount: number;
  totalModuleCount: number;
  isFullScope: boolean;
  canKeepOneLanguage: boolean;
  canProductsOnly: boolean;
  canSelectAll: boolean;
  onKeepOneLanguage: () => void;
  onProductsOnly: () => void;
  onSelectAll: () => void;
}) {
  const { t } = useTranslation();
  const hasSelection = targetCount > 0 && moduleCount > 0;
  if (!hasSelection) return null;

  return (
    <div
      style={{
        marginBottom: 16,
        padding: "10px 12px",
        borderRadius: 12,
        border: `1px solid ${
          isFullScope ? "rgba(245, 158, 11, 0.28)" : "rgba(84, 103, 255, 0.16)"
        }`,
        background: isFullScope
          ? "rgba(255, 247, 230, 0.72)"
          : "var(--p-color-bg-surface-secondary)",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "8px 12px",
      }}
    >
      <div style={{ minWidth: 220, flex: "1 1 320px" }}>
        <div
          style={{
            fontSize: 12,
            lineHeight: "18px",
            fontWeight: 700,
            color: v4Colors.text,
          }}
        >
          {t("v4.createTask.scopeTitle")}
        </div>
        <div
          style={{
            marginTop: 2,
            fontSize: 12,
            lineHeight: "18px",
            color: v4Colors.textMuted,
          }}
        >
          {isFullScope
            ? t("v4.createTask.scopeFullBody", {
                languages: targetCount,
                modules: moduleCount,
                tasks: targetCount,
              })
            : t("v4.createTask.scopeBody", {
                languages: targetCount,
                modules: moduleCount,
                tasks: targetCount,
              })}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
        }}
      >
        {canKeepOneLanguage ? (
          <ScopeQuickButton onClick={onKeepOneLanguage}>
            {t("v4.createTask.scopeKeepOneLanguage")}
          </ScopeQuickButton>
        ) : null}
        {canProductsOnly ? (
          <ScopeQuickButton onClick={onProductsOnly}>
            {t("v4.createTask.scopeProductsOnly")}
          </ScopeQuickButton>
        ) : null}
        {canSelectAll ? (
          <ScopeQuickButton onClick={onSelectAll}>
            {t("v4.createTask.scopeSelectAll", {
              languages: totalTargetCount,
              modules: totalModuleCount,
            })}
          </ScopeQuickButton>
        ) : null}
      </div>
    </div>
  );
}

function ScopeQuickButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: "1px solid var(--app-color-border-secondary)",
        background: "var(--p-color-bg-surface)",
        borderRadius: 999,
        padding: "5px 10px",
        cursor: "pointer",
        fontSize: 12,
        lineHeight: "16px",
        fontWeight: 650,
        color: "var(--p-color-text-link)",
      }}
    >
      {children}
    </button>
  );
}

/** 创建按钮旁的上限预估（无灰盒，避免顶栏臃肿）。 */
function EstimateInline({
  estimate,
  canEstimate,
}: {
  estimate: CreateTaskEstimateView | null;
  canEstimate: boolean;
}) {
  const { t } = useTranslation();

  if (!canEstimate) {
    return (
      <span style={estimateInlineMutedStyle}>
        {t("v4.createTask.estimateSelectFirst")}
      </span>
    );
  }

  if (!estimate || estimate.loading) {
    return (
      <span style={estimateInlineMutedStyle}>
        {t("v4.createTask.estimateLoading")}
      </span>
    );
  }

  if (estimate.estimatedCredits == null) {
    return (
      <span style={estimateInlineMutedStyle}>
        {t("v4.createTask.estimateUnavailable")}
      </span>
    );
  }
  const estimatedLabel = formatEstimateCredits(estimate.estimatedCredits);
  const remainingLabel = formatEstimateCredits(estimate.remainingCredits);
  const primary = estimate.isUpperBound
    ? t("v4.createTask.estimateUpperBound", { estimated: estimatedLabel })
    : t("v4.createTask.estimateNeed", { estimated: estimatedLabel });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 2,
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "baseline",
          justifyContent: "flex-end",
          gap: "4px 8px",
          fontSize: 13,
          fontWeight: 600,
          color: estimate.needsMoreCredits
            ? "var(--p-color-text-caution)"
            : v4Colors.text,
          lineHeight: 1.35,
        }}
      >
        <span>{primary}</span>
        <span style={{ fontWeight: 500, color: v4Colors.textMuted }}>
          {t("v4.createTask.estimateRemaining", { remaining: remainingLabel })}
        </span>
      </div>
      {estimate.needsMoreCredits ? (
        <div
          style={{
            fontSize: 11,
            color: "var(--p-color-text-caution)",
            textAlign: "right",
          }}
        >
          {t("v4.createTask.estimateShort")}{" "}
          <Link to="/app/pricing" style={{ fontWeight: 600 }}>
            {t("v4.createTask.estimateBuyCredits")}
          </Link>
        </div>
      ) : null}
    </div>
  );
}

const estimateInlineMutedStyle: CSSProperties = {
  fontSize: 12,
  color: v4Colors.textMuted,
  textAlign: "right",
  maxWidth: 220,
  lineHeight: 1.35,
};

function SectionHeader({
  title,
}: {
  title: string;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: v4Colors.text, lineHeight: 1.35, overflowWrap: "anywhere" }}>
        {title}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 600, color: v4Colors.textMuted, marginBottom: 8, lineHeight: 1.35, overflowWrap: "anywhere" }}>
      {children}
    </div>
  );
}

/** 内联多选 chip：选中 primary-soft，未选中中性灰；语言/模块共用。 */
function moduleChipStyle(selected: boolean): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 12px",
    borderRadius: 8,
    border: "1px solid transparent",
    background: selected ? v4Colors.primarySoft : v4Colors.cardSubdued,
    color: selected ? v4Colors.primaryHover : v4Colors.textMuted,
    fontSize: 13,
    fontWeight: 600,
    lineHeight: 1.35,
    whiteSpace: "normal",
    textAlign: "left",
    overflowWrap: "anywhere",
    cursor: "pointer",
    transition: "background 0.15s, color 0.15s",
    fontFamily: "inherit",
  };
}
