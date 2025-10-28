// src/Tiptap.tsx
import { EditorContent, Editor } from "@tiptap/react";
import Commands from "./commands";
import { useRef, useEffect, useState } from "react";
import "./styles/tiptap.css";

interface TiptapProps {
  editor: Editor | null;
  readOnly?: boolean;
  style?: any;
}

const Tiptap = ({ editor, style, readOnly }: TiptapProps) => {
  const textareaRef = useRef(null);

  const [showTiptap, setShowTiptap] = useState(true);
  const [htmlContent, setHtmlContent] = useState(editor?.getHTML() || "");

  // HTML 模式下同步 div 内容
  useEffect(() => {
    if (!showTiptap) {
      setHtmlContent(editor?.getHTML() || "");
    }
  }, [showTiptap]);

  const hideTiptap = (value: boolean) => {
    setShowTiptap(value);
  };

  const handleHtmlContentChange = (e: any) => {
    editor?.commands.setContent(e.target.value);
    setHtmlContent(e.target.value);
  };

  // 格式化 HTML 内容以换行显示
  const formatHtml = (html: any) => {
    return html
      .replace(/></g, ">\n<") // 标签之间加换行
      .replace(/\n\s*\n/g, "\n"); // 去掉多余空行
  };

  return (
    <div className="tiptap-container">
      {editor && (
        <Commands
          editor={editor}
          readOnly={readOnly}
          handleTiptap={hideTiptap}
          setHtmlContent={setHtmlContent}
          className="tiptap-commands"
        />
      )}
      {showTiptap ? (
        <EditorContent
          editor={editor}
          className="tiptap-content"
          style={style}
        />
      ) : (
        <textarea
          ref={textareaRef}
          value={formatHtml(htmlContent)}
          onChange={(e) => handleHtmlContentChange(e)}
          style={{
            border: "1px solid #ccc",
            padding: "8px",
            fontFamily: "monospace",
            whiteSpace: "pre-wrap",
            wordWrap: "break-word",
            overflow: "auto",
            width: "100%",
            borderRadius: "0 0 10px 10px",
            marginBottom: "-6px",
            resize: "vertical",
          }}
        />
      )}
    </div>
  );
};

export default Tiptap;
