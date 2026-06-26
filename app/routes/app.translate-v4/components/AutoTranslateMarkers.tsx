import { v4Colors } from "../v4Styles";

type BadgeProps = {
  lastUpdateHint?: string | null;
  nextUpdateHint?: string | null;
};

/** 与语言页自动翻译开关同源（ShopTargetLocale.autoTranslate）。 */
export function AutoTranslateBadge({ lastUpdateHint, nextUpdateHint }: BadgeProps = {}) {
  const hasHints = Boolean(lastUpdateHint || nextUpdateHint);

  return (
    <span className="v4-auto-badge-wrap">
      <span
        style={{
          padding: "1px 7px",
          fontSize: 10,
          fontWeight: 600,
          lineHeight: 1.5,
          color: v4Colors.success,
          background: "rgba(22, 163, 74, 0.1)",
          borderRadius: 999,
        }}
      >
        自动翻译
      </span>
      {hasHints ? (
        <span className="v4-auto-badge-hints" aria-hidden>
          {lastUpdateHint ? <span>{lastUpdateHint}</span> : null}
          {nextUpdateHint ? <span>{nextUpdateHint}</span> : null}
        </span>
      ) : null}
    </span>
  );
}

/** 任务队列：仅自动任务展示（中性色，避免与绿色状态标签重复）。 */
export function AutoTaskBadge() {
  return (
    <span
      style={{
        padding: "1px 7px",
        fontSize: 10,
        fontWeight: 600,
        lineHeight: 1.5,
        color: "#475569",
        background: "#f1f5f9",
        border: "1px solid #e2e8f0",
        borderRadius: 999,
      }}
    >
      自动
    </span>
  );
}
