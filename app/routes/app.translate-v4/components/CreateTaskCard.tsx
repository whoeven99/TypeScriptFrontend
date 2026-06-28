import { useMemo } from "react";
import { Button, Checkbox, Select, Space } from "antd";
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

  const selectAllTargets = () => onTargetsChange(targetOptions.map((opt) => opt.value));
  const clearModules = () => onModulesChange([]);
  const clearTargets = () => onTargetsChange([]);
  const selectAllModules = () => onModulesChange([...CREATE_TASK_MODULE_OPTIONS]);

  const targetSelectOptions = sortedTargetOptions.map((opt) => ({
    value: opt.value,
    label: `${localeShortName(opt.value, opt.label)} (${localeRegionCode(opt.value)})`,
  }));

  const moduleSelectOptions = sortedModules.map((mod) => ({
    value: mod,
    label: CREATE_TASK_MODULE_LABELS[mod] ?? mod,
  }));

  return (
    <div style={{ ...v4CardStyle, padding: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em", color: v4Colors.text }}>
            新建翻译任务
          </h2>
          <div style={{ marginTop: 4, fontSize: 12, color: v4Colors.textMuted }}>
            {targets.length} 种语言 · {modules.length} 个模块
          </div>
        </div>
        <Button type="primary" disabled={!canCreate} loading={creating} onClick={onCreate}>
          {creating ? "创建中…" : targets.length > 1 ? `创建 ${targets.length} 个任务` : "创建任务"}
        </Button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <SectionHeader
          title="目标语言"
          extra={targets.length > 0 ? `已选 ${targets.length} 种` : undefined}
        />
        <Space size={8} wrap style={{ marginBottom: 12 }}>
          <Button size="small" onClick={selectAllTargets}>
            全选
          </Button>
          <Button size="small" onClick={clearTargets}>
            清空
          </Button>
        </Space>
        <Select
          mode="multiple"
          allowClear
          placeholder="选择目标语言"
          value={targets}
          onChange={onTargetsChange}
          options={targetSelectOptions}
          maxTagCount="responsive"
          style={{ width: "100%" }}
          optionFilterProp="label"
        />
        <div style={{ marginTop: 8, fontSize: 12, color: v4Colors.textFaint }}>
          共 {targetOptions.length} 种可翻译语言
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${v4Colors.divider}`, paddingTop: 16, marginBottom: 16 }}>
        <SectionHeader
          title="翻译内容"
          extra={modules.length > 0 ? `已选 ${modules.length} 个模块` : undefined}
        />
        <Space size={8} wrap style={{ marginBottom: 12 }}>
          <Button size="small" onClick={applyRecommendedModules}>
            恢复推荐
          </Button>
          <Button size="small" onClick={selectAllModules}>
            全选
          </Button>
          <Button size="small" onClick={clearModules}>
            清空选择
          </Button>
        </Space>
        <Select
          mode="multiple"
          allowClear
          placeholder="选择翻译内容模块"
          value={modules}
          onChange={onModulesChange}
          options={moduleSelectOptions}
          maxTagCount="responsive"
          style={{ width: "100%" }}
          optionFilterProp="label"
        />
      </div>

      <div>
        <SectionHeader title="高级设置" extra={advancedSummary} />
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
