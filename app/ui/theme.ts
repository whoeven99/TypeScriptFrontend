import type { ThemeConfig } from "antd";

export const appDesignTokens = {
  colorBg: "var(--p-color-bg)",
  colorSurface: "var(--p-color-bg-surface)",
  colorSurfaceSecondary: "var(--p-color-bg-surface-secondary)",
  colorSurfaceHover: "var(--p-color-bg-surface-hover)",
  colorSurfaceSelected: "var(--p-color-bg-surface-selected)",
  colorBorder: "var(--p-color-border)",
  colorBorderSecondary: "var(--p-color-border-secondary)",
  colorText: "var(--p-color-text)",
  colorTextSecondary: "var(--p-color-text-secondary)",
  colorTextTertiary: "var(--p-color-text-tertiary)",
  colorBrand: "var(--p-color-bg-fill-brand)",
  colorBrandOnFill: "var(--p-color-text-brand-on-bg-fill)",
  fontSizeBody: 14,
  fontSizeBodySmall: 13,
  fontSizeCaption: 12,
  borderRadius: 8,
  borderRadiusSmall: 6,
} as const;

export const appAntdTheme: ThemeConfig = {
  token: {
    colorPrimary: appDesignTokens.colorBrand,
    colorInfo: appDesignTokens.colorBrand,
    colorSuccess: "var(--p-color-text-success)",
    colorWarning: "var(--p-color-text-caution)",
    colorError: "var(--p-color-text-critical)",
    colorText: appDesignTokens.colorText,
    colorTextSecondary: appDesignTokens.colorTextSecondary,
    colorBorder: appDesignTokens.colorBorder,
    colorBgBase: appDesignTokens.colorBg,
    colorBgContainer: appDesignTokens.colorSurface,
    fontSize: appDesignTokens.fontSizeBody,
    borderRadius: appDesignTokens.borderRadius,
    wireframe: false,
  },
  components: {
    Button: {
      borderRadius: appDesignTokens.borderRadius,
      primaryShadow: "none",
      defaultShadow: "none",
    },
    Card: {
      headerHeight: 42,
    },
    Menu: {
      itemSelectedBg: appDesignTokens.colorSurfaceSelected,
    },
    Select: {
      optionSelectedBg: appDesignTokens.colorSurfaceSelected,
    },
    Table: {
      rowSelectedBg: appDesignTokens.colorSurfaceSelected,
      rowSelectedHoverBg: appDesignTokens.colorSurfaceSelected,
    },
  },
};
