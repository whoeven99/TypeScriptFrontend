import { useEffect, useState } from "react";
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
import Typography from "@tiptap/extension-typography";
import Underline from "@tiptap/extension-underline";
import Tiptap from "app/components/richTextInput/richTextInput";

// 该文件单独成 chunk（tiptap + prosemirror 约 468K），由 manageTableInput 懒加载，
// 只有渲染 HTML 字段时才会下载，纯文本字段完全不引入编辑器。

const buildExtensions = () => [
  StarterKit,
  Typography,
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
  const [isInitialized, setIsInitialized] = useState(false);
  const [htmlContent, setHtmlContent] = useState<string>("");

  const targetEditor = useEditor(
    {
      extensions: buildExtensions(),
      content: translatedValues[record?.key] || "",
      immediatelyRender: false,
      onUpdate: ({ editor }) => {
        if (!isInitialized) return;
        const html = editor.getHTML(); // 原始 HTML
        handleInputChange(record, html);
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
      htmlContent={translatedValues[record?.key]}
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
  const [htmlContent, setHtmlContent] = useState<string>(defaultValue);

  const originalEditor = useEditor({
    editable: false,
    extensions: buildExtensions(),
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
