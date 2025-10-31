import { Input } from "antd";
import { MutableRefObject, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Editor, useEditor } from "@tiptap/react";
import TextAlign from "@tiptap/extension-text-align";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import { Table } from "@tiptap/extension-table";
import Color from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Tiptap from "app/components/richTextInput/richTextInput";
import "./styles.css";

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
  handleInputChange?: (key: string, value: string, index: number) => void;
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
      const [isInitialized, setIsInitialized] = useState(false);
      const [htmlContent, setHtmlContent] = useState<string>("");

      const targetEditor = useEditor(
        {
          extensions: [
            StarterKit,
            TextStyle,
            Color,
            Highlight,
            Table.configure({ resizable: true }),
            TableRow,
            TableHeader,
            TableCell,
            TextAlign.configure({ types: ["heading", "paragraph"] }),
          ],
          content: translatedValues[record?.key] || "",
          immediatelyRender: false,
          onUpdate: ({ editor }) => {
            if (!isInitialized) return;
            const html = editor.getHTML(); // 原始 HTML
            handleInputChange(
              record.key,
              html,
              index ? Number(index + "" + record.index) : record.index,
            );
          },
        },
        [],
      );

      useEffect(() => {
        if (!targetEditor) return;

        const externalHtml = translatedValues[record?.key] || "";

        // 只在首次加载或内容真的不同的时候才更新
        if (!isInitialized) {
          targetEditor.commands.setContent(externalHtml, { emitUpdate: false });
          setIsInitialized(true);
        } else {
          // 如果外部内容变了但和当前内容不同，再更新
          const currentHtml = targetEditor.getHTML();
          if (currentHtml !== externalHtml) {
            targetEditor.commands.setContent(externalHtml, {
              emitUpdate: false,
            });
            setHtmlContent(externalHtml);
          }
        }
      }, [targetEditor, translatedValues, record.key]);

      return (
        <Tiptap
          editor={targetEditor}
          htmlContent={htmlContent}
          setHtmlContent={setHtmlContent}
          isSuccess={isSuccess}
          isrtl={isRtl}
        />
      );
    }
    return (
      <TextArea
        rows={4}
        value={translatedValues[record?.key]}
        onChange={(e) =>
          handleInputChange(
            record.key,
            e.target.value,
            index ? Number(index + "" + record.index) : record.index,
          )
        }
        className={`${isRtl ? "rtl-input" : ""} ${isSuccess ? "success_input" : ""}`}
      />
    );
  } else {
    if (isHtml) {
      const [htmlContent, setHtmlContent] = useState<string>(defaultValue);

      const originalEditor = useEditor({
        editable: false,
        extensions: [
          StarterKit,
          TextStyle,
          Color,
          Highlight,
          Table.configure({
            resizable: true, // 允许拖动调整列宽
          }),
          TableRow,
          TableHeader,
          TableCell,
          TextAlign.configure({
            types: ["heading", "paragraph"], // 指定允许设置对齐的节点类型
          }),
          // Underline
        ], // define your extension array
        content: defaultValue || "", // initial content
        immediatelyRender: false, // 🔹 SSR 环境下必须加这个
      });

      useEffect(() => {
        originalEditor?.commands.setContent(defaultValue);
      }, [defaultValue]);

      return (
        <Tiptap
          editor={originalEditor}
          htmlContent={htmlContent}
          setHtmlContent={setHtmlContent}
          isrtl={isRtl}
          readOnly={true}
        />
      );
    }
    return (
      <TextArea
        rows={4}
        disabled
        value={defaultValue}
        className={locale === "ar" ? "rtl-input" : ""}
      />
    );
  }
};

export default ManageTableInput;
