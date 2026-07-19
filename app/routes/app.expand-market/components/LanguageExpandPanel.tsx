import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import {
  formatExpandCredits,
  type OnboardingUpgradeOffer,
  type StarterPackEstimate,
} from "~/lib/expandMarket";
import {
  MiniStageTrack,
  ProgressRing,
  StatusTag,
} from "~/routes/app.translate-v4/components/V4JobCardParts";
import type { MiniStageProgressJob } from "~/routes/app.translate-v4/jobStageUtils";
import AppButton from "~/ui/components/AppButton";
import AppStatusBadge from "~/ui/components/AppStatusBadge";
import { OnboardingNextSteps } from "./OnboardingNextSteps";

export type ExpandJobProgress = MiniStageProgressJob & {
  taskId: string;
  statusLabel: string;
  isActive: boolean;
  progressPercent: number | null;
  stageSummary: string;
  errorMessage: string | null;
  /** 有实际翻译量才算起步包成功；空跑 COMPLETED 为 0。 */
  translateTotal?: number;
  writebackDone?: number;
};

export type LocaleOption = {
  value: string;
  label: string;
  published: boolean;
};

type Props = {
  localeOptions: LocaleOption[];
  selectedLocale: string;
  onLocaleChange: (locale: string) => void;
  translating: boolean;
  buyingPack: boolean;
  onBuyRecommendedPack: () => void;
  onTranslateStarter: () => void;
  starter: StarterPackEstimate | null;
  jobsForLocale: ExpandJobProgress[];
  purchasedReturn: boolean;
  /**
   * 起步包成功后：未订阅推订阅；已订阅（含 returnUrl subscribed=1）只推自动更新。
   */
  upgradeOffer: OnboardingUpgradeOffer | null;
  /** 店铺已有订阅（BillingLog activated 或订阅回跳）。 */
  subscribed: boolean;
  subscribing: boolean;
  enablingAuto: boolean;
  autoEnabled: boolean;
  onSubscribe: () => void;
  onEnableAutoTranslate: () => void;
};

const introGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 12,
  alignItems: "stretch",
} satisfies CSSProperties;

const panelCardStyle = {
  padding: 16,
  borderRadius: 10,
  border: "1px solid var(--app-color-border-secondary)",
  background: "var(--p-color-bg-surface)",
} satisfies CSSProperties;

const eyebrowStyle = {
  margin: 0,
  fontSize: 12,
  lineHeight: "18px",
  fontWeight: 650,
  color: "var(--app-color-text-secondary)",
} satisfies CSSProperties;

const panelTitleStyle = {
  margin: "4px 0 0",
  fontSize: 20,
  lineHeight: "28px",
  fontWeight: 700,
  color: "var(--app-color-text)",
} satisfies CSSProperties;

const bodyTextStyle = {
  margin: "8px 0 0",
  fontSize: 13,
  lineHeight: "20px",
  color: "var(--app-color-text-secondary)",
} satisfies CSSProperties;

const badgeRowStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  alignItems: "center",
  marginTop: 12,
} satisfies CSSProperties;

const inlineMetaStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  alignItems: "center",
  marginTop: 10,
} satisfies CSSProperties;

const outcomeListStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  margin: "12px 0 0",
  padding: 0,
  listStyle: "none",
} satisfies CSSProperties;

const outcomeItemStyle = {
  display: "flex",
  gap: 8,
  alignItems: "flex-start",
  fontSize: 13,
  lineHeight: "20px",
  color: "var(--app-color-text)",
} satisfies CSSProperties;

const dotStyle = {
  width: 7,
  height: 7,
  marginTop: 7,
  borderRadius: 999,
  flexShrink: 0,
  background: "var(--p-color-bg-fill-brand)",
} satisfies CSSProperties;

const starterSectionStyle = {
  padding: "16px 0",
  borderBottom: "1px solid var(--app-color-border-secondary)",
} satisfies CSSProperties;

const estimateGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 10,
} satisfies CSSProperties;

const metricCardStyle = {
  padding: "14px 16px",
  borderRadius: 8,
  border: "1px solid var(--app-color-border-secondary)",
  background: "var(--p-color-bg-surface)",
} satisfies CSSProperties;

const metricLabelStyle = {
  fontSize: 12,
  lineHeight: "18px",
  color: "var(--app-color-text-secondary)",
} satisfies CSSProperties;

const metricValueStyle = {
  marginTop: 4,
  fontSize: 28,
  lineHeight: "34px",
  fontWeight: 700,
  color: "var(--app-color-text)",
} satisfies CSSProperties;

const actionRowStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  alignItems: "center",
} satisfies CSSProperties;

const actionHelpStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 2,
  minWidth: 180,
  fontSize: 12,
  lineHeight: "18px",
  color: "var(--app-color-text-secondary)",
} satisfies CSSProperties;

export function LanguageExpandPanel({
  localeOptions,
  selectedLocale,
  onLocaleChange,
  translating,
  buyingPack,
  onBuyRecommendedPack,
  onTranslateStarter,
  starter,
  jobsForLocale,
  purchasedReturn,
  upgradeOffer,
  subscribed,
  subscribing,
  enablingAuto,
  autoEnabled,
  onSubscribe,
  onEnableAutoTranslate,
}: Props) {
  const { t } = useTranslation();
  const language =
    localeOptions.find((o) => o.value === selectedLocale)?.label ||
    selectedLocale ||
    t("expand.targetLanguage");

  const activeJob = jobsForLocale.find((j) => j.isActive) ?? null;
  const latestJob = activeJob ?? jobsForLocale[0] ?? null;
  const latestTranslateTotal = latestJob?.translateTotal ?? 0;
  /** 空跑 COMPLETED（0 条）不算起步包完成，需重新翻译。 */
  const isEmptyComplete =
    latestJob?.status === "COMPLETED" && latestTranslateTotal <= 0;
  const productsDone =
    latestJob?.status === "COMPLETED" && latestTranslateTotal > 0;
  /** 已有进行中或成功任务时，直接展示任务，不再重复出创建表单。 */
  const hasExistingJob = Boolean(latestJob) && !isEmptyComplete;
  const showCreateForm = !hasExistingJob && !productsDone && Boolean(starter);
  const canTranslate =
    Boolean(starter?.productCount) &&
    !starter?.needsPurchase &&
    !activeJob &&
    !translating &&
    !hasExistingJob;

  /**
   * 店面链接：不拼 /{locale}/ 路径（未开 Markets 子目录会 404），用 Ciwi 的
   * ?ciwi_locale= 切语言。返回纯字符串，交给 <a target="_blank"> 打开。
   * 嵌入式 iframe 里代码触发的 window.open 常被拦截（点了没反应），
   * 用真正的锚点由用户手势打开最稳。
   */
  const localizedHref = (url: string | null, locale: string): string | null => {
    if (!url) return null;
    try {
      const u = new URL(url);
      const loc = locale.trim();
      if (loc) u.searchParams.set("ciwi_locale", loc);
      return u.toString();
    } catch {
      return url;
    }
  };

  const pack = starter?.recommendedPack ?? null;
  const estimateCreditsLabel = formatExpandCredits(
    starter?.estimatedCredits ?? 0,
  );
  const remainingLabel = formatExpandCredits(starter?.remainingCredits ?? 0);
  const packCreditsLabel = pack ? formatExpandCredits(pack.credits) : "";
  const packPriceLabel = pack
    ? Number(pack.priceAmount).toFixed(2)
    : "";

  /** 额度说人话：把 credits 折算成「约可翻译几个商品」。 */
  const starterProductCount = starter?.n ?? 0;
  const perProductCredits =
    starterProductCount > 0 && (starter?.estimatedCredits ?? 0) > 0
      ? (starter?.estimatedCredits ?? 0) / starterProductCount
      : 0;
  const remainingProducts =
    perProductCredits > 0
      ? Math.floor((starter?.remainingCredits ?? 0) / perProductCredits)
      : null;

  const selectedOption =
    localeOptions.find((o) => o.value === selectedLocale) ?? null;

  const outcomePoints = [
    t("expand.starterOutcome1"),
    t("expand.starterOutcome2"),
    t("expand.starterOutcome3"),
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={introGridStyle}>
        <div style={panelCardStyle}>
          <p style={eyebrowStyle}>{t("expand.starterEyebrow")}</p>
          <h2 style={panelTitleStyle}>
            {t("expand.starterHeroTitle", { language })}
          </h2>
          <p style={bodyTextStyle}>
            {t("expand.starterHeroBody", { language })}
          </p>
          <div style={badgeRowStyle}>
            <AppStatusBadge tone="info">
              {t("expand.starterBadgeSameLanguage")}
            </AppStatusBadge>
            {selectedOption ? (
              <AppStatusBadge
                tone={selectedOption.published ? "success" : "caution"}
              >
                {selectedOption.published
                  ? t("localeSelect.status.published")
                  : t("localeSelect.status.missing")}
              </AppStatusBadge>
            ) : null}
            <AppStatusBadge tone="neutral">
              {t("expand.starterBadgeProductModule")}
            </AppStatusBadge>
            <AppStatusBadge tone="success">
              {t("expand.starterBadgePack")}
            </AppStatusBadge>
          </div>
        </div>

        <aside style={panelCardStyle}>
          <p style={eyebrowStyle}>{t("expand.starterOutcomeLabel")}</p>
          <h3
            style={{
              ...panelTitleStyle,
              fontSize: 16,
              lineHeight: "24px",
            }}
          >
            {t("expand.starterOutcomeTitle")}
          </h3>
          <ul style={outcomeListStyle}>
            {outcomePoints.map((point) => (
              <li key={point} style={outcomeItemStyle}>
                <span aria-hidden style={dotStyle} />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      {selectedLocale ? (
        <div style={starterSectionStyle}>
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 700,
                lineHeight: "24px",
                color: "var(--app-color-text)",
              }}
            >
              {t("expand.step2Title", {
                language,
                count: starter?.n ?? 0,
              })}
              {productsDone ? (
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--p-color-text-success)",
                  }}
                >
                  ✓
                </span>
              ) : null}
            </h2>
            <div style={inlineMetaStyle}>
              <AppStatusBadge tone="info">
                {t("expand.starterLanguageMeta", { language })}
              </AppStatusBadge>
              {selectedOption ? (
                <AppStatusBadge
                  tone={selectedOption.published ? "success" : "caution"}
                >
                  {selectedOption.published
                    ? t("localeSelect.status.published")
                    : t("localeSelect.status.missing")}
                </AppStatusBadge>
              ) : null}
            </div>
            {productsDone || isEmptyComplete || activeJob ? (
              <p style={bodyTextStyle}>
                {productsDone
                  ? t("expand.step2Done", {
                      language,
                      count: starter?.n ?? 0,
                    })
                  : isEmptyComplete
                    ? t("expand.step2EmptyComplete", { language })
                    : t("expand.step2Progress")}
              </p>
            ) : null}
          </div>

          {(showCreateForm || isEmptyComplete) && starter ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  marginTop: 12,
                }}
              >
                <div
                  style={{
                    padding: 14,
                    borderRadius: 10,
                    border: "1px solid var(--app-color-border-secondary)",
                    background: "var(--p-color-bg-surface-secondary)",
                  }}
                >
                  <div style={estimateGridStyle}>
                    <div style={metricCardStyle}>
                      <div style={metricLabelStyle}>
                        {t("expand.estimateStarterLabel")}
                      </div>
                      <div style={metricValueStyle}>
                        {t("expand.estimateProductsValue", {
                          count: starterProductCount,
                        })}
                      </div>
                      <div
                        style={{
                          marginTop: 2,
                          fontSize: 12,
                          color: "var(--app-color-text-tertiary)",
                        }}
                      >
                        {t("expand.estimateCreditsSub", {
                          credits: estimateCreditsLabel,
                        })}
                      </div>
                    </div>
                    <div style={metricCardStyle}>
                      <div style={metricLabelStyle}>
                        {t("expand.estimateRemainingLabel")}
                      </div>
                      <div
                        style={{
                          ...metricValueStyle,
                          color: starter.needsPurchase
                            ? "var(--app-color-text)"
                            : "var(--p-color-text-success)",
                        }}
                      >
                        {remainingProducts != null
                          ? t("expand.estimateRemainingProducts", {
                              count: remainingProducts,
                            })
                          : remainingLabel}
                      </div>
                      <div
                        style={{
                          marginTop: 2,
                          fontSize: 12,
                          color: "var(--app-color-text-tertiary)",
                        }}
                      >
                        {t("expand.estimateCreditsSub", {
                          credits: remainingLabel,
                        })}
                      </div>
                    </div>
                  </div>
                  {starter.needsPurchase ? (
                    <div
                      style={{
                        marginTop: 10,
                        fontSize: 13,
                        lineHeight: "20px",
                        color: "var(--app-color-text-secondary)",
                      }}
                    >
                      {pack
                        ? t("expand.needsPurchaseHintWithPack", {
                            credits: packCreditsLabel,
                            price: packPriceLabel,
                            currency: pack.currencyCode,
                          })
                        : t("expand.needsPurchaseHint")}
                    </div>
                  ) : null}
                </div>

                {purchasedReturn ? (
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--p-color-text-success)",
                    }}
                  >
                    {t("expand.purchaseReturned")}
                  </div>
                ) : null}

                <div style={actionRowStyle}>
                  {pack && starter.needsPurchase ? (
                    <AppButton
                      type="primary"
                      size="large"
                      loading={buyingPack}
                      disabled={buyingPack}
                      onClick={onBuyRecommendedPack}
                    >
                      {t("expand.buyPackCta", {
                        credits: packCreditsLabel,
                        price: packPriceLabel,
                        currency: pack.currencyCode,
                      })}
                    </AppButton>
                  ) : null}
                  {pack && starter.needsPurchase ? (
                    <span style={actionHelpStyle}>
                      <strong style={{ color: "var(--app-color-text)" }}>
                        {t("expand.buyPackPermanentNote")}
                      </strong>
                      <span>{t("expand.buyThenTranslateHint")}</span>
                    </span>
                  ) : null}
                  <AppButton
                    type={starter.needsPurchase ? "default" : "primary"}
                    size={starter.needsPurchase ? "middle" : "large"}
                    loading={translating}
                    disabled={!canTranslate}
                    onClick={onTranslateStarter}
                  >
                    {activeJob
                      ? t("expand.translateInProgress")
                      : t("expand.translateStarterWithCost", {
                          count: starter.n,
                          credits: estimateCreditsLabel,
                        })}
                  </AppButton>
                </div>
              </div>
            ) : null}
        </div>
      ) : (
        <div
          style={{
            padding: "12px 0",
            fontSize: 13,
            color: "var(--app-color-text-secondary)",
          }}
        >
          {t("expand.selectTargetHint")}
        </div>
      )}

      {latestJob ? (
        <div
          style={{
            marginTop: 12,
            padding: 14,
            borderRadius: 10,
            border: "1px solid var(--app-color-border-secondary)",
            background: "var(--p-color-bg-surface-secondary)",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
            }}
          >
            <ProgressRing
              percent={Math.round(isEmptyComplete ? 0 : latestJob.progressPercent ?? 0)}
              size="sm"
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                  marginBottom: 10,
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 650 }}>
                  {t("expand.jobProgress")}
                </span>
                {isEmptyComplete ? (
                  <AppStatusBadge tone="caution">
                    {t("expand.status.EMPTY_COMPLETE")}
                  </AppStatusBadge>
                ) : (
                  <StatusTag
                    status={latestJob.status}
                    label={t(`expand.status.${latestJob.status}`, {
                      defaultValue: latestJob.statusLabel,
                    })}
                  />
                )}
              </div>
              {isEmptyComplete ? null : <MiniStageTrack job={latestJob} />}
              <div
                style={{
                  fontSize: 12,
                  color: "var(--app-color-text-secondary)",
                  marginTop: 8,
                  lineHeight: "18px",
                }}
              >
                {isEmptyComplete
                  ? t("expand.emptyCompleteHint")
                  : latestJob.stageSummary}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {productsDone && starter?.products.length ? (
        <div style={{ marginTop: 12 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 650,
              marginBottom: 8,
              color: "var(--app-color-text)",
            }}
          >
            {t("expand.previewProductsTitle", { language })}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: 8,
            }}
          >
            {starter.products.map((p) => {
              const href = localizedHref(
                p.onlineStorePreviewUrl ?? p.onlineStoreUrl,
                selectedLocale,
              );
              return (
                <a
                  key={p.id}
                  href={href ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-disabled={!href}
                  onClick={(e) => {
                    if (!href) e.preventDefault();
                  }}
                  style={{
                    textAlign: "left",
                    textDecoration: "none",
                    color: "inherit",
                    cursor: href ? "pointer" : "default",
                    opacity: href ? 1 : 0.55,
                    padding: 8,
                    borderRadius: 8,
                    border: "1px solid var(--app-color-border-secondary)",
                    background: "var(--p-color-bg-surface)",
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  {p.imageUrl ? (
                    <img
                      src={p.imageUrl}
                      alt=""
                      width={36}
                      height={36}
                      style={{
                        objectFit: "cover",
                        borderRadius: 6,
                        border: "1px solid var(--app-color-border-secondary)",
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 6,
                        background: "var(--p-color-bg-surface-secondary)",
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <div
                    style={{
                      minWidth: 0,
                      fontSize: 13,
                      fontWeight: 600,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.title}
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* 起步包真正成功后再推下一步（未订→订阅；已订→自动更新；开 auto 后跳转就绪页） */}
      {productsDone && upgradeOffer && !autoEnabled ? (
        <OnboardingNextSteps
          language={language}
          offer={upgradeOffer}
          subscribed={subscribed}
          subscribing={subscribing}
          enablingAuto={enablingAuto}
          onSubscribe={onSubscribe}
          onEnableAutoTranslate={onEnableAutoTranslate}
        />
      ) : null}
    </div>
  );
}
