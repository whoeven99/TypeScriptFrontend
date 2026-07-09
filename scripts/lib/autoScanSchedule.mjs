/**
 * 与 worker/src/services/autoScanSchedule.ts 保持口径一致（脚本侧 ESM 副本）。
 */

export const AUTO_TRANSLATE_INTERVAL_MS_DEFAULT = 60 * 60_000;
export const AUTO_TRANSLATE_SHOP_COOLDOWN_MS_DEFAULT = 3 * 60 * 60_000;
export const AUTO_TRANSLATE_SCHEDULE_TZ_DEFAULT = "Asia/Shanghai";
export const AUTO_TRANSLATE_SCHEDULE_MINUTE_DEFAULT = 0;
export const AUTO_TRANSLATE_SLOTS_PER_DAY_DEFAULT = 24;
export const AUTO_TRANSLATE_SHARD_COOLDOWN_MS_DEFAULT = 20 * 60 * 60_000;

export function getAutoTranslateIntervalMs(env = process.env) {
  const n = Number(env.AUTO_TRANSLATE_INTERVAL_MS);
  return n > 0 ? n : AUTO_TRANSLATE_INTERVAL_MS_DEFAULT;
}

export function getAutoTranslateShopCooldownMs(env = process.env) {
  const n = Number(env.AUTO_TRANSLATE_SHOP_COOLDOWN_MS);
  return n > 0 ? n : AUTO_TRANSLATE_SHOP_COOLDOWN_MS_DEFAULT;
}

export function getAutoTranslateScheduleTimezone(env = process.env) {
  return (
    env.AUTO_TRANSLATE_SCHEDULE_TZ?.trim() || AUTO_TRANSLATE_SCHEDULE_TZ_DEFAULT
  );
}

export function getAutoTranslateScheduleMinute(env = process.env) {
  const n = Number(env.AUTO_TRANSLATE_SCHEDULE_MINUTE);
  if (!Number.isFinite(n) || n < 0 || n > 59) {
    return AUTO_TRANSLATE_SCHEDULE_MINUTE_DEFAULT;
  }
  return Math.floor(n);
}

export function isAutoTranslateShardingEnabled(env = process.env) {
  const raw = env.AUTO_TRANSLATE_SHARDING?.trim().toLowerCase();
  if (raw === "0" || raw === "false" || raw === "off" || raw === "no") {
    return false;
  }
  return true;
}

export function getAutoTranslateSlotsPerDay(env = process.env) {
  const n = Number(env.AUTO_TRANSLATE_SLOTS_PER_DAY);
  if (Number.isFinite(n) && n >= 1 && n <= 1440) return Math.floor(n);
  return AUTO_TRANSLATE_SLOTS_PER_DAY_DEFAULT;
}

export function getAutoTranslateShardCooldownMs(env = process.env) {
  const n = Number(env.AUTO_TRANSLATE_SHARD_COOLDOWN_MS);
  return n > 0 ? n : AUTO_TRANSLATE_SHARD_COOLDOWN_MS_DEFAULT;
}

function timezoneOffsetMs(at, timeZone) {
  const utc = Date.parse(at.toLocaleString("en-US", { timeZone: "UTC" }));
  const tz = Date.parse(at.toLocaleString("en-US", { timeZone }));
  return tz - utc;
}

function tzYmdHm(at, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(at);
  const pick = (t) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return {
    y: pick("year"),
    m: pick("month"),
    d: pick("day"),
    h: pick("hour"),
    min: pick("minute"),
  };
}

function utcFromTzLocal(y, m, d, h, min, timeZone) {
  let guess = Date.UTC(y, m - 1, d, h, min, 0, 0);
  for (let i = 0; i < 4; i++) {
    const p = tzYmdHm(new Date(guess), timeZone);
    if (p.y === y && p.m === m && p.d === d && p.h === h && p.min === min) {
      return new Date(guess);
    }
    const offset = timezoneOffsetMs(new Date(guess), timeZone);
    guess = Date.UTC(y, m - 1, d, h, min, 0, 0) - offset;
  }
  return new Date(guess);
}

/** 当前时刻落在一天中的哪个槽位（0..slotsPerDay-1）。slotsPerDay=24 时即当前小时。 */
export function currentSlotIndex(
  now = new Date(),
  slotsPerDay = getAutoTranslateSlotsPerDay(),
  timeZone = getAutoTranslateScheduleTimezone(),
) {
  const slots = Math.max(1, Math.min(1440, Math.floor(slotsPerDay)));
  const { h, min } = tzYmdHm(now, timeZone);
  const minutesSinceMidnight = h * 60 + min;
  const slotWidthMin = 1440 / slots;
  return Math.floor(minutesSinceMidnight / slotWidthMin) % slots;
}

/** FNV-1a 稳定 hash → [0, slotsPerDay)。 */
export function shopSlotIndex(shop, slotsPerDay = getAutoTranslateSlotsPerDay()) {
  const slots = Math.max(1, Math.min(1440, Math.floor(slotsPerDay)));
  let hash = 0x811c9dc5;
  for (let i = 0; i < shop.length; i++) {
    hash ^= shop.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % slots;
}

/** 某槽位下一次扫描时刻（今天该槽未到则今天，否则明天）。slotsPerDay=24 时 slot 即本地小时。 */
export function resolveScanAtForSlotIndex(
  slotIndex,
  now = new Date(),
  slotsPerDay = getAutoTranslateSlotsPerDay(),
  timeZone = getAutoTranslateScheduleTimezone(),
  scheduleMinute = getAutoTranslateScheduleMinute(),
) {
  const slots = Math.max(1, Math.min(1440, Math.floor(slotsPerDay)));
  const slot = ((Math.floor(slotIndex) % slots) + slots) % slots;
  const slotWidthMin = 1440 / slots;
  const startMin = slot * slotWidthMin;
  const targetH = Math.floor(startMin / 60);
  const targetM = slots === 24 ? scheduleMinute : Math.floor(startMin % 60);

  const cur = tzYmdHm(now, timeZone);
  let scanAt = utcFromTzLocal(cur.y, cur.m, cur.d, targetH, targetM, timeZone);
  if (scanAt.getTime() <= now.getTime() + 1000) {
    const nextDay = new Date(scanAt.getTime() + 24 * 60 * 60_000);
    const p = tzYmdHm(nextDay, timeZone);
    scanAt = utcFromTzLocal(p.y, p.m, p.d, targetH, targetM, timeZone);
  }
  return scanAt;
}

export function resolveNextClockAlignedScanAt(
  now = new Date(),
  intervalMs = getAutoTranslateIntervalMs(),
  timeZone = getAutoTranslateScheduleTimezone(),
  scheduleMinute = getAutoTranslateScheduleMinute(),
) {
  const interval = Math.max(60_000, intervalMs);
  const cur = tzYmdHm(now, timeZone);
  let slot = utcFromTzLocal(cur.y, cur.m, cur.d, cur.h, scheduleMinute, timeZone);

  while (slot.getTime() <= now.getTime() + 1000) {
    const p = tzYmdHm(new Date(slot.getTime() + interval), timeZone);
    slot = utcFromTzLocal(p.y, p.m, p.d, p.h, scheduleMinute, timeZone);
  }

  return slot;
}

export function formatInTz(isoDate, timeZone = getAutoTranslateScheduleTimezone()) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(isoDate);
}

/** 槽位 index 对应的本地小时范围描述（slotsPerDay=24 时 slot=N 即 N 点档）。 */
export function describeSlotHour(slot, slotsPerDay = getAutoTranslateSlotsPerDay()) {
  const slots = Math.max(1, Math.min(1440, Math.floor(slotsPerDay)));
  if (slots === 24) {
    return `${String(slot).padStart(2, "0")}:00–${String(slot).padStart(2, "0")}:59`;
  }
  const widthMin = 1440 / slots;
  const startMin = slot * widthMin;
  const endMin = startMin + widthMin - 1;
  const fmt = (m) =>
    `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(Math.floor(m % 60)).padStart(2, "0")}`;
  return `${fmt(startMin)}–${fmt(endMin)}`;
}

export function isShopAutoCooldownElapsed(lastBatchAt, cooldownMs, nowMs = Date.now()) {
  if (!lastBatchAt) return true;
  const t = lastBatchAt instanceof Date ? lastBatchAt.getTime() : new Date(lastBatchAt).getTime();
  if (Number.isNaN(t)) return true;
  return nowMs - t >= cooldownMs;
}
