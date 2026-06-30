import { useFetcher, useNavigate } from "@remix-run/react";
import { Button, Modal, Space, Typography } from "antd";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

const { Paragraph, Text, Title } = Typography;

type Props = {
  open: boolean;
  mode: "trial" | "pricing";
  onClose: () => void;
};

export function CreateTaskQuotaGateModal({ open, mode, onClose }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const planFetcher = useFetcher<{ success?: boolean; response?: { confirmationUrl?: string } }>();

  useEffect(() => {
    if (!planFetcher.data?.success) return;
    const confirmationUrl = planFetcher.data.response?.confirmationUrl;
    if (confirmationUrl) openUrl(confirmationUrl);
  }, [planFetcher.data]);

  const handlePrimaryAction = () => {
    if (mode === "trial") {
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
      return;
    }

    onClose();
    navigate("/app/pricing");
  };

  const isTrial = mode === "trial";

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      width={560}
      destroyOnHidden
    >
      <Space direction="vertical" size={18} style={{ width: "100%" }}>
        <div>
          <Title level={3} style={{ margin: 0, lineHeight: 1.3 }}>
            {isTrial
              ? t("Your credits are empty, but your free trial is still waiting")
              : t("Your credits are empty. Upgrade to keep translations moving")}
          </Title>
          <Paragraph style={{ marginTop: 12, marginBottom: 0, color: "rgba(0, 0, 0, 0.65)" }}>
            {isTrial
              ? t("Start your 5-day free trial now to unlock translation access immediately and launch this task without waiting.")
              : t("Your free trial has already been used. Subscribe to a paid plan to restore monthly credits and continue creating translation tasks.")}
          </Paragraph>
        </div>

        <div
          style={{
            padding: "16px 18px",
            borderRadius: 14,
            background: isTrial
              ? "linear-gradient(135deg, rgba(22, 119, 255, 0.1), rgba(114, 46, 209, 0.08))"
              : "linear-gradient(135deg, rgba(250, 173, 20, 0.12), rgba(255, 120, 117, 0.08))",
            border: isTrial
              ? "1px solid rgba(22, 119, 255, 0.18)"
              : "1px solid rgba(250, 173, 20, 0.24)",
          }}
        >
          <Space direction="vertical" size={10} style={{ width: "100%" }}>
            <Text strong>
              {isTrial
                ? t("What you unlock right away")
                : t("What you get after upgrading")}
            </Text>
            <Text>{t("Translation access for products, pages, and more")}</Text>
            <Text>{t("Glossary and advanced translation workflow support")}</Text>
            <Text>
              {isTrial
                ? t("A 5-day trial window with credits included")
                : t("Monthly plan credits so your team can keep shipping multilingual content")}
            </Text>
          </Space>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <Button onClick={onClose}>{t("Maybe later")}</Button>
          <Button
            type="primary"
            onClick={handlePrimaryAction}
            loading={planFetcher.state === "submitting"}
          >
            {isTrial ? t("Claim Free Trial") : t("View Plans")}
          </Button>
        </div>
      </Space>
    </Modal>
  );
}

function openUrl(url: string) {
  open(url, "_top");
}
