import type { CSSProperties } from "react";
import { Spin } from "antd";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useTranslation } from "react-i18next";
import Button from "~/ui/components/AppButton";
import AppStatusBadge from "~/ui/components/AppStatusBadge";
import { LocaleSelect } from "~/components/LocaleSelect";

export type TrialProductOption = {
  id: string;
  title: string;
  imageUrl: string | null;
};

/** 试译目标语言在店铺中的状态。 */
export type TrialLocaleStatus =
  | "published"
  | "unpublished"
  | "missing"
  | "primary";

export type TrialLocaleOption = {
  value: string;
  label: string;
  status: TrialLocaleStatus;
};

type Props = {
  selectedProduct: TrialProductOption | null;
  onProductChange: (product: TrialProductOption | null) => void;
  localeOptions: TrialLocaleOption[];
  target: string | null;
  onTargetChange: (v: string) => void;
  statusLabel: string | null;
  statusTone: "neutral" | "info" | "success" | "caution" | "critical";
  starting: boolean;
  preparingLocale: boolean;
  startDisabled: boolean;
  onStart: () => void;
  /** 外层已有标题时隐藏本卡标题区，仅保留表单。 */
  compactHeader?: boolean;
};

const cardStyle: CSSProperties = {
  background: "var(--p-color-bg-surface)",
  border: "1px solid var(--app-color-border-secondary)",
  borderRadius: 12,
  padding: 20,
};

const rowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 16,
  alignItems: "flex-end",
};

/** 商品区可收缩；语言 Select 需要固定最小宽度，否则嵌入 Admin 会被挤扁。 */
const productFieldStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  flex: "1 1 240px",
  minWidth: 0,
};

const localeFieldStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  flex: "0 1 300px",
  width: 300,
  minWidth: 260,
  maxWidth: "100%",
};

const labelStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "var(--app-color-text)",
};

const productPickStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  minHeight: 36,
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid var(--app-color-border-secondary)",
  background: "var(--p-color-bg-surface)",
  minWidth: 0,
};

function pickImageUrl(product: {
  images?: Array<{ originalSrc?: string; url?: string }>;
  featuredImage?: { url?: string; originalSrc?: string } | null;
}): string | null {
  const featured =
    product.featuredImage?.url || product.featuredImage?.originalSrc;
  if (featured) return featured;
  const first = product.images?.[0];
  return first?.originalSrc || first?.url || null;
}

export function TrialCreateCard({
  selectedProduct,
  onProductChange,
  localeOptions,
  target,
  onTargetChange,
  statusLabel,
  statusTone,
  starting,
  preparingLocale,
  startDisabled,
  onStart,
  compactHeader = false,
}: Props) {
  const { t } = useTranslation();
  const shopify = useAppBridge();
  const selected = localeOptions.find((o) => o.value === target) ?? null;
  const needsStorefrontSetup =
    selected?.status === "missing" || selected?.status === "unpublished";
  const busy = starting || preparingLocale;

  const shellStyle: CSSProperties = compactHeader
    ? { display: "flex", flexDirection: "column", gap: 12, width: "100%" }
    : { ...cardStyle, width: "100%" };

  const openProductPicker = async () => {
    try {
      // 不传 selectionIds：单选 picker 预选会占满 1/1，导致其它行被置灰无法选择。
      // 当前选择已在卡片上方展示，无需再在 picker 内高亮。
      const selection = await shopify.resourcePicker({
        type: "product",
        action: "select",
        multiple: false,
        filter: { variants: false },
      });
      if (!selection || selection.length === 0) return;
      const product = selection[0] as {
        id: string;
        title?: string;
        images?: Array<{ originalSrc?: string; url?: string }>;
        featuredImage?: { url?: string; originalSrc?: string } | null;
      };
      onProductChange({
        id: product.id,
        title: product.title?.trim() || product.id,
        imageUrl: pickImageUrl(product),
      });
    } catch {
      // 用户取消选择时 App Bridge 可能 reject，忽略即可
    }
  };

  return (
    <div style={shellStyle}>
      {!compactHeader ? (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 650,
                color: "var(--app-color-text)",
              }}
            >
              {t("trial.title")}
            </h2>
            <p
              style={{
                margin: "6px 0 0",
                color: "var(--app-color-text-secondary)",
                fontSize: 13,
                lineHeight: "20px",
              }}
            >
              {t("trial.description")}
            </p>
          </div>
          {statusLabel ? (
            <AppStatusBadge tone={statusTone}>{statusLabel}</AppStatusBadge>
          ) : null}
        </div>
      ) : statusLabel ? (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <AppStatusBadge tone={statusTone}>{statusLabel}</AppStatusBadge>
        </div>
      ) : null}

      <div style={rowStyle}>
        <div style={productFieldStyle}>
          <span style={labelStyle}>{t("trial.product")}</span>
          <div style={productPickStyle}>
            {selectedProduct?.imageUrl ? (
              <img
                src={selectedProduct.imageUrl}
                alt=""
                width={28}
                height={28}
                style={{
                  objectFit: "cover",
                  borderRadius: 4,
                  flexShrink: 0,
                  border: "1px solid var(--app-color-border-secondary)",
                }}
              />
            ) : (
              <div
                style={{
                  width: 28,
                  height: 28,
                  flexShrink: 0,
                  borderRadius: 4,
                  background: "var(--p-color-bg-surface-secondary)",
                }}
              />
            )}
            <span
              style={{
                flex: 1,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontSize: 13,
                color: selectedProduct
                  ? "var(--app-color-text)"
                  : "var(--app-color-text-secondary)",
              }}
            >
              {selectedProduct?.title || t("trial.selectProduct")}
            </span>
            <Button size="small" onClick={() => void openProductPicker()}>
              {selectedProduct
                ? t("trial.changeProduct")
                : t("trial.browseProducts")}
            </Button>
            {selectedProduct ? (
              <Button
                size="small"
                type="link"
                onClick={() => onProductChange(null)}
              >
                {t("trial.clearProduct")}
              </Button>
            ) : null}
          </div>
        </div>

        <div style={localeFieldStyle}>
          <span style={labelStyle}>{t("trial.targetLanguage")}</span>
          <LocaleSelect
            options={localeOptions}
            value={target}
            onChange={onTargetChange}
            placeholder={t("trial.selectTarget")}
          />
        </div>

        <div style={{ flex: "0 0 auto", paddingBottom: 1 }}>
          <Button
            type="primary"
            loading={busy}
            disabled={startDisabled}
            onClick={onStart}
          >
            {t("trial.start")}
          </Button>
        </div>
      </div>

      {preparingLocale ? (
        <p
          style={{
            margin: "12px 0 0",
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "var(--p-color-text-info)",
            fontSize: 13,
            lineHeight: "20px",
          }}
        >
          <Spin size="small" />
          {t("trial.preparingLocaleHint", {
            language: selected?.label ?? "",
          })}
        </p>
      ) : needsStorefrontSetup ? (
        <p
          style={{
            margin: "12px 0 0",
            color: "var(--app-color-text-secondary)",
            fontSize: 13,
            lineHeight: "20px",
          }}
        >
          {selected?.status === "missing"
            ? t("trial.localeMissingHint", { language: selected.label })
            : t("trial.localeUnpublishedHint", {
                language: selected?.label ?? "",
              })}
        </p>
      ) : null}
    </div>
  );
}
