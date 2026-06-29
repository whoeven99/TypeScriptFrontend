import type { CSSProperties, ReactNode } from "react";

interface AppPageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  extra?: ReactNode;
  style?: CSSProperties;
}

const headerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "var(--app-space-400)",
  flexWrap: "wrap",
  padding: "2px 0",
};

const titleWrapStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  minWidth: 0,
  flex: 1,
};

const titleStyle: CSSProperties = {
  margin: 0,
  color: "var(--app-color-text)",
  fontSize: 24,
  lineHeight: "30px",
  fontWeight: 700,
  letterSpacing: "-0.03em",
};

const descriptionStyle: CSSProperties = {
  margin: 0,
  color: "var(--app-color-text-secondary)",
  fontSize: "var(--app-font-size-body-small)",
  lineHeight: "20px",
  maxWidth: 760,
};

export default function AppPageHeader({
  title,
  description,
  extra,
  style,
}: AppPageHeaderProps) {
  return (
    <div style={{ ...headerStyle, ...style }}>
      <div style={titleWrapStyle}>
        <h1 style={titleStyle}>{title}</h1>
        {description ? <p style={descriptionStyle}>{description}</p> : null}
      </div>
      {extra ? <div style={{ display: "flex", alignItems: "center", gap: 8 }}>{extra}</div> : null}
    </div>
  );
}
