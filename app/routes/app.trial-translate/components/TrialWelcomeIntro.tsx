import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import AppPageHeader from "~/ui/components/AppPageHeader";

const trustGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 10,
  margin: 0,
  padding: 0,
  listStyle: "none",
};

const trustCardStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 6,
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid var(--app-color-border-secondary)",
  background: "var(--p-color-bg-surface)",
  minWidth: 0,
};

const trustDotStyle: CSSProperties = {
  width: 7,
  height: 7,
  marginTop: 6,
  borderRadius: 999,
  flexShrink: 0,
  background: "var(--p-color-text-success)",
};

const trustTitleStyle: CSSProperties = {
  display: "block",
  fontSize: 13,
  lineHeight: "20px",
  fontWeight: 650,
  color: "var(--app-color-text)",
};

const trustBodyStyle: CSSProperties = {
  display: "block",
  marginTop: 2,
  fontSize: 12,
  lineHeight: "18px",
  color: "var(--app-color-text-secondary)",
};

const pillarsStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "6px 8px",
  margin: 0,
  padding: 0,
  listStyle: "none",
  fontSize: 13,
  lineHeight: "20px",
  color: "var(--app-color-text-secondary)",
};

const pillarStyle: CSSProperties = {
  fontWeight: 650,
  color: "var(--app-color-text)",
};

/**
 * 新人首屏：重点 = 价值一句话；信任 = 免费/不改动店铺/秒级；次要 = 三个关键词。
 */
export function TrialWelcomeIntro() {
  const { t } = useTranslation();

  const pillars = [
    t("trial.welcome.benefit1Title"),
    t("trial.welcome.benefit2Title"),
    t("trial.welcome.benefit3Title"),
  ] as const;

  const trustPoints = [
    {
      title: t("trial.welcome.trustFree"),
      body: t("trial.welcome.trustFreeBody"),
    },
    {
      title: t("trial.welcome.trustSafe"),
      body: t("trial.welcome.trustSafeBody"),
    },
    {
      title: t("trial.welcome.trustFast"),
      body: t("trial.welcome.trustFastBody"),
    },
  ] as const;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <AppPageHeader
        title={t("trial.welcome.title")}
        description={t("trial.welcome.subtitle")}
      />
      <ul style={trustGridStyle} aria-label={t("trial.welcome.trustTitle")}>
        {trustPoints.map((point) => (
          <li key={point.title} style={trustCardStyle}>
            <span aria-hidden style={trustDotStyle} />
            <span style={{ minWidth: 0 }}>
              <span style={trustTitleStyle}>{point.title}</span>
              <span style={trustBodyStyle}>{point.body}</span>
            </span>
          </li>
        ))}
      </ul>
      <p style={pillarsStyle} aria-label={t("trial.welcome.helpsTitle")}>
        {pillars.map((label, i) => (
          <span key={label} style={pillarStyle}>
            {i > 0 ? "· " : null}
            {label}
          </span>
        ))}
      </p>
    </div>
  );
}
