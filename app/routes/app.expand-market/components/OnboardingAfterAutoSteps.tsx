import { Link } from "@remix-run/react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  formatExpandCredits,
  type CreditPackOffer,
  type OnboardingUpgradeOffer,
} from "~/lib/expandMarket";
import AppButton from "~/ui/components/AppButton";

type Props = {
  language: string;
  storefrontHomeUrl: string | null;
  offer: OnboardingUpgradeOffer;
  remainingCredits: number;
  /** 剩余额度折算的可翻译商品数（说人话）；null 表示无法折算。 */
  remainingProducts?: number | null;
  /** 已完成店面验收（试译时打开过 / 曾在本页验收）：省去再次引导切换器。 */
  storefrontPreviewed?: boolean;
  buyingPack: boolean;
  translatingFullStore: boolean;
  onOpenStorefront: () => void;
  /** 点击「检查切换器」时标记店面验收（新手漏斗第 4 步）。 */
  onSwitcherClick?: () => void;
  onBuyFullStorePack: () => void;
  onTranslateFullStore: () => void;
  onPickAnotherLocale: () => void;
};

function PrimaryCard({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 10,
        border: "1px solid rgba(84, 103, 255, 0.22)",
        background: "var(--p-color-bg-surface)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div
        style={{
          fontSize: 15,
          fontWeight: 650,
          color: "var(--app-color-text)",
        }}
      >
        {title}
      </div>
      {action}
    </div>
  );
}

function SecondaryRow({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 10,
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 0",
        borderBottom: "1px solid var(--app-color-border-secondary)",
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "var(--app-color-text-secondary)",
        }}
      >
        {title}
      </div>
      {action}
    </div>
  );
}

/**
 * 订阅 + 自动更新之后：主推店面验收，其余路径收为次要选项。
 */
export function OnboardingAfterAutoSteps({
  language,
  storefrontHomeUrl,
  offer,
  remainingCredits,
  remainingProducts,
  storefrontPreviewed,
  buyingPack,
  translatingFullStore,
  onOpenStorefront,
  onSwitcherClick,
  onBuyFullStorePack,
  onTranslateFullStore,
  onPickAnotherLocale,
}: Props) {
  const { t } = useTranslation();
  const fullCredits = offer.fullStoreCredits;
  const fullCreditsLabel = formatExpandCredits(fullCredits);
  const pack: CreditPackOffer | null = offer.recommendedFullStorePack;
  const needsPurchase = fullCredits > 0 && remainingCredits < fullCredits;
  const busy = buyingPack || translatingFullStore;
  const hasProducts =
    typeof remainingProducts === "number" && remainingProducts > 0;

  return (
    <div
      style={{
        marginTop: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* 服务已生效的状态确认：让商家清楚「自动更新已开、新内容会自动翻译」。 */}
      <div
        style={{
          padding: "10px 14px",
          borderRadius: 10,
          border: "1px solid var(--p-color-border-success)",
          background: "var(--p-color-bg-surface-success)",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 650,
            color: "var(--app-color-text)",
          }}
        >
          {t("expand.afterAutoLiveTitle", { language })}
        </span>
        <span
          style={{
            fontSize: 12,
            color: "var(--app-color-text-secondary)",
          }}
        >
          {hasProducts
            ? t("expand.afterAutoLiveCredits", { count: remainingProducts })
            : t("expand.afterAutoLiveCreditsRaw", {
                credits: formatExpandCredits(remainingCredits),
              })}
        </span>
        <Link to="/app/translate-v4" style={{ marginLeft: "auto" }}>
          <AppButton size="small" type="link">
            {t("expand.afterAutoViewProgress")}
          </AppButton>
        </Link>
      </div>

      <PrimaryCard
        title={
          storefrontPreviewed
            ? t("expand.afterPreviewDoneTitle", { language })
            : t("expand.afterPreviewTitle", { language })
        }
        action={
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {!storefrontPreviewed ? (
              <div
                style={{
                  fontSize: 12,
                  lineHeight: "18px",
                  color: "var(--app-color-text-secondary)",
                }}
              >
                {t("expand.afterPreviewSwitcherNote")}
              </div>
            ) : null}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                alignItems: "center",
              }}
            >
              <AppButton
                type="primary"
                size="small"
                disabled={!storefrontHomeUrl}
                onClick={onOpenStorefront}
              >
                {storefrontPreviewed
                  ? t("expand.afterOpenStoreAgainCta")
                  : t("expand.afterOpenStoreCta")}
              </AppButton>
              {/* 试译时已验收过切换器则不再重复引导。 */}
              {!storefrontPreviewed ? (
                <Link to="/app/switcher" onClick={() => onSwitcherClick?.()}>
                  <AppButton size="small">
                    {t("expand.afterSwitcherCta")}
                  </AppButton>
                </Link>
              ) : null}
            </div>
          </div>
        }
      />

      <div style={{ paddingTop: 4 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 650,
            color: "var(--app-color-text-secondary)",
            marginBottom: 4,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          {t("expand.afterPathsTitle")}
        </div>

        <SecondaryRow
          title={t("expand.afterFullStoreTitle")}
          action={
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                alignItems: "center",
              }}
            >
              {needsPurchase && pack ? (
                <AppButton
                  type="primary"
                  size="small"
                  loading={buyingPack}
                  disabled={busy}
                  onClick={onBuyFullStorePack}
                >
                  {t("expand.nextBuyFullStorePack", {
                    name: pack.packName,
                    credits: formatExpandCredits(pack.credits),
                    price: Number(pack.priceAmount).toFixed(2),
                    currency: pack.currencyCode,
                  })}
                </AppButton>
              ) : null}
              <AppButton
                type={needsPurchase ? "default" : "primary"}
                size="small"
                loading={translatingFullStore}
                disabled={busy || (needsPurchase && !pack)}
                onClick={onTranslateFullStore}
              >
                {t("expand.nextTranslateFullStore", {
                  credits: fullCreditsLabel,
                })}
              </AppButton>
              <Link to="/app/translate-v4">
                <AppButton size="small" type="link">
                  {t("expand.afterPathModulesManual")}
                </AppButton>
              </Link>
            </div>
          }
        />

        <SecondaryRow
          title={t("expand.afterPathLocaleTitle")}
          action={
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                alignItems: "center",
              }}
            >
              <AppButton size="small" onClick={onPickAnotherLocale}>
                {t("expand.afterPathLocaleCta")}
              </AppButton>
              <Link to="/app/language">
                <AppButton size="small" type="link">
                  {t("expand.afterPathLocaleManage")}
                </AppButton>
              </Link>
            </div>
          }
        />

        <SecondaryRow
          title={t("expand.afterPathAdvancedTitle")}
          action={
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                alignItems: "center",
              }}
            >
              <Link to="/app/manage_translation">
                <AppButton size="small" type="link">
                  {t("expand.afterPathAdvancedManage")}
                </AppButton>
              </Link>
              <Link to="/app/glossary">
                <AppButton size="small" type="link">
                  {t("expand.afterPathAdvancedGlossary")}
                </AppButton>
              </Link>
              <Link to="/app/currency">
                <AppButton size="small" type="link">
                  {t("expand.afterPathAdvancedCurrency")}
                </AppButton>
              </Link>
            </div>
          }
        />
      </div>
    </div>
  );
}
