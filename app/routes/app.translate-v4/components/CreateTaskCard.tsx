import { useState } from "react";
import type { CSSProperties } from "react";
import { v4Colors, v4CardStyle } from "../v4Styles";
import {
  AI_MODEL_OPTIONS,
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

  return (
    <div style={{ ...v4CardStyle, borderRadius: 20, padding: "24px 26px", boxShadow: "0 10px 30px rgba(27,24,48,0.05)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em", color: v4Colors.text }}>
          新建翻译任务
        </h2>
      </div>

      {/* 源语言 → 目标语言 */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            background: "#f6f5fc",
            border: "1px solid #e7e6f3",
            borderRadius: 11,
            padding: "9px 13px",
            fontWeight: 700,
            fontSize: 13.5,
          }}
        >
          <span style={{ fontSize: 11, opacity: 0.7, fontWeight: 700 }}>{localeRegionCode(source)}</span>
          {localeShortName(source, sourceLabel)}
        </span>
        <span style={{ color: "#c2c2c8", fontSize: 18 }}>→</span>
        {targetOptions.map((opt) => {
          const selected = targets.includes(opt.value);
          return (
            <button key={opt.value} type="button" onClick={() => toggleTarget(opt.value)} style={targetChipStyle(selected)}>
              <span style={{ fontSize: 11, opacity: 0.7, fontWeight: 700 }}>{localeRegionCode(opt.value)}</span>
              {localeShortName(opt.value, opt.label)}
            </button>
          );
        })}
      </div>

      {/* 包含的内容 */}
      <div style={{ borderTop: "1px solid #f0efe9", paddingTop: 16, marginBottom: 18 }}>
        <SectionLabel>包含的内容</SectionLabel>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {CREATE_TASK_MODULE_OPTIONS.map((mod) => {
            const selected = modules.includes(mod);
            return (
              <button key={mod} type="button" onClick={() => toggleModule(mod)} style={moduleChipStyle(selected)}>
                <span style={{ fontSize: 14, lineHeight: 1 }}>{selected ? "✓" : "+"}</span>
                {CREATE_TASK_MODULE_LABELS[mod] ?? mod}
              </button>
            );
          })}
        </div>
      </div>

      {/* 高级设置 */}
      <div style={{ marginBottom: 18 }}>
        <button
          type="button"
          onClick={() => setAdvancedOpen((o) => !o)}
          style={{
            background: "none",
            border: "none",
            color: v4Colors.primary,
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            padding: 0,
            fontFamily: "inherit",
          }}
        >
          {advancedOpen ? "收起高级设置" : "高级设置"}
        </button>
        {advancedOpen ? (
          <div style={{ marginTop: 14 }}>
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
          borderTop: "1px solid #f0efe9",
        }}
      >
        <span style={{ fontSize: 13, color: v4Colors.textFaint, fontWeight: 600 }}>
          {targets.length} 种语言 · {modules.length} 个模块
        </span>
        <button
          type="button"
          disabled={!canCreate}
          onClick={onCreate}
          style={{
            background: canCreate ? v4Colors.primary : "#cfcde6",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            padding: "12px 24px",
            fontSize: 14.5,
            fontWeight: 700,
            fontFamily: "inherit",
            cursor: canCreate ? "pointer" : "not-allowed",
          }}
        >
          {creating ? "创建中…" : targets.length > 1 ? `创建 ${targets.length} 个任务 →` : "创建任务 →"}
        </button>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return <div style={{ fontSize: 11.5, fontWeight: 700, color: v4Colors.textMuted, marginBottom: 10 }}>{children}</div>;
}

const chipBase: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 12px",
  borderRadius: 10,
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
    border: `1.5px solid ${selected ? v4Colors.primary : "#e7e6e0"}`,
    background: selected ? v4Colors.primary : "#fff",
    color: selected ? "#fff" : v4Colors.textMuted,
  };
}
/** 模块：选中=深色描边浅底 + ✓。 */
function moduleChipStyle(selected: boolean): CSSProperties {
  return {
    ...chipBase,
    border: `1.5px solid ${selected ? v4Colors.text : "#e7e6e0"}`,
    background: selected ? "#fbfbfa" : "#fff",
    color: selected ? v4Colors.text : v4Colors.textFaint,
  };
}
/** AI 模型：选中=紫色浅底。 */
function aiChipStyle(selected: boolean): CSSProperties {
  return {
    ...chipBase,
    border: `1.5px solid ${selected ? v4Colors.primary : "#e7e6e0"}`,
    background: selected ? "#f1f0fb" : "#fff",
    color: selected ? v4Colors.primary : v4Colors.textMuted,
  };
}
/** 翻译选项：与模块同款。 */
function optionChipStyle(selected: boolean): CSSProperties {
  return moduleChipStyle(selected);
}
