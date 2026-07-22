import type { CSSProperties } from "react";
import { Link } from "@remix-run/react";
import { useTranslation } from "react-i18next";
import Button from "~/ui/components/AppButton";
import AppStatusBadge from "~/ui/components/AppStatusBadge";
import { notifyOnboardingPreviewMarked } from "~/components/OnboardingProgressBar";

export type TrialVisibleFields = {
  title: string;
  titleTranslated: string;
  bodyHtml: string;
  bodyHtmlTranslated: string;
  seoTitle: string;
  seoTitleTranslated: string;
  seoDescription: string;
  seoDescriptionTranslated: string;
};

type Props = {
  imageUrl: string | null;
  visible: TrialVisibleFields | null;
  storefrontUrl: string | null;
  switcherThemeEditorUrl: string | null;
  targetLabel: string | null;
  targetLocale: string | null;
  /** 店铺域名，用于把「店面验收」持久化到新手漏斗第 4 步。 */
  shop: string;
  canSave: boolean;
  saving: boolean;
  saved: boolean;
  localePublished: boolean;
  publishingLocale: boolean;
  onPublishLocale: () => void;
  onSave: () => void;
};

const panelStyle: CSSProperties = {
  flex: 1,
  minWidth: 280,
  border: "1px solid var(--app-color-border-secondary)",
  borderRadius: 12,
  overflow: "hidden",
  background: "var(--p-color-bg-surface)",
  display: "flex",
  flexDirection: "column",
};

const headerStyle: CSSProperties = {
  padding: "10px 14px",
  borderBottom: "1px solid var(--app-color-border-secondary)",
  fontWeight: 600,
  fontSize: 13,
  color: "var(--app-color-text)",
  background: "var(--p-color-bg-surface-secondary)",
};

const stepBadgeStyle: CSSProperties = {
  flexShrink: 0,
  width: 20,
  height: 20,
  borderRadius: 999,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 12,
  fontWeight: 700,
  background: "var(--p-color-bg-fill-brand)",
  color: "#fff",
};

const resultHeadStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
};

const resultTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 18,
  lineHeight: "24px",
  fontWeight: 700,
  color: "var(--app-color-text)",
};

const resultHintStyle: CSSProperties = {
  margin: "4px 0 0",
  fontSize: 13,
  lineHeight: "20px",
  color: "var(--app-color-text-secondary)",
};

const badgeRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  alignItems: "center",
};

const saveCardStyle: CSSProperties = {
  padding: 16,
  borderRadius: 10,
  border: "1px solid var(--app-color-border-secondary)",
  background: "var(--p-color-bg-surface)",
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const sectionTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 15,
  lineHeight: "22px",
  fontWeight: 700,
  color: "var(--app-color-text)",
};

const sectionBodyStyle: CSSProperties = {
  margin: "4px 0 0",
  fontSize: 13,
  lineHeight: "20px",
  color: "var(--app-color-text-secondary)",
};

const handoffGridStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  alignItems: "stretch",
};

const handoffCardStyle: CSSProperties = {
  flex: "1 1 300px",
  minWidth: 280,
  padding: 16,
  borderRadius: 10,
  border: "1px solid var(--app-color-border-secondary)",
  background: "var(--p-color-bg-surface)",
  display: "flex",
  flexDirection: "column",
  gap: 14,
};

const checkRowStyle: CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "flex-start",
};

const checkTextStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 3,
  minWidth: 0,
  fontSize: 13,
  lineHeight: "20px",
  color: "var(--app-color-text)",
};

const actionRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  alignItems: "center",
};

const nextListStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  margin: 0,
  padding: 0,
  listStyle: "none",
};

const nextItemStyle: CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "flex-start",
  fontSize: 13,
  lineHeight: "20px",
  color: "var(--app-color-text)",
};

const nextDotStyle: CSSProperties = {
  width: 7,
  height: 7,
  marginTop: 7,
  borderRadius: 999,
  flexShrink: 0,
  background: "var(--p-color-bg-fill-brand)",
};

/** 已翻译字段的轻高亮：淡绿底 + 左侧色条，帮用户一眼看到「哪里变了」。 */
const highlightStyle: CSSProperties = {
  background: "var(--p-color-bg-surface-success)",
  boxShadow: "inset 3px 0 0 var(--p-color-text-success)",
  borderRadius: 6,
  padding: "2px 8px",
  margin: "0 -8px",
};

type ChangedFields = {
  title?: boolean;
  body?: boolean;
  seo?: boolean;
};

function ProductPageMock({
  imageUrl,
  title,
  bodyHtml,
  seoTitle,
  seoDescription,
  changed,
}: {
  imageUrl: string | null;
  title: string;
  bodyHtml: string;
  seoTitle: string;
  seoDescription: string;
  changed?: ChangedFields;
}) {
  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        style={{
          width: "100%",
          aspectRatio: "4 / 3",
          borderRadius: 8,
          overflow: "hidden",
          background: "var(--p-color-bg-surface-secondary)",
          border: "1px solid var(--app-color-border-secondary)",
        }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : null}
      </div>
      <h3
        style={{
          margin: 0,
          fontSize: 20,
          lineHeight: "28px",
          fontWeight: 650,
          color: "var(--app-color-text)",
          ...(changed?.title ? highlightStyle : null),
        }}
      >
        {title || "—"}
      </h3>
      <div
        style={{
          fontSize: 14,
          lineHeight: "22px",
          color: "var(--app-color-text)",
          maxHeight: 220,
          overflow: "auto",
          ...(changed?.body ? highlightStyle : null),
        }}
        dangerouslySetInnerHTML={{
          __html: bodyHtml || "<p>—</p>",
        }}
      />
      {(seoTitle || seoDescription) && (
        <div
          style={{
            marginTop: 4,
            padding: 12,
            borderRadius: 8,
            background: "var(--p-color-bg-surface-secondary)",
            border: changed?.seo
              ? "1px solid var(--p-color-text-success)"
              : "1px solid var(--app-color-border-secondary)",
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: "var(--app-color-text-secondary)",
              marginBottom: 4,
            }}
          >
            SEO
          </div>
          <div style={{ fontWeight: 600, fontSize: 13, color: "#1a0dab" }}>
            {seoTitle || "—"}
          </div>
          <div style={{ fontSize: 12, color: "#4d5156", marginTop: 2 }}>
            {seoDescription || "—"}
          </div>
        </div>
      )}
    </div>
  );
}

export function TrialPreviewPanels({
  imageUrl,
  visible,
  storefrontUrl,
  switcherThemeEditorUrl,
  targetLabel,
  targetLocale,
  shop,
  canSave,
  saving,
  saved,
  localePublished,
  publishingLocale,
  onPublishLocale,
  onSave,
}: Props) {
  const { t } = useTranslation();
  const language = targetLabel || t("trial.targetLanguage");

  // 店面商品链接（含 ?ciwi_locale=）。嵌入式 iframe 里代码触发的 window.open
  // 常被拦截（点了没反应），改用 <Button href target="_blank"> 由用户手势打开。
  const localizedStoreHref = (() => {
    if (!storefrontUrl) return null;
    try {
      const url = new URL(storefrontUrl);
      if (targetLocale) url.searchParams.set("ciwi_locale", targetLocale);
      return url.toString();
    } catch {
      return storefrontUrl;
    }
  })();

  const markStorefrontPreviewed = () => {
    if (!storefrontUrl) return;
    // 打开商品页即视为完成「店面验收」，持久化到新手漏斗第 4 步，
    // 到开拓市场页就无需再走一遍切换器验收。
    notifyOnboardingPreviewMarked(shop, targetLocale);
  };

  if (!visible) return null;

  const norm = (v: string) => (v || "").trim();
  const changed: ChangedFields = {
    title:
      Boolean(norm(visible.titleTranslated)) &&
      norm(visible.titleTranslated) !== norm(visible.title),
    body:
      Boolean(norm(visible.bodyHtmlTranslated)) &&
      norm(visible.bodyHtmlTranslated) !== norm(visible.bodyHtml),
    seo:
      (Boolean(norm(visible.seoTitleTranslated)) &&
        norm(visible.seoTitleTranslated) !== norm(visible.seoTitle)) ||
      (Boolean(norm(visible.seoDescriptionTranslated)) &&
        norm(visible.seoDescriptionTranslated) !==
          norm(visible.seoDescription)),
  };

  const expandHref = targetLocale
    ? `/app/expand-market?locale=${encodeURIComponent(targetLocale)}&from=trial`
    : "/app/expand-market?from=trial";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={resultHeadStyle}>
        <div style={{ minWidth: 0 }}>
          <h2 style={resultTitleStyle}>{t("trial.resultTitle")}</h2>
          <p style={resultHintStyle}>{t("trial.resultHint")}</p>
        </div>
        <div style={badgeRowStyle}>
          <AppStatusBadge tone="info">
            {t("trial.resultBadgePreview", { language })}
          </AppStatusBadge>
          <AppStatusBadge tone={localePublished ? "success" : "caution"}>
            {localePublished
              ? t("trial.languagePublished", { language })
              : t("trial.resultBadgeLanguageNotPublished")}
          </AppStatusBadge>
          {!saved ? (
            <AppStatusBadge tone="neutral">
              {t("trial.resultBadgeStoreUnchanged")}
            </AppStatusBadge>
          ) : null}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          alignItems: "stretch",
        }}
      >
        <div style={panelStyle}>
          <div style={headerStyle}>{t("trial.previewBefore")}</div>
          <ProductPageMock
            imageUrl={imageUrl}
            title={visible.title}
            bodyHtml={visible.bodyHtml}
            seoTitle={visible.seoTitle}
            seoDescription={visible.seoDescription}
          />
        </div>

        <div style={panelStyle}>
          <div
            style={{
              ...headerStyle,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <span>{t("trial.previewAfter")}</span>
            <AppStatusBadge tone="success">
              {t("trial.previewTranslatedBadge", { language })}
            </AppStatusBadge>
          </div>
          <ProductPageMock
            imageUrl={imageUrl}
            title={visible.titleTranslated || visible.title}
            bodyHtml={visible.bodyHtmlTranslated || visible.bodyHtml}
            seoTitle={visible.seoTitleTranslated || visible.seoTitle}
            seoDescription={
              visible.seoDescriptionTranslated || visible.seoDescription
            }
            changed={changed}
          />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {canSave || saving ? (
          <div style={saveCardStyle}>
            <div>
              <h3 style={sectionTitleStyle}>{t("trial.saveCardTitle")}</h3>
              <p style={sectionBodyStyle}>
                {t("trial.saveHint", { language })}
              </p>
            </div>
            <div style={actionRowStyle}>
              {canSave && !saving ? (
                <Button type="primary" onClick={onSave}>
                  {t("trial.saveToShopify")}
                </Button>
              ) : null}
              {saving ? (
                <>
                  <Button type="primary" loading disabled>
                    {t("trial.savingToShopify")}
                  </Button>
                  <span
                    style={{
                      color: "var(--app-color-text-secondary)",
                      fontSize: 13,
                    }}
                  >
                    {t("trial.savingHint")}
                  </span>
                </>
              ) : null}
            </div>
          </div>
        ) : null}

        {saved ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div
                style={{
                  color: "var(--p-color-text-success)",
                  fontSize: 14,
                  fontWeight: 650,
                  marginBottom: 4,
                }}
              >
                {t("trial.savedMessage")}
              </div>
              <div
                style={{
                  color: "var(--app-color-text)",
                  fontSize: 13,
                  lineHeight: "20px",
                }}
              >
                {t("trial.savedNextLine", { language })}
              </div>
            </div>

            <div style={handoffGridStyle}>
              <div style={handoffCardStyle}>
                <div>
                  <h3 style={sectionTitleStyle}>
                    {t("trial.savedStorefrontTitle")}
                  </h3>
                  <p style={sectionBodyStyle}>{t("trial.savedStorefrontHint")}</p>
                </div>

                <div style={checkRowStyle}>
                  <span style={stepBadgeStyle}>1</span>
                  <span style={checkTextStyle}>
                    <strong>{t("trial.savedPublishStepTitle", { language })}</strong>
                    <span style={{ color: "var(--app-color-text-secondary)" }}>
                      {t("trial.savedPublishStepBody", { language })}
                    </span>
                  </span>
                </div>

                <div style={checkRowStyle}>
                  <span style={stepBadgeStyle}>2</span>
                  <span style={checkTextStyle}>
                    <strong>{t("trial.savedSwitcherStepTitle")}</strong>
                    <span style={{ color: "var(--app-color-text-secondary)" }}>
                      {t("trial.savedSwitcherStepBody")}
                    </span>
                  </span>
                </div>

                <div style={actionRowStyle}>
                  {!localePublished ? (
                    <Button
                      type="primary"
                      loading={publishingLocale}
                      disabled={publishingLocale}
                      onClick={onPublishLocale}
                    >
                      {publishingLocale
                        ? t("trial.publishingLanguage")
                        : t("trial.publishLanguage", { language })}
                    </Button>
                  ) : (
                    <AppStatusBadge tone="success">
                      {t("trial.languagePublished", { language })}
                    </AppStatusBadge>
                  )}
                  {switcherThemeEditorUrl ? (
                    <Button
                      type={localePublished ? "primary" : "default"}
                      href={switcherThemeEditorUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t("trial.enableSwitcherInTheme")}
                    </Button>
                  ) : null}
                  <Link to="/app/switcher">
                    <Button>{t("trial.goToSwitcher")}</Button>
                  </Link>
                </div>

                <div
                  style={{
                    fontSize: 13,
                    lineHeight: "20px",
                    color: "var(--app-color-text-secondary)",
                    marginBottom: 8,
                  }}
                >
                  {t("trial.viewAfterSwitcherBody", { language })}
                </div>
                <Button
                  type="primary"
                  size="large"
                  href={localizedStoreHref ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={markStorefrontPreviewed}
                  disabled={!storefrontUrl || !localePublished}
                >
                  {t("trial.openStorefrontAfter")}
                </Button>
              </div>

              <div style={handoffCardStyle}>
                <div>
                  <h3 style={sectionTitleStyle}>
                    {t("trial.nextCatalogTitle")}
                  </h3>
                  <p style={sectionBodyStyle}>
                    {t("trial.nextCatalogBody", { language })}
                  </p>
                </div>

                <ul style={nextListStyle}>
                  {[
                    t("trial.nextCatalogPoint1"),
                    t("trial.nextCatalogPoint2"),
                    t("trial.nextCatalogPoint3"),
                  ].map((text) => (
                    <li key={text} style={nextItemStyle}>
                      <span aria-hidden style={nextDotStyle} />
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>

                <div>
                  <Link to={expandHref}>
                    <Button type="primary" size="large">
                      {t("trial.goToExpandMarket", { language })}
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
