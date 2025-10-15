import { useFetcher, useNavigate } from "@remix-run/react";
import { Button, ConfigProvider, Flex, Modal, Space, Typography } from "antd";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { IsShowFreePlan } from "~/api/JavaServer";
import { globalStore } from "~/globalStore";
import { planNum } from "../route";

const { Title, Text } = Typography;

interface HasPayForFreePlanModalProps {
  server: string;
}

const HasPayForFreePlanModal: React.FC<HasPayForFreePlanModalProps> = ({
  server,
}) => {
  const { t } = useTranslation();

  const [content, setContent] = useState<any>({
    show: false,
    plan: "",
  });

  const { plan, isNew } = useSelector((state: any) => state.userConfig);

  useEffect(() => {
    GetOrderStatus();
  }, [isNew]);

  const GetOrderStatus = async () => {
    if (!isNew && isNew !== null) {
      const hasShowModal = localStorage.getItem("ciwi-freetrial-hasShow");
      if (hasShowModal) {
        return;
      } else {
        setTimeout(async () => {
          const hasShowModalResponse = await IsShowFreePlan({
            shop: globalStore?.shop || "",
            server: server as string,
          });
          if (hasShowModalResponse?.success) {
            if (hasShowModalResponse?.response) {
              setContent({
                show: true,
                success: true,
              });
            }
          }
          localStorage.setItem("ciwi-freetrial-hasShow", "1");
        }, 100);
      }
    }
  };

  return (
    // 添加 Modal 组件
    <Modal
      open={content.show}
      onCancel={() =>
        setContent({
          ...content,
          show: false,
        })
      }
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
          {t("Got a 5-day free trial")}
        </Title>
        <Text>
          {t("You have received {{ plan }} Plan benefits", {
            plan: planNum(plan?.id),
          })}
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
          <Text>{t("✅ IP-based language & currency switching")}</Text>
          <Text>{t("✅ Glossary support for brand consistency")}</Text>
        </Space>
        <Flex justify="center">
          <Button
            type="primary"
            onClick={() =>
              setContent({
                ...content,
                show: false,
              })
            }
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: 10,
            }}
          >
            {t("Got it")}
          </Button>
        </Flex>
      </Space>
    </Modal>
  );
};

export default HasPayForFreePlanModal;
