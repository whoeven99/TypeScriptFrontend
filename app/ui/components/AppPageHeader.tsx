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
};

const titleWrapStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--app-space-100)",
  minWidth: 0,
  flex: 1,
};

const titleStyle: CSSProperties = {
  margin: 0,
  color: "var(--app-color-text)",
  fontSize: 24,
  lineHeight: "32px",
  fontWeight: 700,
};

const descriptionStyle: CSSProperties = {
  margin: 0,
  color: "var(--app-color-text-secondary)",
  fontSize: "var(--app-font-size-body-small)",
  lineHeight: "20px",
  maxWidth: 720,
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
      {extra ? <div>{extra}</div> : null}
    </div>
  );
}
