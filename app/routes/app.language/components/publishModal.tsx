import { Checkbox, Modal, Space, Typography } from "antd";
import { LanguagesDataType, MarketType } from "~/routes/app.language/route";
import "../styles.css";
import { useEffect, useState } from "react";

const { Text } = Typography;

// interface PublishLanguagesType {
//   value: string;
//   label: string;
//   disabled: boolean;
// }

interface PublishModalProps {
  isVisible: boolean;
  onCancel: () => void;
  onOk: () => void;
  setPublishMarket: React.Dispatch<React.SetStateAction<string | undefined>>;
  selectedRow: LanguagesDataType | undefined;
  allMarket: MarketType[];
  // publishLanguages: PublishLanguagesType[];
}

const PublishModal: React.FC<PublishModalProps> = ({
  isVisible,
  onCancel,
  onOk,
  selectedRow,
  allMarket,
  setPublishMarket,
  // publishLanguages,
}) => {
  const [primaryState, setPrimaryState] = useState<boolean>();
  const [primaryMarket, setPrimaryMarket] = useState<MarketType | undefined>();
  const [isChecked, setIsChecked] = useState<boolean>(false); // 新增状态


  useEffect(() => {
    const res = allMarket.find((item) => item.primary === true);
    setPrimaryMarket(res);
    setPrimaryState(!!res); // 如果找到则设置为 true，否则为 false
  }, [allMarket]);
  // console.log(allMarket);

  const onChange = (e: any) => {
    setIsChecked(e.target.checked); // 更新复选框状态
    if (primaryMarket && e.target.checked) {
      setPublishMarket(primaryMarket?.webPresences.nodes[0].id);
    } else {
      setPublishMarket(undefined);
    }
  };

  return (
    <Modal
      open={isVisible}
      onCancel={onCancel}
      onOk={onOk}
      okButtonProps={{ disabled: !isChecked }} // 禁用确认按钮
      title="Select markets for display"
      style={{
        top: "40%",
      }}
    >
      <Space direction="vertical" size="middle" style={{ display: "flex" }}>
        <div className="publish_languageselect_line">
          <Text strong={true}>Language:</Text>
          <Text>{selectedRow?.language}</Text>
        </div>
        <Text strong={true}>Active Market:</Text>
        {primaryState && (
          <Checkbox onChange={onChange}>{primaryMarket?.name}</Checkbox>
        )}
      </Space>
    </Modal>
  );
};

export default PublishModal;
