import { Input } from "antd";
import { useEffect, useMemo } from "react";
import "./styles.css";
import { useSelector } from "react-redux";
import { useEditor } from "@tiptap/react";
import { Video } from "app/components/richTextInput/extensions/VideoNode";
import TextAlign from "@tiptap/extension-text-align";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import { Table } from "@tiptap/extension-table";
import { LocalImage } from "app/components/richTextInput/extensions/imageNode";
import Color from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Tiptap from "app/components/richTextInput/richTextInput";
import styles from "app/routes/styles/styles.module.css";

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

  const originalEditor = useEditor({
    editable: false,
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      Highlight,
      LocalImage,
      Table.configure({
        resizable: true, // 允许拖动调整列宽
      }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({
        types: ["heading", "paragraph"], // 指定允许设置对齐的节点类型
      }),
      Video,
      // Underline
    ], // define your extension array
    content: defaultValue || "", // initial content
    immediatelyRender: false, // 🔹 SSR 环境下必须加这个
  });

  const targetEditor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      Highlight,
      LocalImage,
      Table.configure({
        resizable: true, // 允许拖动调整列宽
      }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({
        types: ["heading", "paragraph"], // 指定允许设置对齐的节点类型
      }),
      Video,
      // Underline
    ], // define your extension array
    content: translatedValues || "", // initial content
    immediatelyRender: false, // 🔹 SSR 环境下必须加这个
  });

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

  useEffect(() => {
    originalEditor?.commands.setContent(defaultValue);
  }, [defaultValue]);

  if (
    handleInputChange &&
    translatedValues !== undefined &&
    setTranslatedValues !== undefined
  ) {
    if (isHtml) {
      return <Tiptap editor={targetEditor} />;
    }
    return (
      <TextArea
        value={translatedValues[record?.key]}
        autoSize={{ minRows: 1, maxRows: 6 }}
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
      return <Tiptap editor={originalEditor} readOnly={true} />;
    }
    return (
      <TextArea
        disabled
        value={defaultValue}
        autoSize={{ minRows: 1, maxRows: 6 }}
        className={locale === "ar" ? "rtl-input" : ""}
      />
    );
  }
};

export default ManageTableInput;
