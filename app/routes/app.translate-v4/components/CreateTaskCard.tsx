import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { CustomTagProps } from "rc-select/lib/BaseSelect";
import { Button, Checkbox, Select, Space } from "antd";
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
}: Props) {
  const { t } = useTranslation();
  const canCreate = targets.length > 0 && modules.length > 0 && !creating;
  // 高级设置默认收起，点击展开
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const sortedTargetOptions = useMemo(() => {
    return [...targetOptions].sort((a, b) => {
      const aSelected = targets.includes(a.value) ? 0 : 1;
      const bSelected = targets.includes(b.value) ? 0 : 1;
      if (aSelected !== bSelected) return aSelected - bSelected;
      return a.label.localeCompare(b.label);
    });
  }, [targetOptions, targets]);

  const targetSelectOptions = sortedTargetOptions.map((opt) => ({
    value: opt.value,
    label: localeShortName(opt.value, opt.label),
    regionCode: localeRegionCode(opt.value),
  }));

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

  const toggleModule = (value: string) => {
    onModulesChange(
      modules.includes(value)
        ? modules.filter((m) => m !== value)
        : [...modules, value],
    );
  };

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
        </div>
        <Button
          type="primary"
          className="v4-create-task-card__submit"
          disabled={!canCreate}
          loading={creating}
          onClick={onCreate}
          style={{
            maxWidth: "100%",
            height: "auto",
            minHeight: 32,
            whiteSpace: "normal",
            textAlign: "center",
            lineHeight: 1.35,
            paddingBlock: 6,
          }}
        >
          {creating
            ? t("v4.createTask.creating")
            : targets.length > 1
              ? t("v4.createTask.createMultiple", { count: targets.length })
              : t("v4.createTask.createOne")}
        </Button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <SectionHeader title={t("v4.createTask.targetLanguages")} />
        <Select
          mode="multiple"
          placeholder={t("v4.createTask.selectTargetLanguages")}
          value={targets}
          onChange={onTargetsChange}
          options={targetSelectOptions}
          maxTagCount="responsive"
          style={{ width: "100%" }}
          optionFilterProp="label"
          tagRender={(props) => renderLocaleTag(props, targetSelectOptions, t)}
          optionRender={(option) => (
            <span>
              <span style={{ color: v4Colors.primary, fontWeight: 600, marginRight: 6 }}>
                {option.data.regionCode}
              </span>
              {option.label}
            </span>
          )}
        />
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

        <div
          className="v4-collapse"
          style={{
            maxHeight: advancedOpen ? 420 : 0,
            opacity: advancedOpen ? 1 : 0,
          }}
        >
          <div style={{ marginTop: 12 }}>
            <SectionLabel>{t("v4.createTask.aiModel")}</SectionLabel>
            <Select
              value={aiModel}
              onChange={onAiModelChange}
              options={aiModelOptions}
              style={{ width: "100%", marginBottom: 16 }}
            />
            <SectionLabel>{t("v4.createTask.translationOptions")}</SectionLabel>
            <Checkbox.Group
              value={[
                ...(isCover ? ["cover"] : []),
                ...(isHandle ? ["handle"] : []),
              ]}
              onChange={(values) => {
                onIsCoverChange(values.includes("cover"));
                onIsHandleChange(values.includes("handle"));
              }}
              style={{ width: "100%" }}
            >
              <Space direction="vertical" size={10}>
                <Checkbox value="cover">{t("v4.createTask.overwriteExisting")}</Checkbox>
                <Checkbox value="handle">{t("v4.createTask.translateHandle")}</Checkbox>
              </Space>
            </Checkbox.Group>
          </div>
        </div>
      </div>
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

type TargetOption = { value: string; label: string; regionCode: string };

function renderLocaleTag(
  props: CustomTagProps,
  options: TargetOption[],
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  const { label, value, closable, onClose } = props;
  const opt = options.find((item) => item.value === value);
  const code = opt?.regionCode ?? localeRegionCode(String(value));
  const name = typeof label === "string" ? label : opt?.label ?? String(value);

  return (
    <span className="v4-select-tag v4-select-tag--locale" style={{ display: "inline-flex", alignItems: "center", maxWidth: "100%", minWidth: 0 }}>
      <span className="v4-select-tag__code">{code}</span>
      <span style={{ minWidth: 0, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {name}
      </span>
      {closable ? (
        <button
          type="button"
          className="v4-select-tag__close"
          onClick={onClose}
          aria-label={t("v4.createTask.removeTarget", { name })}
        >
          ×
        </button>
      ) : null}
    </span>
  );
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
