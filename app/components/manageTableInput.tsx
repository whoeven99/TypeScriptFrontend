import { Input } from "antd";
import { lazy, memo, Suspense, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import "./styles.css";
import "./manageTableInput.css";
import { sanitizeManageTableHtml } from "./manageTableRichText";

// tiptap 富文本编辑器（约 468K，含 prosemirror）单独拆成 chunk，
// 仅在渲染 HTML 字段时按需加载，纯文本字段不会引入它。
const ManageTableInputEditor = lazy(() => import("./manageTableInputEditor"));

const { TextArea } = Input;

interface ManageTableInputProps {
  record: any;
  isHtml?: boolean;
  isSuccess?: boolean;
  translatedValues?: {
    [key: string]: string;
  };
  setTranslatedValues?: React.Dispatch<
    React.SetStateAction<{
      [key: string]: string;
    }>
  >;
  handleInputChange?: (record: any, value: string) => void;
  isRtl?: boolean;
}

const ManageTableInput: React.FC<ManageTableInputProps> = ({
  record,
  isHtml,
  isSuccess,
  translatedValues,
  setTranslatedValues,
  handleInputChange,
  isRtl,
}) => {
  const defaultValue = useMemo(() => {
    return record?.default_language || "";
  }, [record?.default_language]);

  const locale = useSelector((state: any) => state.userConfig.locale);

  // 客户端挂载后再加载编辑器：当前为 renderToString 的非流式 SSR，
  // 服务端与首次客户端渲染都用占位符，避免 hydration 不一致，
  // 编辑器 chunk 仅在浏览器按需下载。
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const readonlyHtml = useMemo(() => {
    if (!mounted) return "";
    return sanitizeManageTableHtml(defaultValue);
  }, [defaultValue, mounted]);

  const renderEditor = (mode: "edit" | "readonly") => {
    const fallback = (
      <div className="manage-table-input">
        <TextArea
          rows={4}
          disabled
          value={
            mode === "edit" ? translatedValues?.[record?.key] : defaultValue
          }
          className={`${isRtl ? "rtl-input" : ""} ${isSuccess ? "success_input" : ""}`}
        />
      </div>
    );
    if (mode === "readonly") {
      if (!mounted) return fallback;
      return (
        <div className="manage-table-input manage-table-input--html">
          <ManageTableInputEditor
            mode={mode}
            record={record}
            translatedValues={translatedValues}
            handleInputChange={handleInputChange}
            isSuccess={isSuccess}
            isRtl={isRtl}
            defaultValue={readonlyHtml}
          />
        </div>
      );
    }

    if (!mounted) return fallback;
    return (
      <div className="manage-table-input manage-table-input--html">
        <Suspense fallback={fallback}>
          <ManageTableInputEditor
            mode={mode}
            record={record}
            translatedValues={translatedValues}
            handleInputChange={handleInputChange}
            isSuccess={isSuccess}
            isRtl={isRtl}
            defaultValue={defaultValue}
          />
        </Suspense>
      </div>
    );
  };

  useEffect(() => {
    if (setTranslatedValues && record?.key) {
      setTranslatedValues((prev) => {
        // 检查值是否发生变化
        if (prev[record.key] === record.translated) {
          return prev; // 如果值相同，直接返回原状态，不触发重渲染
        }

        // 值不同时才更新
        return {
          ...prev,
          [record.key]: record.translated || "",
        };
      });
    }
  }, [record, setTranslatedValues]);

  if (
    handleInputChange &&
    translatedValues !== undefined &&
    setTranslatedValues !== undefined
  ) {
    if (isHtml) {
      return renderEditor("edit");
    }
    return (
      <div className="manage-table-input">
        <TextArea
          rows={4}
          value={translatedValues[record?.key]}
          onChange={(e) => handleInputChange(record, e.target.value)}
          className={`${isRtl ? "rtl-input" : ""} ${isSuccess ? "success_input" : ""}`}
        />
      </div>
    );
  } else {
    if (isHtml) {
      return renderEditor("readonly");
    }
    return (
      <div className="manage-table-input">
        <TextArea
          rows={4}
          disabled
          value={defaultValue}
          className={locale === "ar" ? "rtl-input" : ""}
        />
      </div>
    );
  }
};

// memo：props 浅比较未变时跳过重渲染。配合调用方用 useCallback 稳定
// handleInputChange，可避免无关状态变化引起的整表单元格重渲染。
export default memo(ManageTableInput);
