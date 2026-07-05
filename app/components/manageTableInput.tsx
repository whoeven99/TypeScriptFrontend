import { Input } from "antd";
import { lazy, memo, Suspense, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import Commands from "app/components/richTextInput/commands";
import "./styles.css";
import "./manageTableInput.css";

// tiptap 富文本编辑器（约 468K，含 prosemirror）单独拆成 chunk，
// 仅在渲染 HTML 字段时按需加载，纯文本字段不会引入它。
const ManageTableInputEditor = lazy(() => import("./manageTableInputEditor"));

const { TextArea } = Input;

const sanitizeHtmlForPreview = (html: string) => {
  if (typeof document === "undefined") return "";

  const doc = document.implementation.createHTMLDocument("");
  doc.body.innerHTML = html;

  doc.body
    .querySelectorAll("script, iframe, object, embed, link, meta, style")
    .forEach((node) => node.remove());

  doc.body.querySelectorAll("*").forEach((node) => {
    [...node.attributes].forEach((attr) => {
      const attrName = attr.name.toLowerCase();
      const attrValue = attr.value.trim().toLowerCase();
      const unsafeUrl =
        (attrName === "href" || attrName === "src") &&
        (attrValue.startsWith("javascript:") || attrValue.startsWith("data:"));

      if (attrName.startsWith("on") || attrName === "srcdoc" || unsafeUrl) {
        node.removeAttribute(attr.name);
      }
    });
  });

  doc.body.querySelectorAll("img").forEach((node) => {
    node.removeAttribute("width");
    node.removeAttribute("height");
    node.removeAttribute("align");
    node.style.maxWidth = "100%";
    node.style.height = "auto";
    node.style.float = "none";
    node.style.display = "block";
    node.style.margin = "8px auto";
  });

  return doc.body.innerHTML;
};

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
  index?: number;
}

const ManageTableInput: React.FC<ManageTableInputProps> = ({
  record,
  isHtml,
  isSuccess,
  translatedValues,
  setTranslatedValues,
  handleInputChange,
  isRtl,
  index,
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
    return sanitizeHtmlForPreview(defaultValue);
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
          <div className="tiptap-container readOnly-input">
            <Commands
              editor={null}
              readOnly={true}
              handleTiptap={() => {}}
              className="tiptap-commands tiptap-commands--readonly"
            />
            <div
              className={`tiptap-content readOnly-input ${isRtl ? "rtl-input" : ""}`}
            >
              <div
                className={`tiptap html-preview-input html-preview-input--shell ${isRtl ? "rtl-input" : ""}`}
                dangerouslySetInnerHTML={{ __html: readonlyHtml }}
              />
            </div>
          </div>
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
  }, [record]);

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
