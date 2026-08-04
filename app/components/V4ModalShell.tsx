import { useEffect } from "react";
import type { CSSProperties, ReactNode } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  width?: number;
  maxHeight?: string;
  panelStyle?: CSSProperties;
  disableClose?: boolean;
  showCloseButton?: boolean;
};

export function V4ModalShell({
  open,
  onClose,
  children,
  width = 720,
  maxHeight = "min(820px, calc(100vh - 32px))",
  panelStyle,
  disableClose = false,
  showCloseButton = true,
}: Props) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !disableClose) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose, disableClose]);

  if (!open) return null;

  return (
    <div
      aria-modal="true"
      role="dialog"
      style={overlayStyle}
      onClick={() => {
        if (!disableClose) onClose();
      }}
    >
      <div
        style={{
          ...panelStyleBase,
          width: `min(${width}px, calc(100vw - 32px))`,
          maxHeight,
          ...panelStyle,
        }}
        onClick={(event) => event.stopPropagation()}
      >
        {showCloseButton ? (
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            disabled={disableClose}
            style={closeButtonStyle}
          >
            ×
          </button>
        ) : null}
        {children}
      </div>
    </div>
  );
}

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 2147483100,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  background: "rgba(15, 23, 42, 0.36)",
  backdropFilter: "blur(8px)",
};

const panelStyleBase: CSSProperties = {
  position: "relative",
  overflow: "hidden",
  borderRadius: 20,
  border: "1px solid var(--app-color-border-secondary)",
  background: "var(--app-color-surface)",
  boxShadow: "var(--app-shadow-card-strong)",
  display: "flex",
  flexDirection: "column",
};

const closeButtonStyle: CSSProperties = {
  position: "absolute",
  top: 14,
  right: 14,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 32,
  height: 32,
  padding: 0,
  border: "none",
  borderRadius: 999,
  background: "rgba(15, 23, 42, 0.04)",
  color: "var(--app-color-text-secondary)",
  fontSize: 20,
  lineHeight: 1,
  cursor: "pointer",
};
