import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Button } from "antd";
import { v4Colors, v4CardStyle } from "../v4Styles";
import {
  AI_MODEL_OPTIONS,
  DEFAULT_MODULE_KEYS,
  CREATE_TASK_MODULE_LABELS,
  CREATE_TASK_MODULE_OPTIONS,
} from "../constants";
import { localeRegionCode, localeShortName } from "../localeDisplay";
import type { ShopLocaleOption } from "~/lib/createTranslateV4Tasks";

type Props = {
  source: string;
  sourceLabel: string;
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
  source,
  sourceLabel,
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
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [targetsExpanded, setTargetsExpanded] = useState(false);
  const [modulesExpanded, setModulesExpanded] = useState(false);

  const toggleTarget = (value: string) => {
    onTargetsChange(
      targets.includes(value) ? targets.filter((t) => t !== value) : [...targets, value],
    );
  };
  const toggleModule = (mod: string) => {
    onModulesChange(
      modules.includes(mod) ? modules.filter((m) => m !== mod) : [...modules, mod],
    );
  };

  const canCreate = targets.length > 0 && modules.length > 0 && !creating;
  const visibleTargetLimit = 8;
  const visibleModuleLimit = 6;

  const sortedTargetOptions = useMemo(() => {
    return [...targetOptions].sort((a, b) => {
      const aSelected = targets.includes(a.value) ? 0 : 1;
      const bSelected = targets.includes(b.value) ? 0 : 1;
      if (aSelected !== bSelected) return aSelected - bSelected;
      return a.label.localeCompare(b.label);
    });
  }, [targetOptions, targets]);

  const visibleTargetOptions = targetsExpanded
    ? sortedTargetOptions
    : sortedTargetOptions.slice(0, visibleTargetLimit);
  const hiddenTargetCount = Math.max(sortedTargetOptions.length - visibleTargetOptions.length, 0);

  const sortedModules = useMemo(() => {
    return [...CREATE_TASK_MODULE_OPTIONS].sort((a, b) => {
      const aSelected = modules.includes(a) ? 0 : 1;
      const bSelected = modules.includes(b) ? 0 : 1;
      if (aSelected !== bSelected) return aSelected - bSelected;
      return (CREATE_TASK_MODULE_LABELS[a] ?? a).localeCompare(
        CREATE_TASK_MODULE_LABELS[b] ?? b,
      );
    });
  }, [modules]);

  const visibleModules = modulesExpanded
    ? sortedModules
    : sortedModules.slice(0, visibleModuleLimit);
  const hiddenModuleCount = Math.max(sortedModules.length - visibleModules.length, 0);

  const selectedModelLabel =
    AI_MODEL_OPTIONS.find((opt) => opt.value === aiModel)?.label ?? aiModel;
  const advancedSummary = [
    selectedModelLabel,
    isCover ? "覆盖已有译文" : "保留已有译文",
    isHandle ? "翻译 handle" : "不翻译 handle",
  ].join(" · ");

  const applyRecommendedModules = () => {
    onModulesChange(
      DEFAULT_MODULE_KEYS.filter((key) =>
        CREATE_TASK_MODULE_OPTIONS.includes(key),
      ),
    );
  };

  const clearModules = () => onModulesChange([]);

  return (
    <div style={{ ...v4CardStyle, padding: "16px" }}>
      <div style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em", color: v4Colors.text }}>
          新建翻译任务
        </h2>
      </div>

      <div style={{ marginBottom: 16 }}>
        <SectionHeader
          title="目标语言"
          extra={targets.length > 0 ? `已选 ${targets.length} 种` : undefined}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              background: v4Colors.cardSubdued,
              border: `1px solid ${v4Colors.cardBorder}`,
              borderRadius: 999,
              padding: "8px 12px",
              fontWeight: 600,
              fontSize: 13,
              color: v4Colors.text,
            }}
          >
            <span style={{ fontSize: 11, opacity: 0.7, fontWeight: 700 }}>{localeRegionCode(source)}</span>
            {localeShortName(source, sourceLabel)}
          </span>
          <span style={{ color: v4Colors.textFaint, fontSize: 14 }}>→</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {visibleTargetOptions.map((opt) => {
            const selected = targets.includes(opt.value);
            return (
              <button key={opt.value} type="button" onClick={() => toggleTarget(opt.value)} style={targetChipStyle(selected)}>
                <span style={{ fontSize: 11, opacity: 0.7, fontWeight: 700 }}>{localeRegionCode(opt.value)}</span>
                {localeShortName(opt.value, opt.label)}
              </button>
            );
          })}
        </div>
        {sortedTargetOptions.length > visibleTargetLimit ? (
          <div style={{ marginTop: 12 }}>
            <Button type="link" size="small" onClick={() => setTargetsExpanded((v) => !v)} style={linkButtonStyle}>
              {targetsExpanded ? "收起语言" : `展开更多语言（+${hiddenTargetCount}）`}
            </Button>
          </div>
        ) : null}
      </div>

      <div style={{ borderTop: `1px solid ${v4Colors.divider}`, paddingTop: 16, marginBottom: 16 }}>
        <SectionHeader
          title="翻译内容"
          extra={modules.length > 0 ? `已选 ${modules.length} 个模块` : undefined}
        />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <Button size="small" onClick={applyRecommendedModules}>
            恢复推荐
          </Button>
          <Button size="small" onClick={clearModules}>
            清空选择
          </Button>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {visibleModules.map((mod) => {
            const selected = modules.includes(mod);
            return (
              <button key={mod} type="button" onClick={() => toggleModule(mod)} style={moduleChipStyle(selected)}>
                <span style={{ fontSize: 14, lineHeight: 1 }}>{selected ? "✓" : "+"}</span>
                {CREATE_TASK_MODULE_LABELS[mod] ?? mod}
              </button>
            );
          })}
        </div>
        {sortedModules.length > visibleModuleLimit ? (
          <div style={{ marginTop: 12 }}>
            <Button type="link" size="small" onClick={() => setModulesExpanded((v) => !v)} style={linkButtonStyle}>
              {modulesExpanded ? "收起模块" : `展开更多模块（+${hiddenModuleCount}）`}
            </Button>
          </div>
        ) : null}
      </div>

      <div style={{ marginBottom: 16 }}>
        <SectionHeader title="高级设置" extra={advancedSummary} />
        <Button type="link" size="small" onClick={() => setAdvancedOpen((o) => !o)} style={linkButtonStyle}>
          {advancedOpen ? "收起高级设置" : "展开高级设置"}
        </Button>
        {advancedOpen ? (
          <div
            style={{
              marginTop: 12,
              padding: "12px 16px",
              borderRadius: 8,
              background: v4Colors.cardSubdued,
              border: `1px solid ${v4Colors.cardBorder}`,
            }}
          >
            <SectionLabel>AI 模型</SectionLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {AI_MODEL_OPTIONS.map((opt) => {
                const selected = aiModel === opt.value;
                return (
                  <button key={opt.value} type="button" onClick={() => onAiModelChange(opt.value)} style={aiChipStyle(selected)}>
                    <span style={{ fontSize: 14, lineHeight: 1 }}>{selected ? "✓" : "+"}</span>
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <SectionLabel>翻译选项</SectionLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <button type="button" onClick={() => onIsCoverChange(!isCover)} style={optionChipStyle(isCover)}>
                <span style={{ fontSize: 14, lineHeight: 1 }}>{isCover ? "✓" : "+"}</span>
                覆盖已有译文
              </button>
              <button type="button" onClick={() => onIsHandleChange(!isHandle)} style={optionChipStyle(isHandle)}>
                <span style={{ fontSize: 14, lineHeight: 1 }}>{isHandle ? "✓" : "+"}</span>
                翻译 handle
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* footer */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          paddingTop: 16,
          borderTop: `1px solid ${v4Colors.divider}`,
        }}
      >
        <span style={{ fontSize: 13, color: v4Colors.textFaint, fontWeight: 600 }}>
          {targets.length} 种语言 · {modules.length} 个模块
        </span>
        <Button type="primary" disabled={!canCreate} loading={creating} onClick={onCreate}>
          {creating ? "创建中…" : targets.length > 1 ? `创建 ${targets.length} 个任务 →` : "创建任务 →"}
        </Button>
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  extra,
}: {
  title: string;
  extra?: string;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: v4Colors.text }}>
        {title}
      </div>
      {extra ? (
        <div style={{ fontSize: 12, color: v4Colors.textMuted, whiteSpace: "nowrap" }}>
          {extra}
        </div>
      ) : null}
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return <div style={{ fontSize: 13, fontWeight: 600, color: v4Colors.textMuted, marginBottom: 8 }}>{children}</div>;
}

const linkButtonStyle: CSSProperties = {
  paddingInline: 0,
  height: "auto",
};

const chipBase: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 12px",
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 0.15s",
  fontFamily: "inherit",
};

/** 目标语言：选中=实心紫。 */
function targetChipStyle(selected: boolean): CSSProperties {
  return {
    ...chipBase,
    border: `1px solid ${selected ? v4Colors.primary : v4Colors.cardBorder}`,
    background: selected ? v4Colors.primarySoft : v4Colors.cardBg,
    color: selected ? v4Colors.primary : v4Colors.text,
  };
}
/** 模块：选中=深色描边浅底 + ✓。 */
function moduleChipStyle(selected: boolean): CSSProperties {
  return {
    ...chipBase,
    border: `1px solid ${selected ? v4Colors.text : v4Colors.cardBorder}`,
    background: selected ? v4Colors.cardSubdued : v4Colors.cardBg,
    color: selected ? v4Colors.text : v4Colors.textMuted,
  };
}
/** AI 模型：选中=紫色浅底。 */
function aiChipStyle(selected: boolean): CSSProperties {
  return {
    ...chipBase,
    border: `1px solid ${selected ? v4Colors.primary : v4Colors.cardBorder}`,
    background: selected ? v4Colors.primarySoft : v4Colors.cardBg,
    color: selected ? v4Colors.primary : v4Colors.textMuted,
  };
}
/** 翻译选项：与模块同款。 */
function optionChipStyle(selected: boolean): CSSProperties {
  return moduleChipStyle(selected);
}
