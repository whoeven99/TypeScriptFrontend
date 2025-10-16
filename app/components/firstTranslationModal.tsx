import { useFetcher, useNavigate } from "@remix-run/react";
import { Button, ConfigProvider, Flex, Modal, Space, Typography } from "antd";
import { useEffect } from "react";
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
  const { shop } = useSelector((state: any) => state.userConfig);

  const fetcher = useFetcher<any>();
  const planFetcher = useFetcher<any>();
  const orderFetcher = useFetcher<any>();

  useEffect(() => {
    if (planFetcher.data) {
      if (planFetcher.data?.success) {
        const order = planFetcher.data?.response?.appSubscription;
        const confirmationUrl = planFetcher.data?.response?.confirmationUrl;
        const orderInfo = {
          id: order.id,
          amount: order.price.amount,
          name: order.name,
          createdAt: order.createdAt,
          status: order.status,
          confirmationUrl: confirmationUrl,
        };
        const formData = new FormData();
        formData.append("orderInfo", JSON.stringify(orderInfo));
        orderFetcher.submit(formData, {
          method: "post",
          action: "/app",
        });
        open(confirmationUrl, "_top");
      } else {
      }
    }
  }, [planFetcher.data]);

  const handleReceive = () => {
    planFetcher.submit(
      {
        payForPlan: JSON.stringify({
          title: "Basic",
          monthlyPrice: 7.99,
          yearlyPrice: 6.39,
          yearly: false,
          trialDays: 5,
        }),
      },
      { method: "POST", action: "/app/pricing" },
    );
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
        <Flex justify="center">
          <Button
            type="primary"
            onClick={handleReceive}
            loading={planFetcher.state == "submitting"}
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: 10,
            }}
          >
            {t("Start Free Trial")}
          </Button>
        </Flex>
      </Space>
    </Modal>
  );
};

export default FirstTranslationModal;
