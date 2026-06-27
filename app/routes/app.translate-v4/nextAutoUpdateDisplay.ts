/**
 * 自动扫描时间展示（浏览器本地时区）。
 */
function formatScheduleTime(at: string, nowMs: number): string {
  const t = new Date(at).getTime();
  const sameDay = new Date(t).toDateString() === new Date(nowMs).toDateString();
  const time = new Date(t).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  if (sameDay) return time;
  const date = new Date(t).toLocaleDateString(undefined, {
    month: "numeric",
    day: "numeric",
  });
  return `${date} ${time}`;
}

export function formatLastAutoUpdateDisplay(
  lastAutoUpdateAt: string | null,
  nowMs = Date.now(),
): string | null {
  if (!lastAutoUpdateAt) return null;
  const t = new Date(lastAutoUpdateAt).getTime();
  if (Number.isNaN(t)) return null;

  if (nowMs - t < 60_000) return "上次更新 刚刚";
  return `上次更新 ${formatScheduleTime(lastAutoUpdateAt, nowMs)}`;
}

export function formatNextAutoUpdateDisplay(
  nextAutoUpdateAt: string | null,
  nowMs = Date.now(),
): string | null {
  if (!nextAutoUpdateAt) return null;
  const t = new Date(nextAutoUpdateAt).getTime();
  if (Number.isNaN(t)) return null;

  if (t <= nowMs + 60_000) return "下次扫描 即将开始";

  return `下次扫描 ${formatScheduleTime(nextAutoUpdateAt, nowMs)}`;
}
