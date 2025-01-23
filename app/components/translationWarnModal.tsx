import { Button, Modal, Typography } from "antd";
import { useTranslation } from "react-i18next";

const { Text } = Typography;

interface TranslationWarnModalProps {
  show: boolean;
  setShow: (show: boolean) => void;
}

const TranslationWarnModal: React.FC<TranslationWarnModalProps> = ({
  show,
  setShow,
}) => {
  const { t } = useTranslation();

  const handleContactSupport = () => {
    window.open("mailto:support@ciwi.ai", "_blank");
    setShow(false);
  };

  return (
    // 添加 Modal 组件
    <Modal
      open={show}
      onCancel={() => setShow(false)}
      title="Translation limit reached"
      footer={
        <Button type="primary" onClick={() => handleContactSupport()}>
          Contact Support
        </Button>
      }
    >
      <Text>
        Sorry, your store is too large to continue translating. Please contact
        our team for support.
      </Text>
    </Modal>
  );
};

export default TranslationWarnModal;
