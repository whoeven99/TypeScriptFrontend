import { v4Colors } from "../v4Styles";

type BadgeProps = {
  /** 覆盖率行：在徽章后展示下次更新时间 */
  nextUpdateHint?: string | null;
};

/** 与语言页自动翻译开关同源（ShopTargetLocale.autoTranslate）。 */
export function AutoTranslateBadge({ nextUpdateHint }: BadgeProps = {}) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, verticalAlign: "middle" }}>
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
      {nextUpdateHint ? (
        <span style={{ fontSize: 10, color: v4Colors.textMuted, fontWeight: 500 }}>
          {nextUpdateHint}
        </span>
      ) : null}
    </span>
  );
}

/** 任务队列：仅自动任务展示。 */
export function AutoTaskBadge() {
  return (
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
      自动
    </span>
  );
}
