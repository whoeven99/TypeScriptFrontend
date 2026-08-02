import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

/**
 * translate-v4 首屏本地按钮：antd `Button` 的轻量替代。
 *
 * 目的：首屏不再加载 antd 组件包（~304KB）。视觉沿用 `.v4-btn*`（styles.css），
 * 与原 `.app-button.ant-btn*` 复用同一批 CSS 变量，观感保持一致。
 * API 兼容原用法：`type` / `danger` / `size` / `loading` / `style` / `onClick`。
 */
export type V4ButtonType = "primary" | "default" | "text";
export type V4ButtonSize = "small" | "middle";

export type V4ButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "type"
> & {
  type?: V4ButtonType;
  danger?: boolean;
  size?: V4ButtonSize;
  loading?: boolean;
  children?: ReactNode;
  style?: CSSProperties;
};

export default function V4Button({
  type = "default",
  danger = false,
  size = "middle",
  loading = false,
  disabled = false,
  className,
  children,
  ...rest
}: V4ButtonProps) {
  const classes = [
    "v4-btn",
    `v4-btn--${type}`,
    danger ? "v4-btn--danger" : null,
    size === "small" ? "v4-btn--sm" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={classes}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <span className="v4-btn__spin" aria-hidden /> : null}
      {children}
    </button>
  );
}
