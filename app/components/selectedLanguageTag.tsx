import { Tag } from 'antd';

interface SelectedLanguageTagProps {
  item: string;
  onRemove: () => void; // 处理移除语言的函数
}

const SelectedLanguageTag: React.FC<SelectedLanguageTagProps> = ({ item, onRemove }) => {
  return (
    <Tag
      closable
      onClose={onRemove}
    >
      {item}
    </Tag>
  );
};

export default SelectedLanguageTag;
