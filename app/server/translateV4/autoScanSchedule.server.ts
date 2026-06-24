import { getTranslateV4RedisClient } from "./redis.server";

/** 与 Spark worker redisV4 / scheduler 共用。 */
export const AUTO_SCAN_LAST_AT_KEY = "translate:v4:auto_scan:last_at";

/** 与 Spark worker scheduler 一致：未配置环境变量时默认 1 小时。 */
export const AUTO_TRANSLATE_INTERVAL_MS_DEFAULT = 60 * 60_000;

export function getAutoTranslateIntervalMs(): number {
  const n = Number(process.env.AUTO_TRANSLATE_INTERVAL_MS);
  return n > 0 ? n : AUTO_TRANSLATE_INTERVAL_MS_DEFAULT;
}

export async function readAutoScanLastAt(): Promise<string | null> {
  try {
    const v = await getTranslateV4RedisClient().get(AUTO_SCAN_LAST_AT_KEY);
    return v?.trim() || null;
  } catch {
    return null;
  }
}

/**
 * 估算下一轮 Worker 自动扫描时刻（全局，与语言无关）。
 * 若已过点则顺延到下一个间隔槽（任务进行中时展示下一档时间，如 14:00→15:00）。
 */
export function resolveNextAutoScanAt(
  lastScanAt: string | null,
  intervalMs: number,
): Date {
  const now = Date.now();
  if (!lastScanAt) return new Date(now + intervalMs);

  let next = new Date(lastScanAt).getTime() + intervalMs;
  if (Number.isNaN(next)) return new Date(now + intervalMs);

  while (next <= now) next += intervalMs;
  return new Date(next);
}

/** 已开自动翻译的语言：返回下次扫描 ISO 时间。 */
export async function resolveNextAutoUpdateAt(
  autoTranslate: boolean,
): Promise<string | null> {
  if (!autoTranslate) return null;
  const lastScanAt = await readAutoScanLastAt();
  const intervalMs = getAutoTranslateIntervalMs();
  return resolveNextAutoScanAt(lastScanAt, intervalMs).toISOString();
}

export function formatNextAutoUpdateHint(nextAutoUpdateAt: string | null): string | null {
  if (!nextAutoUpdateAt) return null;
  const t = new Date(nextAutoUpdateAt).getTime();
  if (Number.isNaN(t)) return null;
  const time = new Date(t).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `下次更新时间 ${time}`;
}
