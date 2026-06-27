import { v4Colors } from "../v4Styles";

const autoMarkerBadgeStyle = {
  padding: "2px 8px",
  fontSize: 12,
  fontWeight: 500,
  lineHeight: 1.5,
  color: v4Colors.success,
  background: v4Colors.successBg,
  borderRadius: 999,
} as const;

type BadgeProps = {
  lastUpdateHint?: string | null;
  nextUpdateHint?: string | null;
};

/** 与语言页自动翻译开关同源（ShopTargetLocale.autoTranslate）。 */
export function AutoTranslateBadge({ lastUpdateHint, nextUpdateHint }: BadgeProps = {}) {
  const hasHints = Boolean(lastUpdateHint || nextUpdateHint);

  return (
    <span className="v4-auto-badge-wrap">
      <span style={autoMarkerBadgeStyle}>自动翻译</span>
      {hasHints ? (
        <span className="v4-auto-badge-hints" aria-hidden>
          {lastUpdateHint ? <span>{lastUpdateHint}</span> : null}
          {nextUpdateHint ? <span>{nextUpdateHint}</span> : null}
        </span>
      ) : null}
    </span>
  );
}

/** 任务队列：自动任务来源标记，样式与覆盖率「自动翻译」一致。 */
export function AutoTaskBadge() {
  return <span style={autoMarkerBadgeStyle}>自动</span>;
}
