import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { CSSProperties, ReactNode } from "react";
import { v4Colors } from "../v4Styles";

/**
 * translate-v4 本地弹窗：antd `Modal` 的轻量替代（首屏去 antd 组件包）。
 *
 * 保留 antd Modal 的关键行为：遮罩居中、点击遮罩关闭、Esc 关闭、body 滚动锁、
 * 关闭即卸载内容（等价 destroyOnHidden）。仅在客户端交互打开，SSR 阶段 open=false
 * 返回 null，不触发 portal。
 */
type Props = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  width?: number;
  label?: string;
};

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  zIndex: 1000,
};

const dialogStyle: CSSProperties = {
  position: "relative",
  borderRadius: 20,
  border: `1px solid ${v4Colors.cardBorder}`,
  background: v4Colors.cardBg,
  boxShadow: "var(--app-shadow-card-strong)",
  overflow: "hidden",
  maxHeight: "calc(100vh - 32px)",
  overflowY: "auto",
  outline: "none",
};

const closeStyle: CSSProperties = {
  position: "absolute",
  top: 12,
  right: 12,
  width: 28,
  height: 28,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  fontSize: 20,
  lineHeight: 1,
  color: v4Colors.textMuted,
  borderRadius: 8,
  zIndex: 1,
  fontFamily: "inherit",
};

export function V4Modal({ open, onClose, children, width = 560, label }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="presentation"
      style={overlayStyle}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        style={{ ...dialogStyle, width, maxWidth: "calc(100vw - 32px)" }}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          style={closeStyle}
        >
          ×
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export default V4Modal;
