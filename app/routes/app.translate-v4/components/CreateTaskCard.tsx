import { useMemo } from "react";
import { Button, Checkbox, Select, Space } from "antd";
import { v4Colors, v4CardStyle } from "../v4Styles";
import {
  AI_MODEL_OPTIONS,
  CREATE_TASK_MODULE_LABELS,
  CREATE_TASK_MODULE_OPTIONS,
} from "../constants";
import { localeRegionCode, localeShortName } from "../localeDisplay";
import type { ShopLocaleOption } from "~/lib/createTranslateV4Tasks";

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
  const canCreate = targets.length > 0 && modules.length > 0 && !creating;

  const sortedTargetOptions = useMemo(() => {
    return [...targetOptions].sort((a, b) => {
      const aSelected = targets.includes(a.value) ? 0 : 1;
      const bSelected = targets.includes(b.value) ? 0 : 1;
      if (aSelected !== bSelected) return aSelected - bSelected;
      return a.label.localeCompare(b.label);
    });
  }, [targetOptions, targets]);

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

  const targetSelectOptions = sortedTargetOptions.map((opt) => ({
    value: opt.value,
    label: `${localeShortName(opt.value, opt.label)} (${localeRegionCode(opt.value)})`,
  }));

  const moduleSelectOptions = sortedModules.map((mod) => ({
    value: mod,
    label: CREATE_TASK_MODULE_LABELS[mod] ?? mod,
  }));

  return (
    <div style={{ ...v4CardStyle, padding: "18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em", color: v4Colors.text }}>
            新建翻译任务
          </h2>
        </div>
        <Button type="primary" disabled={!canCreate} loading={creating} onClick={onCreate}>
          {creating ? "创建中…" : targets.length > 1 ? `创建 ${targets.length} 个任务` : "创建任务"}
        </Button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <SectionHeader title="目标语言" />
        <Select
          mode="multiple"
          placeholder="选择目标语言"
          value={targets}
          onChange={onTargetsChange}
          options={targetSelectOptions}
          maxTagCount="responsive"
          style={{ width: "100%" }}
          optionFilterProp="label"
        />
      </div>

      <div style={{ borderTop: `1px solid ${v4Colors.divider}`, paddingTop: 16, marginBottom: 16 }}>
        <SectionHeader title="翻译内容" />
        <Select
          mode="multiple"
          placeholder="选择翻译内容模块"
          value={modules}
          onChange={onModulesChange}
          options={moduleSelectOptions}
          maxTagCount="responsive"
          style={{ width: "100%" }}
          optionFilterProp="label"
        />
      </div>

      <div
        style={{
          padding: "14px 14px 0",
          borderRadius: 12,
          background: "rgba(84, 103, 255, 0.04)",
          border: `1px dashed ${v4Colors.cardBorder}`,
        }}
      >
        <SectionHeader title="高级设置" />
        <div style={{ marginTop: 4 }}>
          <SectionLabel>AI 模型</SectionLabel>
          <Select
            value={aiModel}
            onChange={onAiModelChange}
            options={AI_MODEL_OPTIONS}
            style={{ width: "100%", marginBottom: 16 }}
          />
          <SectionLabel>翻译选项</SectionLabel>
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
              <Checkbox value="cover">覆盖已有译文</Checkbox>
              <Checkbox value="handle">翻译 handle</Checkbox>
            </Space>
          </Checkbox.Group>
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
      <div style={{ fontSize: 13, fontWeight: 600, color: v4Colors.text }}>
        {title}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return <div style={{ fontSize: 13, fontWeight: 600, color: v4Colors.textMuted, marginBottom: 8 }}>{children}</div>;
}
