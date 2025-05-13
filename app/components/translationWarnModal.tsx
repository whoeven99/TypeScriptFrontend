import { Button, Modal, Space, Typography } from "antd";
import { useTranslation } from "react-i18next";

const { Text } = Typography;

interface TranslationWarnModalProps {
  title: string;
  content: string;
  action?: () => void;
  actionText?: string;
  show: boolean;
  setShow: (show: boolean) => void;
}

const TranslationWarnModal: React.FC<TranslationWarnModalProps> = ({
  title,
  content,
  action,
  actionText,
  show,
  setShow,
}) => {
  const { t } = useTranslation();
  return (
    // 添加 Modal 组件
    <Modal
      open={show}
      onCancel={() => setShow(false)}
      title={t(title)}
      footer={
        <Space>
          <Button onClick={() => setShow(false)}>
            {t("Cancel")}
          </Button>
          {action && actionText && (
            <Button type="primary" onClick={action}>
              {t(actionText)}
            </Button>
          )}
        </Space>
      }
      style={{
        top: "40%",
        zIndex: 1001,
      }}
      width={700}
    >
      <Text>
        {t(content)}
      </Text>
    </Modal>
  );
};

export default TranslationWarnModal;
