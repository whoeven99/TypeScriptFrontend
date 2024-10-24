import { Tag } from 'antd';

interface SelectedLanguageTagProps {
  language: string;
  onRemove: () => void; // 处理移除语言的函数
}

const SelectedLanguageTag: React.FC<SelectedLanguageTagProps> = ({ language, onRemove }) => {
  return (
    <Tag
      closable
      onClose={onRemove}
    >
      {language}
    </Tag>
  );
};

export default SelectedLanguageTag;
