import { useLocation, useNavigate } from "@remix-run/react";
import { useTranslation } from "react-i18next";

type StorefrontTab = "switcher" | "currency";

type Props = {
  active: StorefrontTab;
};

export default function StorefrontTabs({ active }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const tabs: Array<{ key: StorefrontTab; label: string; path: string }> = [
    { key: "switcher", label: t("Switcher"), path: "/app/switcher" },
    { key: "currency", label: t("Currency"), path: "/app/currency" },
  ];

  return (
    <div
      style={{
        border: "1px solid var(--app-color-border-secondary)",
        borderRadius: 14,
        background: "var(--app-color-surface)",
        boxShadow: "var(--app-shadow-card)",
        padding: "16px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 20,
              lineHeight: "28px",
              fontWeight: 750,
              color: "var(--app-color-text)",
            }}
          >
            {t("Storefront")}
          </div>
          <div
            style={{
              marginTop: 4,
              color: "var(--app-color-text-secondary)",
              fontSize: 13,
              lineHeight: "20px",
            }}
          >
            {t("Control what visitors see for language, currency, and localization.")}
          </div>
        </div>
        <div
          style={{
            display: "inline-grid",
            gridTemplateColumns: `repeat(${tabs.length}, minmax(120px, 1fr))`,
            gap: 4,
            padding: 4,
            borderRadius: 10,
            background: "var(--app-color-surface-secondary)",
            minWidth: 260,
          }}
        >
          {tabs.map((tab) => {
            const selected = tab.key === active;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  if (!selected) navigate(`${tab.path}${location.search}`);
                }}
                style={{
                  border: selected
                    ? "1px solid var(--app-accent-primary)"
                    : "1px solid transparent",
                  borderRadius: 8,
                  background: selected
                    ? "var(--app-color-surface)"
                    : "transparent",
                  color: selected
                    ? "var(--app-accent-primary)"
                    : "var(--app-color-text-secondary)",
                  minHeight: 34,
                  padding: "6px 12px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: selected ? "default" : "pointer",
                  boxShadow: selected ? "var(--app-shadow-card)" : "none",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
