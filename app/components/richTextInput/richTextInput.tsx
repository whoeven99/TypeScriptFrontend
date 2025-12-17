// src/Tiptap.tsx
import { EditorContent, Editor } from "@tiptap/react";
import Commands from "./commands";
import { useRef, useEffect, useState } from "react";
import "./styles/tiptap.css";
import "../styles.css";

interface TiptapProps {
  editor: Editor | null;
  htmlContent: string;
  setHtmlContent: (e: string) => void;
  isSuccess?: boolean;
  readOnly?: boolean;
  style?: any;
  isrtl?: boolean;
}

const Tiptap = ({
  editor,
  htmlContent,
  setHtmlContent,
  isSuccess,
  readOnly,
  style,
  isrtl,
}: TiptapProps) => {
  const textareaRef = useRef(null);

  const [showTiptap, setShowTiptap] = useState(true);

  const hideTiptap = (value: boolean) => {
    setShowTiptap(value);
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
          onChange={(e) => setHtmlContent(e.target.value)}
          readOnly={readOnly}
        />
      )}
    </div>
  );
};

export default Tiptap;
