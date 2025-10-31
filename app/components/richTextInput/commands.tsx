import {
  CodeIcon,
  TextBoldIcon,
  TextItalicIcon,
  TextUnderlineIcon,
} from "@shopify/polaris-icons";
import "./styles/commands.css";
import { useState, useEffect, useRef } from "react";
import HeadingMenu from "./components/Heading";
import { Button, InlineStack, Tooltip } from "@shopify/polaris";

const Commands = ({ editor, handleTiptap, className, readOnly }: any) => {
  const sanitizeHtml = (html: any) => {
    return html
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "") // 移除 script
      .replace(/\son\w+="[^"]*"/gi, ""); // 移除 onClick/onError 等事件
  };

  const textareaRef = useRef(null);

  const [isHtmlMode, setIsHtmlMode] = useState(false);

  useEffect(() => {
    if (isHtmlMode && textareaRef.current) {
      const el = textareaRef.current as HTMLTextAreaElement;
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    }
  }, [isHtmlMode]);

  const toggleHtmlMode = () => {
    if (!editor) return;
    if (!isHtmlMode) {
      setIsHtmlMode(true);
      handleTiptap(false);
    } else {
      setIsHtmlMode(false);
      handleTiptap(true);
    }
  };

  return (
    <div className={className}>
      <div className="commands">
        <InlineStack gap="200" align="center" blockAlign="center" wrap={false}>
          <Tooltip content="heading" dismissOnMouseOut>
            <HeadingMenu editor={editor} disabled={isHtmlMode || readOnly} />
          </Tooltip>
          <Tooltip content="Bold" dismissOnMouseOut>
            <Button
              variant="tertiary"
              onClick={() => editor.chain().focus().toggleBold().run()}
              disabled={!editor || isHtmlMode || readOnly}
              icon={TextBoldIcon}
            />
          </Tooltip>
          <Tooltip content="Italic" dismissOnMouseOut>
            <Button
              variant="tertiary"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              disabled={!editor || isHtmlMode || readOnly}
              icon={TextItalicIcon}
            />
          </Tooltip>
          <Tooltip content="Underline" dismissOnMouseOut>
            <Button
              variant="tertiary"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              disabled={!editor || isHtmlMode || readOnly}
              icon={TextUnderlineIcon}
            />
          </Tooltip>
        </InlineStack>
        <Tooltip
          content={isHtmlMode ? "Show Editor" : "Show HTML"}
          dismissOnMouseOut
        >
          <Button
            variant="tertiary"
            onClick={toggleHtmlMode}
            disabled={!editor}
            icon={CodeIcon}
          ></Button>
        </Tooltip>
      </div>
      {/* {isHtmlMode && (
        <textarea
          ref={textareaRef}
          value={formatHtml(htmlContent)}
          onChange={(e) => formatHtml(e.target.value)}
          style={{
            border: "1px solid #ccc",
            padding: "8px",
            height: "100%",
            fontFamily: "monospace",
            whiteSpace: "pre",
            overflow: "auto",
            width: "100%",
            borderRadius: "0 0 10px 10px",
          }}
        />
      )} */}
    </div>
  );
};

export default Commands;
