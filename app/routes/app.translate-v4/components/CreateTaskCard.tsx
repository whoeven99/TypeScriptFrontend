import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { v4Colors, v4CardStyle } from "../v4Styles";
import {
  AI_MODEL_OPTIONS,
  CREATE_TASK_MODULE_LABELS,
  CREATE_TASK_MODULE_OPTIONS,
} from "../constants";
import { localeRegionCode, localeShortName } from "../localeDisplay";
import type { ShopLocaleOption } from "~/lib/createTranslateV4Tasks";
import { getV4AiModelLabel, getV4ModuleLabel } from "../v4I18n";
import Button from "~/ui/components/AppButton";

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
};

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
}: Props) {
  const { t } = useTranslation();
  const canCreate =
    targets.length > 0 && modules.length > 0 && !creating && !createDisabled;
  const [advancedOpen, setAdvancedOpen] = useState(advancedDefaultOpen);
  const [localeQuery, setLocaleQuery] = useState("");

  const sortedTargetOptions = useMemo(() => {
    return [...targetOptions].sort((a, b) => {
      const aSelected = targets.includes(a.value) ? 0 : 1;
      const bSelected = targets.includes(b.value) ? 0 : 1;
      if (aSelected !== bSelected) return aSelected - bSelected;
      return a.label.localeCompare(b.label);
    });
  }, [targetOptions, targets]);

  const filteredTargetOptions = useMemo(() => {
    const q = localeQuery.trim().toLowerCase();
    if (!q) return sortedTargetOptions;
    return sortedTargetOptions.filter((opt) => {
      const label = localeShortName(opt.value, opt.label).toLowerCase();
      const code = localeRegionCode(opt.value).toLowerCase();
      return (
        label.includes(q) ||
        code.includes(q) ||
        opt.value.toLowerCase().includes(q)
      );
    });
  }, [sortedTargetOptions, localeQuery]);

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
        ? modules.filter((m) => m !== value)
        : [...modules, value],
    );
  };

  const submitButton = (
    <Button
      type="primary"
      className="v4-create-task-card__submit"
      disabled={!canCreate}
      loading={creating}
      onClick={onCreate}
      style={{
        maxWidth: "100%",
        minWidth: submitPlacement === "footer-center" ? 220 : undefined,
        height: "auto",
        minHeight: 36,
        whiteSpace: "normal",
        textAlign: "center",
        lineHeight: 1.35,
        paddingBlock: 8,
        paddingInline: 24,
      }}
    >
      {creating
        ? t("v4.createTask.creating")
        : targets.length > 1
          ? t("v4.createTask.createMultiple", { count: targets.length })
          : t("v4.createTask.createOne")}
    </Button>
  );

  return (
    <div
      className="v4-create-task-card v4-lift"
      style={{
        ...v4CardStyle,
        borderRadius: 18,
        padding: "20px 22px",
        boxShadow: "var(--app-shadow-card-strong)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          marginBottom: 18,
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <h2
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: "-0.01em",
              color: v4Colors.text,
              lineHeight: 1.4,
              overflowWrap: "anywhere",
            }}
          >
            {t("v4.createTask.title")}
          </h2>
          {disabledMessage ? (
            <div
              style={{
                marginTop: 6,
                fontSize: 12,
                lineHeight: 1.5,
                color: v4Colors.textMuted,
              }}
            >
              {disabledMessage}
            </div>
          ) : null}
        </div>
        {submitPlacement === "header" ? submitButton : null}
      </div>

      <div style={{ marginBottom: 16 }}>
        <SectionHeader title={t("v4.createTask.targetLanguages")} />
        <input
          className="v4-locale-search"
          type="search"
          value={localeQuery}
          onChange={(event) => setLocaleQuery(event.target.value)}
          placeholder={t("v4.createTask.selectTargetLanguages")}
          aria-label={t("v4.createTask.selectTargetLanguages")}
        />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
          {filteredTargetOptions.length === 0 ? (
            <span style={{ fontSize: 13, color: v4Colors.textMuted }}>
              {t("v4.createTask.noMatchingLocales")}
            </span>
          ) : (
            filteredTargetOptions.map((opt) => {
              const selected = targets.includes(opt.value);
              const code = localeRegionCode(opt.value);
              const name = localeShortName(opt.value, opt.label);
              return (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleTarget(opt.value)}
                  style={localeChipStyle(selected)}
                >
                  <span style={{ opacity: 0.85, fontSize: 11, fontWeight: 700 }}>
                    {code}
                  </span>
                  <span>{name}</span>
                </button>
              );
            })
          )}
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
          <span className={`v4-caret${advancedOpen ? " v4-caret--open" : ""}`} aria-hidden style={{ flexShrink: 0 }}>
            ⌄
          </span>
        </button>

        {advancedOpen ? (
          <div className="v4-advanced-panel" style={{ marginTop: 12, paddingBottom: 14 }}>
            <SectionLabel>{t("v4.createTask.aiModel")}</SectionLabel>
            <select
              className="v4-ai-model-native-select"
              value={aiModel}
              onChange={(event) => onAiModelChange(event.target.value)}
              aria-label={t("v4.createTask.aiModel")}
            >
              {aiModelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <SectionLabel>{t("v4.createTask.translationOptions")}</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <label className="v4-native-check">
                <input
                  type="checkbox"
                  checked={isCover}
                  onChange={(event) => onIsCoverChange(event.target.checked)}
                />
                <span>{t("v4.createTask.overwriteExisting")}</span>
              </label>
              <label className="v4-native-check">
                <input
                  type="checkbox"
                  checked={isHandle}
                  onChange={(event) => onIsHandleChange(event.target.checked)}
                />
                <span>{t("v4.createTask.translateHandle")}</span>
              </label>
            </div>
          </div>
        ) : null}
      </div>

      {submitPlacement === "footer-center" ? (
        <div
          style={{
            marginTop: 22,
            paddingTop: 18,
            display: "flex",
            justifyContent: "center",
          }}
        >
          {submitButton}
        </div>
      ) : null}
    </div>
  );
}

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

function localeChipStyle(selected: boolean): CSSProperties {
  return {
    ...moduleChipStyle(selected),
    gap: 6,
  };
}

/** 翻译内容 chip 样式：选中态与目标语言标签同色（primary-soft / primary-hover），未选中为中性灰。 */
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
