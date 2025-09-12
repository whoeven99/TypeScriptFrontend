import { useFetcher, useNavigate } from "@remix-run/react";
import { Button, ConfigProvider, Flex, Modal, Space, Typography } from "antd";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";

const { Title, Text } = Typography;

interface HasPayForFreePlanModalProps {
  show: boolean;
  setShow: (show: boolean) => void;
}

const HasPayForFreePlanModal: React.FC<HasPayForFreePlanModalProps> = ({
  show,
  setShow,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isNew } = useSelector((state: any) => state.userConfig);

  return (
    // 添加 Modal 组件
    <Modal
      open={show}
      onCancel={() => setShow(false)}
      footer={null}
      centered
      width={600}
      style={{
        maxWidth: "80%",
        border: "none",
      }}
    >
      <Space direction="vertical" style={{ width: "100%" }}>
        <Title
          style={{
            margin: "0",
            fontSize: "1.25rem",
            fontWeight: 700,
            marginBottom: 24,
          }}
        >
          {t("No Translation Credits Available")}
        </Title>
        <Text>
          {t("Activate your free trial to start translating instantly:")}
        </Text>
        <Space
          direction="vertical"
          style={{
            width: "100%",
            padding: "8px 4px",
            border: "1px solid #f0f0f0",
            borderRadius: "8px",
          }}
        >
          <Text>{t("✅ 1,000,000 free credits for translation")}</Text>
          <Text>{t("✅ Automatic translation for store content")}</Text>
          <Text>{t("✅ Image & alt-text translation")}</Text>
          <Text>{t("✅ IP-based language & currency switching")}</Text>
          <Text>{t("✅ Glossary support for brand consistency")}</Text>
          <Text>{t("✅ Live human support when needed")}</Text>
        </Space>
      </Space>
    </Modal>
  );
};

export default HasPayForFreePlanModal;
