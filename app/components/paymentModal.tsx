import {
  Button as PolarisButton,
  InlineStack,
  Link as PolarisLink,
  Select as PolarisSelect,
  Text as PolarisText,
} from "@shopify/polaris";
import { useEffect, useMemo, useState } from "react";
import { useFetcher } from "@remix-run/react";
import { useTranslation } from "react-i18next";
import { handleContactSupport } from "~/utils/supportChat";
import { useSelector } from "react-redux";
import useReport from "../../scripts/eventReport";
import "./styles.css";
import { v4Colors } from "~/routes/app.translate-v4/v4Styles";
import { V4ModalShell } from "~/components/V4ModalShell";
import { buildPaymentOptions, type OptionType } from "./paymentModal.shared";

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
  void variant;

  const options: OptionType[] = useMemo(() => buildPaymentOptions(plan), [plan]);

  const selectedOption = useMemo(() => {
    return options.find((item) => item.key == selectedKey) || options[0];
  }, [selectedKey, options]);

  const selectOptions = useMemo(
    () =>
      options.map((option) => ({
        label: `${option.name} · ${Number(option.Credits).toLocaleString()} ${t("credits")}`,
        value: option.key,
      })),
    [options, t],
  );

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

  return (
    <V4ModalShell open={visible} onClose={onCancel} width={560}>
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
              }}
            >
              <PolarisText as="p" variant="bodyMd" tone="subdued">
                {t("Choose a pack for this task.")}
              </PolarisText>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <PolarisSelect
            label={t("Credit pack")}
            labelHidden
            options={selectOptions}
            value={selectedKey}
            onChange={setSelectedKey}
          />
          <div
            style={{
              marginTop: 14,
              padding: "14px 16px",
              borderRadius: 14,
              border: `1px solid ${v4Colors.cardBorder}`,
              background: v4Colors.cardBg,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <PolarisText as="p" variant="bodySm" tone="subdued">
                  {t("Credits")}
                </PolarisText>
                <div style={{ marginTop: 4 }}>
                  <PolarisText as="p" variant="headingMd" fontWeight="bold">
                    {selectedOption?.name}
                  </PolarisText>
                </div>
                <div style={{ marginTop: 4 }}>
                  <PolarisText as="p" variant="bodyMd" tone="subdued">
                    {Number(selectedOption?.Credits ?? 0).toLocaleString()} {t("credits")}
                  </PolarisText>
                </div>
              </div>
              <div style={{ minWidth: 0, textAlign: "right" }}>
                <PolarisText as="p" variant="bodySm" tone="subdued">
                  {t("Total Payment:")}
                </PolarisText>
                <div style={{ marginTop: 4 }}>
                  <PolarisText as="p" variant="headingMd" fontWeight="bold">
                    ${selectedOption?.price.currentPrice.toFixed(2) ?? "0.00"}
                  </PolarisText>
                </div>
              </div>
            </div>
          </div>
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
            <PolarisLink onClick={handleContactSupport}>{t("Contact us")}</PolarisLink>
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
};

export default PaymentModal;
export type { OptionType } from "./paymentModal.shared";
