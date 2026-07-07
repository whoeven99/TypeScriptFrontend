import { Input, Tooltip } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { globalStore } from "~/globalStore";

const MAX_PROMPT_LENGTH = 500;

/**
 * 页面级「翻译提示词」输入框。
 *
 * 用户在翻译管理页填写、描述本次翻译的方向/风格，值写入 `globalStore.translatePrompt`。
 * 手动单条翻译（SingleTextTranslate）会读取该值并随请求上送，注入到 system prompt。
 * 仅当前会话内保留（挂载在 app 布局层，跨子页面导航不丢失，刷新后清空）。
 */
const TranslatePromptInput: React.FC = () => {
  const { t } = useTranslation();
  const [value, setValue] = useState<string>(globalStore.translatePrompt ?? "");

  const handleChange = (next: string) => {
    setValue(next);
    globalStore.translatePrompt = next.trim() ? next : undefined;
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        margin: "12px 0",
      }}
    >
      <span style={{ whiteSpace: "nowrap", fontWeight: 500 }}>
        {t("Translation prompt")}
        <Tooltip
          title={t(
            "Describe the direction or style for this translation. It is applied to manual single-field translation on this page.",
          )}
        >
          <InfoCircleOutlined style={{ marginLeft: 4, opacity: 0.6 }} />
        </Tooltip>
      </span>
      <Input
        allowClear
        value={value}
        maxLength={MAX_PROMPT_LENGTH}
        placeholder={t(
          "e.g. Use a formal tone; keep brand names in English",
        )}
        onChange={(e) => handleChange(e.target.value)}
      />
    </div>
  );
};

export default TranslatePromptInput;
