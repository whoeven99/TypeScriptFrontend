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
  return (
    // 添加 Modal 组件
    <Modal
      open={show}
      onCancel={() => setShow(false)}
      title={t("The 20 language limit has been reached")}
      footer={
        <Button onClick={() => setShow(false)}>
          {t("Cancel")}
        </Button>
      }
    >
      <Text>
        {t("Based on Shopify's language limit, you can only add up to 20 languages.Please delete some languages and then continue.")}
      </Text>
    </Modal>
  );
};

export default TranslationWarnModal;
