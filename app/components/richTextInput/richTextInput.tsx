// src/Tiptap.tsx
import { EditorContent, Editor } from "@tiptap/react";
import Commands from "./commands";
import { useRef, useEffect, useState } from "react";
import "./styles/tiptap.css";
import "../styles.css";

interface TiptapProps {
  editor: Editor | null;
  isSuccess?: boolean;
  readOnly?: boolean;
  style?: any;
  isrtl?: boolean;
}

const Tiptap = ({ editor, isSuccess, readOnly, style, isrtl }: TiptapProps) => {
  const textareaRef = useRef(null);

  const [showTiptap, setShowTiptap] = useState(true);
  const [htmlContent, setHtmlContent] = useState<string>("");

  useEffect(() => {
    if (!showTiptap) {
      setHtmlContent(editor?.options?.content as string);
    }
  }, [showTiptap]);

  const hideTiptap = (value: boolean) => {
    setShowTiptap(value);
  };

  const handleHtmlContentChange = (e: any) => {
    editor?.commands.setContent(e.target.value);
    setHtmlContent(e.target.value);
  };

  return (
    <div
      className={`tiptap-container ${readOnly ? "readOnly-input" : ""} ${isSuccess ? "success_input" : ""}`}
    >
      {editor && (
        <Commands
          editor={editor}
          readOnly={readOnly}
          handleTiptap={hideTiptap}
          className="tiptap-commands"
        />
      )}
      {showTiptap ? (
        <EditorContent
          editor={editor}
          className={`tiptap-content ${isrtl ? "rtl-input" : ""} ${readOnly ? "readOnly-input" : ""}`}
          style={style}
        />
      ) : (
        <textarea
          className={`html-input ${isrtl ? "rtl-input" : ""} ${readOnly ? "readOnly-input" : ""}`}
          ref={textareaRef}
          value={htmlContent}
          onChange={(e) => handleHtmlContentChange(e)}
          readOnly={readOnly}
        />
      )}
    </div>
  );
};

export default Tiptap;
