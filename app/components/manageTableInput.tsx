import { Input } from "antd";
import dynamic from "next/dist/shared/lib/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import debounce from 'lodash/debounce';
const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });

const { TextArea } = Input;

interface ManageTableInputProps {
  record: any;
  translatedValues?: {
    [key: string]: string;
  };
  setTranslatedValues?: React.Dispatch<
    React.SetStateAction<{
      [key: string]: string;
    }>
  >;
  handleInputChange?: (key: string, value: string, index: number) => void;
  textarea: boolean;
  index?: number;
}

const ManageTableInput: React.FC<ManageTableInputProps> = ({
  record,
  translatedValues,
  setTranslatedValues,
  handleInputChange,
  textarea,
  index,
}) => {
  const [defaultValue, setDefaultValue] = useState<string>(
    record?.default_language || "",
  );

  const modules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
      ['blockquote', 'code-block'],
      // ['link', 'image', 'video', 'formula'],

      // [{ 'header': 1 }, { 'header': 2 }],               // custom button values
      // [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'list': 'check' }],
      // [{ 'script': 'sub' }, { 'script': 'super' }],      // superscript/subscript
      // [{ 'indent': '-1' }, { 'indent': '+1' }],          // outdent/indent
      [{ 'direction': 'rtl' }],                         // text direction

      [{ 'size': ['small', false, 'large', 'huge'] }],  // custom dropdown
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],

      [{ 'color': [] }],          // dropdown with defaults from theme
      [{ 'font': [] }],
      [{ 'align': [] }],

      ['clean']                                         // remove formatting button
    ],
    clipboard: {
      matchVisual: false // 禁用视觉匹配，可以减少自动添加的空格
    }
  };

  useEffect(() => {
    setDefaultValue(record?.default_language || "");
  }, [record?.default_language]);

  useEffect(() => {
    if (setTranslatedValues) {
      setTranslatedValues((prev) => ({
        ...prev,
        [record?.key]: record?.translated, // 更新对应的 key
      }));
    }
  }, [record, setTranslatedValues]); 

  if (
    handleInputChange &&
    translatedValues !== undefined &&
    setTranslatedValues !== undefined
  ) {
    if (textarea) {
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
        />
      );
    } else if (record?.key === "body_html") {
      const [editorValue, setEditorValue] = useState(translatedValues[record?.key] || '');
      const [isInitializing, setIsInitializing] = useState(true);
      
      useEffect(() => {
        setIsInitializing(true);
        setEditorValue(translatedValues[record?.key] || '');
        const timer = setTimeout(() => {
          setIsInitializing(false);
        }, 0);
        
        return () => clearTimeout(timer);
      }, [record?.key, translatedValues]);

      const normalizeHtml = (html: string) => {
        // 标准化HTML字符串，移除多余空格和换行
        return html
          .replace(/\s+/g, ' ')  // 将多个空白字符替换为单个空格
          .replace(/>\s+</g, '><')  // 移除标签之间的空白
          .trim();  // 移除首尾空白
      };

      const debouncedHandleChange = useMemo(
        () =>
          debounce((content: string) => {
            if (!isInitializing) {
              const normalizedContent = normalizeHtml(content);
              const normalizedTranslated = normalizeHtml(translatedValues[record?.key] || '');
              
              // 打印标准化后的字符串，用于调试
              console.log('Normalized Content:', normalizedContent);
              console.log('Normalized Translated:', normalizedTranslated);
              
              if (normalizedContent && normalizedContent !== normalizedTranslated) {
                handleInputChange(
                  record.key,
                  content,
                  index ? Number(index + "" + record.index) : record.index,
                );
              }
            }
          }, 300),
        [record?.key, index, record?.index, isInitializing, translatedValues]
      );

      useEffect(() => {
        return () => {
          debouncedHandleChange.cancel();
        };
      }, [debouncedHandleChange]);

      return (
        <ReactQuill
          key={`${record?.key}-${record?.default_language}`}
          theme="snow"
          value={editorValue}
          modules={modules}
          onChange={(content) => {
            setEditorValue(content);
            if (!isInitializing) {
              debouncedHandleChange(content);
            }
          }}
        />
      );
    }
    return (
      <Input
        value={translatedValues[record?.key]}
        onChange={(e) =>
          handleInputChange(
            record.key,
            e.target.value,
            index ? Number(index + "" + record.index) : index || record.index,
          )
        }
      />
    );
  } else {
    if (textarea) {
      return (
        <TextArea
          disabled
          value={defaultValue}
          autoSize={{ minRows: 1, maxRows: 6 }}
        />
      );
    } else if (record?.key === "body_html") {
      return <ReactQuill theme="snow" value={defaultValue} readOnly modules={modules} />;
    }
    return <Input disabled value={defaultValue} />;
  }
};

export default ManageTableInput;
