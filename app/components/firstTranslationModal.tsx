import { useFetcher, useNavigate } from "@remix-run/react";
import { Button, ConfigProvider, Flex, Modal, Space, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";

const { Title, Text } = Typography;

interface FirstTranslationModalProps {
  show: boolean;
  setShow: (show: boolean) => void;
}

const FirstTranslationModal: React.FC<FirstTranslationModalProps> = ({
  show,
  setShow,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fetcher = useFetcher<any>();
  const { shop } = useSelector((state: any) => state.userConfig);

  const handleReceive = () => {
    navigate("/app/pricing");
    fetcher.submit(
      {
        log: `${shop} 前往付费页面, 从领取免费额度表单点击`,
      },
      {
        method: "POST",
        action: "/log",
      },
    );
  };

  return (
    // 添加 Modal 组件
    <ConfigProvider
      theme={{
        components: {
          Button: {
            defaultHoverBorderColor: "",
            defaultActiveBorderColor: "",
          },
        },
      }}
    >
      <Modal
        open={show}
        onCancel={() => setShow(false)}
        footer={null}
        centered
        width={300}
        style={{
          maxWidth: "80%",
          border: "none",
        }}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Title level={3} style={{ marginTop: 20 }}>
            {t("🎁 Get free credits")}
          </Title>

          <Text>{t("✅ Give 200,000 points")}</Text>
          <Text>{t("✅ 5-day free trial (any plan)")}</Text>
          <Flex justify="center">
            <Button
              onClick={handleReceive}
              style={{
                backgroundColor: "rgb(34,197,94)",
                display: "flex",
                alignItems: "center",
                marginTop: 10,
              }}
            >
              {t("Receive")}
            </Button>
          </Flex>
        </Space>
      </Modal>
    </ConfigProvider>
  );
};

export default FirstTranslationModal;
