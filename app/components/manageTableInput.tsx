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
  }, [record]);

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
      const debouncedHandleChange = useMemo(
        () =>
          debounce((content: string) => {
            // 添加内容检查，避免空内容触发更新
            if (content && content !== translatedValues[record?.key]) {
              handleInputChange(
                record.key,
                content,
                index ? Number(index + "" + record.index) : record.index,
              );
            }
          }, 300),
        // 依赖项中移除 handleInputChange，避免不必要的重新创建
        [record?.key, index, record?.index]
      );

      // 组件卸载时清理 debounce
      useEffect(() => {
        return () => {
          debouncedHandleChange.cancel();
        };
      }, [debouncedHandleChange]);

      return (
        <ReactQuill
          key={`${record?.key}-${record?.default_language}-${translatedValues[record?.key]}`}
          theme="snow"
          value={translatedValues[record?.key] || ''}
          modules={modules}
          onChange={debouncedHandleChange}
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
