import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import AppStatusBadge from "~/ui/components/AppStatusBadge";

/** 目标语言在店铺中的状态。 */
export type LocaleSelectStatus =
  | "published"
  | "unpublished"
  | "missing"
  | "primary";

export type LocaleSelectOption = {
  value: string;
  label: string;
  status: LocaleSelectStatus;
};

type Props = {
  options: LocaleSelectOption[];
  value: string | null;
  onChange: (value: string) => void;
  placeholder: string;
  /** 触发器 id，供页内滚动锚点使用（如开拓市场换语言）。 */
  id?: string;
};

const wrapStyle: CSSProperties = {
  position: "relative",
  width: "100%",
  minWidth: 260,
};

const triggerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  minHeight: 36,
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid var(--app-color-border-secondary)",
  background: "var(--p-color-bg-surface)",
  color: "var(--app-color-text)",
  fontSize: 13,
  lineHeight: "20px",
  cursor: "pointer",
  textAlign: "left",
};

const dropdownStyle: CSSProperties = {
  position: "absolute",
  top: "calc(100% + 4px)",
  left: 0,
  right: 0,
  zIndex: 1100,
  borderRadius: 8,
  border: "1px solid var(--app-color-border-secondary)",
  background: "var(--p-color-bg-surface)",
  boxShadow: "var(--app-shadow-card)",
  overflow: "hidden",
};

const searchStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 10px",
  border: "none",
  borderBottom: "1px solid var(--app-color-border-secondary)",
  outline: "none",
  fontSize: 13,
  lineHeight: "20px",
  background: "var(--p-color-bg-surface)",
  color: "var(--app-color-text)",
};

const listStyle: CSSProperties = {
  maxHeight: 280,
  overflowY: "auto",
};

function statusBadgeTone(
  status: LocaleSelectStatus,
): "neutral" | "info" | "success" | "caution" | "critical" {
  switch (status) {
    case "published":
      return "success";
    case "unpublished":
      return "caution";
    case "missing":
      return "neutral";
    case "primary":
      return "info";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function optionLabel(o: LocaleSelectOption): string {
  return `${o.label} (${o.value})`;
}

/**
 * 统一的目标语言选择器：触发器 + 可搜索下拉 + 状态徽章。
 * 试译页与开拓市场页共用，保证新人两页交互一致。
 */
export function LocaleSelect({
  options,
  value,
  onChange,
  placeholder,
  id,
}: Props) {
  const { t } = useTranslation();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = options.find((o) => o.value === value) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.value.toLowerCase().includes(q),
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  return (
    <div ref={wrapRef} style={wrapStyle}>
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={triggerStyle}
        onClick={() => setOpen((v) => !v)}
      >
        {selected ? (
          <>
            <span
              style={{
                flex: 1,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {optionLabel(selected)}
            </span>
            <AppStatusBadge tone={statusBadgeTone(selected.status)}>
              {t(`localeSelect.status.${selected.status}`)}
            </AppStatusBadge>
          </>
        ) : (
          <span style={{ flex: 1, color: "var(--app-color-text-secondary)" }}>
            {placeholder}
          </span>
        )}
        <span
          aria-hidden
          style={{
            flexShrink: 0,
            color: "var(--app-color-text-secondary)",
            fontSize: 10,
            lineHeight: 1,
          }}
        >
          ▾
        </span>
      </button>

      {open ? (
        <div style={dropdownStyle} role="listbox">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            style={searchStyle}
            autoFocus
          />
          <div style={listStyle}>
            {filtered.length === 0 ? (
              <div
                style={{
                  padding: "10px 12px",
                  fontSize: 13,
                  color: "var(--app-color-text-secondary)",
                }}
              >
                {t("localeSelect.noResult")}
              </div>
            ) : (
              filtered.map((o) => {
                const active = o.value === value;
                const disabled = o.status === "primary";
                return (
                  <button
                    key={o.value}
                    type="button"
                    role="option"
                    aria-selected={active}
                    disabled={disabled}
                    onClick={() => {
                      if (disabled) return;
                      onChange(o.value);
                      setOpen(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      width: "100%",
                      padding: "8px 12px",
                      border: "none",
                      borderBottom:
                        "1px solid var(--app-color-border-secondary)",
                      background: active
                        ? "var(--p-color-bg-surface-secondary)"
                        : "transparent",
                      color: disabled
                        ? "var(--app-color-text-secondary)"
                        : "var(--app-color-text)",
                      fontSize: 13,
                      lineHeight: "20px",
                      textAlign: "left",
                      cursor: disabled ? "not-allowed" : "pointer",
                      opacity: disabled ? 0.55 : 1,
                    }}
                  >
                    <span style={{ minWidth: 0 }}>{optionLabel(o)}</span>
                    <AppStatusBadge tone={statusBadgeTone(o.status)}>
                      {t(`localeSelect.status.${o.status}`)}
                    </AppStatusBadge>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
