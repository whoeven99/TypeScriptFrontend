import {
  Button as PolarisButton,
  InlineStack,
  Link as PolarisLink,
  Text as PolarisText,
} from "@shopify/polaris";
import { useEffect, useMemo, useState } from "react";
import PaymentOptionSelect from "./paymentOptionSelect";
import { useFetcher } from "@remix-run/react";
import { useTranslation } from "react-i18next";
import { handleContactSupport } from "~/utils/supportChat";
import { useSelector } from "react-redux";
import useReport from "../../scripts/eventReport";
import "./styles.css";
import { v4Colors } from "~/routes/app.translate-v4/v4Styles";
import { V4ModalShell } from "~/components/V4ModalShell";
import { LegacyPaymentModal } from "./LegacyPaymentModal";
import type { OptionType } from "./paymentModal.shared";

interface PaymentModalProps {
  visible: boolean;
  setVisible: (visible: boolean) => void;
  variant?: "default" | "v4";
}
const PaymentModal: React.FC<PaymentModalProps> = ({ visible, setVisible, variant = "default" }) => {
  const [selectedKey, setSelectedKey] = useState<string>("option-1");
  const [buyButtonLoading, setBuyButtonLoading] = useState<boolean>(false);
  const { t } = useTranslation();
  const payFetcher = useFetcher<any>();
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
      <V4ModalShell open={visible} onClose={onCancel} width={960}>
        <div style={{ padding: "24px 24px 20px" }}>
          <div
            style={{
              paddingBottom: 20,
              marginBottom: 20,
              borderBottom: `1px solid ${v4Colors.divider}`,
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <PolarisText as="h2" variant="headingLg" fontWeight="bold">
                {t("Buy credits")}
              </PolarisText>
              <div
                style={{
                  marginTop: 10,
                  maxWidth: 480,
                }}
              >
                <PolarisText as="p" variant="bodyMd" tone="subdued">
                  {t("Choose a pack for this task.")}
                </PolarisText>
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
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <InlineStack gap="100" align="center">
              <PolarisText as="span" variant="bodyMd" tone="subdued">
                {t("Need help?")}
              </PolarisText>
              <PolarisLink
                onClick={handleContactSupport}
              >
                {t("Contact us")}
              </PolarisLink>
            </InlineStack>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div style={{ minWidth: 124 }}>
                <PolarisButton fullWidth size="large" variant="secondary" onClick={onCancel}>
                  {t("Maybe later")}
                </PolarisButton>
              </div>
              <div style={{ minWidth: 180 }}>
                <PolarisButton
                  fullWidth
                  size="large"
                  variant="primary"
                  onClick={onClick}
                  disabled={buyButtonLoading || !selectedKey}
                  loading={buyButtonLoading}
                >
                  {t("Buy now")} · ${selectedOption?.price.currentPrice ?? 0}
                </PolarisButton>
              </div>
            </div>
          </div>
        </div>
      </V4ModalShell>
    );
  }

  return (
    <LegacyPaymentModal
      visible={visible}
      onCancel={onCancel}
      options={options}
      selectedKey={selectedKey}
      selectedOption={selectedOption}
      buyButtonLoading={buyButtonLoading}
      onSelectOption={(option) => setSelectedKey(option.key)}
      onBuy={onClick}
    />
  );
};

export default PaymentModal;
export type { OptionType } from "./paymentModal.shared";
