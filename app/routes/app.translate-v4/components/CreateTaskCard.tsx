import { useState } from "react";
import type { CSSProperties } from "react";
import { Button } from "antd";
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
  remainingCredits: number | null;
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
  remainingCredits,
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
    if (targets.includes(value)) {
      onTargetsChange(targets.filter((t) => t !== value));
    } else {
      onTargetsChange([...targets, value]);
    }
  };

  const toggleModule = (mod: string) => {
    if (modules.includes(mod)) {
      onModulesChange(modules.filter((m) => m !== mod));
    } else {
      onModulesChange([...modules, mod]);
    }
  };

  return (
    <div style={{ ...v4CardStyle, padding: "20px 22px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: v4Colors.text }}>
          新建翻译任务
        </h2>
        {remainingCredits != null ? (
          <span style={{ fontSize: 13, color: v4Colors.textMuted }}>
            剩余 {remainingCredits.toLocaleString()} 积分
          </span>
        ) : null}
      </div>

      <div style={{ marginTop: 20 }}>
        <SectionLabel>源语言</SectionLabel>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <span style={{ ...chipStyle(true), cursor: "default" }}>
            <span style={{ fontSize: 11, opacity: 0.75, fontWeight: 700 }}>
              {localeRegionCode(source)}
            </span>
            {localeShortName(source, sourceLabel)}
          </span>
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <SectionLabel>目标语言</SectionLabel>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {targetOptions.map((opt) => {
            const selected = targets.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleTarget(opt.value)}
                style={chipStyle(selected)}
              >
                <span style={{ fontSize: 11, opacity: 0.75, fontWeight: 700 }}>
                  {localeRegionCode(opt.value)}
                </span>
                {localeShortName(opt.value, opt.label)}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <SectionLabel>包含的内容</SectionLabel>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {CREATE_TASK_MODULE_OPTIONS.map((mod) => {
            const selected = modules.includes(mod);
            return (
              <button
                key={mod}
                type="button"
                onClick={() => toggleModule(mod)}
                style={chipStyle(selected)}
              >
                <span style={{ fontSize: 14, lineHeight: 1 }}>
                  {selected ? "✓" : "+"}
                </span>
                {CREATE_TASK_MODULE_LABELS[mod] ?? mod}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <button
          type="button"
          onClick={() => setAdvancedOpen((o) => !o)}
          style={{
            background: "none",
            border: "none",
            color: v4Colors.primary,
            fontSize: 13,
            cursor: "pointer",
            padding: 0,
          }}
        >
          {advancedOpen ? "收起高级设置" : "高级设置"}
        </button>
        {advancedOpen ? (
          <div style={{ marginTop: 14 }}>
            <SectionLabel>AI 模型</SectionLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {AI_MODEL_OPTIONS.map((opt) => {
                const selected = aiModel === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onAiModelChange(opt.value)}
                    style={chipStyle(selected)}
                  >
                    <span style={{ fontSize: 14, lineHeight: 1 }}>
                      {selected ? "✓" : "+"}
                    </span>
                    {opt.label}
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: 16 }}>
              <SectionLabel>翻译选项</SectionLabel>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => onIsCoverChange(!isCover)}
                  style={chipStyle(isCover)}
                >
                  <span style={{ fontSize: 14, lineHeight: 1 }}>
                    {isCover ? "✓" : "+"}
                  </span>
                  覆盖已有译文
                </button>
                <button
                  type="button"
                  onClick={() => onIsHandleChange(!isHandle)}
                  style={chipStyle(isHandle)}
                >
                  <span style={{ fontSize: 14, lineHeight: 1 }}>
                    {isHandle ? "✓" : "+"}
                  </span>
                  翻译 handle
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div
        style={{
          marginTop: 22,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span style={{ fontSize: 13, color: v4Colors.textMuted }}>
          {targets.length} 种语言 · {modules.length} 个模块
        </span>
        <Button
          type="primary"
          loading={creating}
          onClick={onCreate}
          style={{
            background: v4Colors.primary,
            borderColor: v4Colors.primary,
            borderRadius: 10,
            height: 40,
            paddingInline: 20,
            fontWeight: 600,
          }}
        >
          {targets.length > 1
            ? `创建 ${targets.length} 个任务 →`
            : "创建任务 →"}
        </Button>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{ fontSize: 12, color: v4Colors.textMuted, marginBottom: 8 }}>
      {children}
    </div>
  );
}

function chipStyle(selected: boolean): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 12px",
    borderRadius: 10,
    border: selected ? `1px solid ${v4Colors.primary}` : `1px solid #e2e8f0`,
    background: selected ? v4Colors.primarySoft : "#fff",
    color: selected ? v4Colors.primary : v4Colors.text,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s",
  };
}
