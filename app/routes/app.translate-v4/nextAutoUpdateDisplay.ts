/**
 * 下次自动更新时间（浏览器本地时区）。
 */
export function formatNextAutoUpdateDisplay(
  nextAutoUpdateAt: string | null,
  nowMs = Date.now(),
): string | null {
  if (!nextAutoUpdateAt) return null;
  const t = new Date(nextAutoUpdateAt).getTime();
  if (Number.isNaN(t)) return null;

  if (t <= nowMs + 60_000) return "下次自动扫描 即将开始";

  const time = new Date(t).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `下次自动扫描 ${time}`;
}
