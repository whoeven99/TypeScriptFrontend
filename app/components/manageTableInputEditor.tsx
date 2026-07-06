import { useEffect, useMemo, useRef, useState } from "react";
import { useEditor } from "@tiptap/react";
import TextAlign from "@tiptap/extension-text-align";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import { Table } from "@tiptap/extension-table";
import Link from "@tiptap/extension-link";
import Color from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import Tiptap from "app/components/richTextInput/richTextInput";
import { normalizeManageTableRichTextContent } from "./manageTableRichText";

// 该文件单独成 chunk（tiptap + prosemirror 约 468K），由 manageTableInput 懒加载，
// 只有渲染 HTML 字段时才会下载，纯文本字段完全不引入编辑器。

const buildExtensions = () => [
  StarterKit,
  TextStyle,
  Color,
  Highlight,
  Underline,
  Link.configure({
    autolink: true,
    linkOnPaste: true,
    openOnClick: false,
    HTMLAttributes: {
      rel: "noopener noreferrer nofollow",
      target: "_blank",
    },
  }),
  Image,
  Table.configure({ resizable: true }),
  TableRow,
  TableHeader,
  TableCell,
  TextAlign.configure({ types: ["heading", "paragraph"] }),
];

interface EditableEditorProps {
  record: any;
  translatedValues: { [key: string]: string };
  handleInputChange: (record: any, value: string) => void;
  isSuccess?: boolean;
  isRtl?: boolean;
}

const EditableEditor: React.FC<EditableEditorProps> = ({
  record,
  translatedValues,
  handleInputChange,
  isSuccess,
  isRtl,
}) => {
  const extensions = useMemo(() => buildExtensions(), []);
  const initializedRef = useRef(false);
  const latestRecordRef = useRef(record);
  const latestHandleInputChangeRef = useRef(handleInputChange);
  const rawValue = translatedValues[record?.key] || "";
  const normalizedValue = useMemo(
    () => normalizeManageTableRichTextContent(rawValue),
    [rawValue],
  );

  useEffect(() => {
    latestRecordRef.current = record;
    latestHandleInputChangeRef.current = handleInputChange;
  }, [record, handleInputChange]);

  const targetEditor = useEditor(
    {
      extensions,
      content: normalizedValue,
      immediatelyRender: false,
      onUpdate: ({ editor }) => {
        if (!initializedRef.current) return;
        latestHandleInputChangeRef.current(
          latestRecordRef.current,
          editor.getHTML(),
        );
      },
    },
    [],
  );

  useEffect(() => {
    if (!targetEditor) return;

    // 只在首次加载或内容真的不同的时候才更新
    if (!initializedRef.current) {
      targetEditor.commands.setContent(normalizedValue, { emitUpdate: false });
      initializedRef.current = true;
      return;
    }

    const currentHtml = targetEditor.getHTML();
    if (currentHtml !== normalizedValue) {
      targetEditor.commands.setContent(normalizedValue, {
        emitUpdate: false,
      });
    }
  }, [targetEditor, normalizedValue]);

  return (
    <Tiptap
      editor={targetEditor}
      htmlContent={normalizedValue}
      setHtmlContent={(e) => handleInputChange(record, e)}
      isSuccess={isSuccess}
      isrtl={isRtl}
    />
  );
};

interface ReadonlyEditorProps {
  defaultValue: string;
  isRtl?: boolean;
}

const ReadonlyEditor: React.FC<ReadonlyEditorProps> = ({
  defaultValue,
  isRtl,
}) => {
  const extensions = useMemo(() => buildExtensions(), []);
  const normalizedValue = useMemo(
    () => normalizeManageTableRichTextContent(defaultValue),
    [defaultValue],
  );
  const [htmlContent, setHtmlContent] = useState<string>(normalizedValue);

  const originalEditor = useEditor({
    editable: false,
    extensions,
    content: normalizedValue || "", // initial content
    immediatelyRender: false, // 🔹 SSR 环境下必须加这个
  });

  useEffect(() => {
    if (!originalEditor) return;
    if (originalEditor.getHTML() === normalizedValue) return;
    originalEditor.commands.setContent(normalizedValue, { emitUpdate: false });
    setHtmlContent(normalizedValue);
  }, [normalizedValue, originalEditor]);

  return (
    <Tiptap
      editor={originalEditor}
      htmlContent={htmlContent}
      setHtmlContent={setHtmlContent}
      isrtl={isRtl}
      readOnly={true}
    />
  );
};

export interface ManageTableInputEditorProps {
  mode: "edit" | "readonly";
  record: any;
  translatedValues?: { [key: string]: string };
  handleInputChange?: (record: any, value: string) => void;
  isSuccess?: boolean;
  isRtl?: boolean;
  defaultValue: string;
}

const ManageTableInputEditor: React.FC<ManageTableInputEditorProps> = ({
  mode,
  record,
  translatedValues,
  handleInputChange,
  isSuccess,
  isRtl,
  defaultValue,
}) => {
  if (mode === "edit") {
    return (
      <EditableEditor
        record={record}
        translatedValues={translatedValues as { [key: string]: string }}
        handleInputChange={
          handleInputChange as (record: any, value: string) => void
        }
        isSuccess={isSuccess}
        isRtl={isRtl}
      />
    );
  }
  return <ReadonlyEditor defaultValue={defaultValue} isRtl={isRtl} />;
};

export default ManageTableInputEditor;
