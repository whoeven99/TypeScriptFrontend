import {
  Button,
  Divider,
  Modal,
  Space,
  Typography,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import PaymentOptionSelect from "./paymentOptionSelect";
import { useFetcher } from "@remix-run/react";
import { useTranslation } from "react-i18next";
import { handleContactSupport } from "~/utils/supportChat";
import { useSelector } from "react-redux";
import useReport from "../../scripts/eventReport";
import "./styles.css";
import { v4CardStyle, v4Colors } from "~/routes/app.translate-v4/v4Styles";

const { Title, Text } = Typography;

interface PaymentModalProps {
  visible: boolean;
  setVisible: (visible: boolean) => void;
  variant?: "default" | "v4";
}

export interface OptionType {
  key: string;
  name: string;
  Credits: number;
  price: {
    currentPrice: number;
    comparedPrice: number;
    currencyCode: string;
  };
}

const PaymentModal: React.FC<PaymentModalProps> = ({ visible, setVisible, variant = "default" }) => {
  const [selectedKey, setSelectedKey] = useState<string>("option-1");
  const [buyButtonLoading, setBuyButtonLoading] = useState<boolean>(false);
  const { t } = useTranslation();
  const payFetcher = useFetcher<any>();
  const orderFetcher = useFetcher<any>();
  const { reportClick } = useReport();
  const { plan } = useSelector((state: any) => state.userConfig);
  const isV4 = variant === "v4";

  const options: OptionType[] = useMemo(
    () => [
      {
        key: "option-1",
        name: "500K",
        Credits: 500000,
        price: {
          currentPrice: plan?.isInFreePlanTime
            ? 3.99
            : plan?.type === "Premium"
              ? 1.99
              : plan?.type === "Pro"
                ? 2.99
                : plan?.type === "Basic"
                  ? 3.59
                  : 3.99,
          comparedPrice: 3.99,
          currencyCode: "USD",
        },
      },
      {
        key: "option-2",
        name: "1M",
        Credits: 1000000,
        price: {
          currentPrice: plan?.isInFreePlanTime
            ? 7.99
            : plan?.type === "Premium"
              ? 3.99
              : plan?.type === "Pro"
                ? 5.99
                : plan?.type === "Basic"
                  ? 7.19
                  : 7.99,
          comparedPrice: 7.99,
          currencyCode: "USD",
        },
      },
      {
        key: "option-3",
        name: "2M",
        Credits: 2000000,
        price: {
          currentPrice: plan?.isInFreePlanTime
            ? 15.99
            : plan?.type === "Premium"
              ? 7.99
              : plan?.type === "Pro"
                ? 11.99
                : plan?.type === "Basic"
                  ? 14.39
                  : 15.99,
          comparedPrice: 15.99,
          currencyCode: "USD",
        },
      },
      {
        key: "option-4",
        name: "3M",
        Credits: 3000000,
        price: {
          currentPrice: plan?.isInFreePlanTime
            ? 23.99
            : plan?.type === "Premium"
              ? 11.99
              : plan?.type === "Pro"
                ? 17.99
                : plan?.type === "Basic"
                  ? 21.79
                  : 23.99,
          comparedPrice: 23.99,
          currencyCode: "USD",
        },
      },
      {
        key: "option-5",
        name: "5M",
        Credits: 5000000,
        price: {
          currentPrice: plan?.isInFreePlanTime
            ? 39.99
            : plan?.type === "Premium"
              ? 19.99
              : plan?.type === "Pro"
                ? 29.99
                : plan?.type === "Basic"
                  ? 35.99
                  : 39.99,
          comparedPrice: 39.99,
          currencyCode: "USD",
        },
      },
      {
        key: "option-6",
        name: "10M",
        Credits: 10000000,
        price: {
          currentPrice: plan?.isInFreePlanTime
            ? 79.99
            : plan?.type === "Premium"
              ? 39.99
              : plan?.type === "Pro"
                ? 59.99
                : plan?.type === "Basic"
                  ? 71.99
                  : 79.99,
          comparedPrice: 79.99,
          currencyCode: "USD",
        },
      },
      {
        key: "option-7",
        name: "20M",
        Credits: 20000000,
        price: {
          currentPrice: plan?.isInFreePlanTime
            ? 159.99
            : plan?.type === "Premium"
              ? 79.99
              : plan?.type === "Pro"
                ? 119.99
                : plan?.type === "Basic"
                  ? 143.99
                  : 159.99,
          comparedPrice: 159.99,
          currencyCode: "USD",
        },
      },
      {
        key: "option-8",
        name: "30M",
        Credits: 30000000,
        price: {
          currentPrice: plan?.isInFreePlanTime
            ? 239.99
            : plan?.type === "Premium"
              ? 119.99
              : plan?.type === "Pro"
                ? 179.99
                : plan?.type === "Basic"
                  ? 215.99
                  : 239.99,
          comparedPrice: 239.99,
          currencyCode: "USD",
        },
      },
    ],
    [plan],
  );

  const selectedOption = useMemo(() => {
    return options.find((item) => item.key == selectedKey) || options[0];
  }, [selectedKey, options]);

  useEffect(() => {
    if (payFetcher.data) {
      if (payFetcher.data.success) {
        const confirmationUrl = payFetcher.data.response.confirmationUrl;
        open(confirmationUrl, "_top");
      } else {
        setBuyButtonLoading(false);
      }
    }
  }, [payFetcher.data]);

  const onClick = () => {
    setBuyButtonLoading(true);
    const payInfo = {
      name: selectedOption?.name,
      price: {
        amount: selectedOption?.price.currentPrice,
        currencyCode: selectedOption?.price.currencyCode,
      },
    };
    const formData = new FormData();
    formData.append("payInfo", JSON.stringify(payInfo));
    payFetcher.submit(formData, {
      method: "post",
      action: "/app/pricing",
    });
    reportClick("dashboard_translation_task_buy");
  };

  const onCancel = () => {
    setVisible(false);
    // if (recommendOption) setSelectedOption(recommendOption);
  };

  if (isV4) {
    return (
      <Modal
        open={visible}
        onCancel={onCancel}
        width={960}
        footer={null}
        styles={{
          content: {
            padding: 0,
            overflow: "hidden",
            borderRadius: 20,
            border: `1px solid ${v4Colors.cardBorder}`,
            background: v4Colors.cardBg,
            boxShadow: "var(--app-shadow-card-strong)",
          },
          body: {
            padding: 0,
          },
        }}
      >
        <div style={{ padding: "24px 24px 20px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 16,
              flexWrap: "wrap",
              paddingBottom: 20,
              marginBottom: 20,
              borderBottom: `1px solid ${v4Colors.divider}`,
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <Text
                strong
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "4px 10px",
                  borderRadius: 999,
                  background: v4Colors.primarySoft,
                  color: v4Colors.primary,
                  fontSize: 12,
                  lineHeight: "20px",
                  marginBottom: 12,
                }}
              >
                {t("Translation credits")}
              </Text>
              <Title level={3} style={{ margin: 0, lineHeight: 1.25, color: v4Colors.text }}>
                {t("Not enough translation credits. Purchase more to continue")}
              </Title>
              <Text
                style={{
                  display: "block",
                  marginTop: 12,
                  color: v4Colors.textMuted,
                  fontSize: 14,
                  lineHeight: "22px",
                  maxWidth: 560,
                }}
              >
                {t("Choose a credit pack to keep the current task queue moving without leaving the page.")}
              </Text>
            </div>

            <div
              style={{
                ...v4CardStyle,
                background: v4Colors.summaryBg,
                borderRadius: 16,
                padding: "16px 18px",
                minWidth: 220,
                flex: "0 0 auto",
              }}
            >
              <Text
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: v4Colors.textMuted,
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {t("Selected pack")}
              </Text>
              <Text
                strong
                style={{
                  display: "block",
                  fontSize: 22,
                  lineHeight: 1.1,
                  color: v4Colors.text,
                  marginBottom: 6,
                }}
              >
                {selectedOption?.name ?? "500K"}
              </Text>
              <Text style={{ display: "block", color: v4Colors.textMuted, marginBottom: 12 }}>
                {Number(selectedOption?.Credits ?? 0).toLocaleString()} {t("credits")}
              </Text>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <Text strong style={{ fontSize: 24, lineHeight: 1, color: v4Colors.text }}>
                  ${selectedOption?.price.currentPrice ?? 0}
                </Text>
                <Text style={{ color: v4Colors.textMuted }}>{t("one-time")}</Text>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
              marginBottom: 20,
            }}
          >
            {options.map((option) => (
              <PaymentOptionSelect
                key={option.key}
                option={option}
                selectedOption={selectedOption}
                onChange={(value) => setSelectedKey(value.key)}
                variant="v4"
              />
            ))}
          </div>

          <div
            style={{
              ...v4CardStyle,
              background: v4Colors.cardSubdued,
              borderRadius: 16,
              padding: "16px 18px",
              marginBottom: 20,
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div>
              <Text
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: v4Colors.textMuted,
                  marginBottom: 6,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {t("Need help deciding?")}
              </Text>
              <Text style={{ color: v4Colors.textMuted, lineHeight: "22px" }}>
                {t("Contact support if you need help estimating the right credit pack.")}
              </Text>
            </div>
            <Button
              type="default"
              onClick={handleContactSupport}
              style={{
                borderColor: v4Colors.cardBorder,
                color: v4Colors.text,
              }}
            >
              {t("Contact support")}
            </Button>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <Button
              onClick={onCancel}
              style={{
                minWidth: 108,
                borderColor: v4Colors.cardBorder,
              }}
            >
              {t("Maybe later")}
            </Button>
            <Button
              type="primary"
              onClick={onClick}
              disabled={buyButtonLoading || !selectedKey}
              loading={buyButtonLoading}
              style={{
                minWidth: 160,
                height: "auto",
                paddingBlock: 8,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  lineHeight: 1.25,
                }}
              >
                <Text strong style={{ color: "inherit" }}>
                  ${selectedOption?.price.currentPrice ?? 0}
                </Text>
                <Text style={{ color: "inherit" }}>
                  {t("Buy now")}
                </Text>
              </div>
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={visible}
      onCancel={onCancel}
      width={1000}
      footer={[
        <div
          key="footer-container"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div key="support-section">
            <Text strong key="cost-question">
              {t("Cost questions: ")}
            </Text>
            <Button
              key="contact-support"
              type="link"
              onClick={handleContactSupport}
              style={{ marginLeft: "-15px" }}
            >
              {t("Contact support")}
            </Button>
          </div>
          <Button
            key="buy-now"
            type="primary"
            onClick={onClick}
            disabled={buyButtonLoading || !selectedKey}
            loading={buyButtonLoading}
            style={{
              height: "auto",
              paddingTop: "4px",
              paddingBottom: "4px",
            }}
          >
            <div
              key="button-content"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Text key="price" strong style={{ color: "inherit" }}>
                ${selectedOption?.price.currentPrice ?? 0}
              </Text>
              <Text key="buy-text" style={{ color: "inherit" }}>
                {t("Buy now")}
              </Text>
            </div>
          </Button>
        </div>,
      ]}
    >
      <Title level={4} style={{ textAlign: "center", marginTop: "20px" }}>
        {t("Not enough translation credits. Purchase more to continue")}
      </Title>
      {/* <Card>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <Title level={5}>{t("Translation tasks")}</Title>
          <Title level={5} style={{ marginTop: "0px" }}>{t("Credits to be consumed")}</Title>
        </div>
        <Divider style={{ margin: "10px 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <Text strong>{t("Estimated number of words to translate: ")}</Text>
            {credits === undefined ? <Text strong>{t("Calculating...")}</Text> : credits >= 0 ? <Text strong>{credits.toLocaleString()} {t("words")}</Text> : <Text strong>{t("Calculation failed")}</Text>}
          </div>
          {credits === undefined ? <Text strong>{t("Calculating...")}</Text> : credits >= 0 ? <Text strong>{credits.toLocaleString()}</Text> : <Text strong>{t("Calculation failed")}</Text>}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <Text strong>{t("Translate files: ")}</Text>
            <Text strong>{source.toUpperCase()} {t("translate to")} {target.toUpperCase()}</Text>
          </div>
          <Text strong>*{multiple1}</Text>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <Text strong>{t("Translate modal: ")}</Text>
            <Text strong>{model.label}</Text>
          </div>
          <Text strong>*{multiple2}</Text>
        </div>
        <Divider style={{ margin: "10px 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <Text strong>{t("Total: ")}</Text>
          </div>
          <Text strong> {credits === undefined ? <Text strong>{t("Calculating...")}</Text> : credits >= 0 ? <Text strong>{Number((credits * multiple1 * multiple2).toFixed(0)).toLocaleString()}</Text> : <Text strong>{t("Calculation failed")}</Text>}</Text>
        </div>
      </Card> */}

      <Divider />
      <Title level={5}>{t("Buy credits")}</Title>
      <div className="options_wrapper">
        <Space direction="vertical">
          <div
            style={{
              display: "flex",
              flexWrap: "wrap", // 允许自动换行
              gap: "16px",
              width: "100%",
            }}
          >
            {options.map((option: any) => (
              <div
                key={option.name}
                style={{
                  flex: "0 1 auto", // 允许缩小但不放大
                  // minWidth: '200px',  // 设置最小宽度
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <PaymentOptionSelect
                  option={option}
                  selectedOption={selectedOption}
                  onChange={(e) => setSelectedKey(e.key)}
                />
              </div>
            ))}
          </div>
        </Space>
      </div>
      <Divider />
      <div className="total_payment">
        <Text style={{ marginRight: "5px" }}>{t("Total Payment:")}</Text>
        <Text strong>
          $
          {selectedOption?.price.currentPrice
            ? selectedOption?.price.currentPrice
            : 0}
        </Text>
      </div>
    </Modal>
  );
};

export default PaymentModal;
