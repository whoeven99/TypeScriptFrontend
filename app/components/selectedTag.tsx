import { Tag } from 'antd';

interface SelectedTagProps {
  item: string;
  onRemove: () => void; // 处理移除语言的函数
}

const SelectedTag: React.FC<SelectedTagProps> = ({ item, onRemove }) => {
  return (
    <Tag
      closable
      onClose={onRemove}
    >
      {item}
    </Tag>
  );
};

export default SelectedTag;
