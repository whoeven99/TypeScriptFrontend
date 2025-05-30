import { Input } from "antd";
// import dynamic from "next/dist/shared/lib/dynamic";
import { useEffect, useMemo } from "react";
// import debounce from 'lodash/debounce';
import "./styles.css";
import { useSelector } from "react-redux";

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
  isRtl?: boolean;
  index?: number;
}

// const modules = {
//   toolbar: [
//     ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
//     ['blockquote', 'code-block'],
//     [{ 'direction': 'rtl' }],                         // text direction

//     [{ 'size': ['small', false, 'large', 'huge'] }],  // custom dropdown
//     [{ 'header': [1, 2, 3, 4, 5, 6, false] }],

//     [{ 'color': [] }],          // dropdown with defaults from theme
//     [{ 'font': [] }],
//     [{ 'align': [] }],

//     ['clean']                                         // remove formatting button
//   ],
//   clipboard: {
//     matchVisual: false // 禁用视觉匹配，可以减少自动添加的空格
//   }
// };

const ManageTableInput: React.FC<ManageTableInputProps> = ({
  record,
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
        className={isRtl ? "rtl-input" : ""}
      />
    );
  } else {
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
