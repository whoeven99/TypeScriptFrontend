/** 与 TSF app/server/translateV4/autoScanSchedule.server.ts 保持口径一致。 */

export const AUTO_TRANSLATE_INTERVAL_MS_DEFAULT = 60 * 60_000;
/** 单店两次自动建任务批次的最小间隔（全局仍每小时扫描，按店冷却以打散负载）。 */
export const AUTO_TRANSLATE_SHOP_COOLDOWN_MS_DEFAULT = 3 * 60 * 60_000;
export const AUTO_TRANSLATE_SCHEDULE_TZ_DEFAULT = "Asia/Shanghai";
export const AUTO_TRANSLATE_SCHEDULE_MINUTE_DEFAULT = 0;

/**
 * 分槽打散：把每个店按稳定 hash 固定到一天中的某个槽位，扫描时只建落在当前
 * 槽位的店（该店所有语言一起创建），从而把自动翻译负载平铺到全天，消除整点惊群。
 * 默认 24 槽（配合每小时扫描 = 每店每天 1 批）。
 */
export const AUTO_TRANSLATE_SLOTS_PER_DAY_DEFAULT = 24;
/** 分槽模式下的整店冷却：保证同一店每天在自己的槽位只建一批。 */
export const AUTO_TRANSLATE_SHARD_COOLDOWN_MS_DEFAULT = 20 * 60 * 60_000;

export function getAutoTranslateIntervalMs(): number {
  const n = Number(process.env.AUTO_TRANSLATE_INTERVAL_MS);
  return n > 0 ? n : AUTO_TRANSLATE_INTERVAL_MS_DEFAULT;
}

export function getAutoTranslateShopCooldownMs(): number {
  const n = Number(process.env.AUTO_TRANSLATE_SHOP_COOLDOWN_MS);
  return n > 0 ? n : AUTO_TRANSLATE_SHOP_COOLDOWN_MS_DEFAULT;
}

export function getAutoTranslateScheduleTimezone(): string {
  return (
    process.env.AUTO_TRANSLATE_SCHEDULE_TZ?.trim() ||
    AUTO_TRANSLATE_SCHEDULE_TZ_DEFAULT
  );
}

export function getAutoTranslateScheduleMinute(): number {
  const n = Number(process.env.AUTO_TRANSLATE_SCHEDULE_MINUTE);
  if (!Number.isFinite(n) || n < 0 || n > 59) {
    return AUTO_TRANSLATE_SCHEDULE_MINUTE_DEFAULT;
  }
  return Math.floor(n);
}

/** 分槽打散是否启用（默认启用；AUTO_TRANSLATE_SHARDING=0/false/off 关闭回退旧逻辑）。 */
export function isAutoTranslateShardingEnabled(): boolean {
  const raw = process.env.AUTO_TRANSLATE_SHARDING?.trim().toLowerCase();
  if (raw === "0" || raw === "false" || raw === "off" || raw === "no") {
    return false;
  }
  return true;
}

/** 一天分多少个槽位（1..1440）。每小时扫描时，仅 24 或其约数有意义。 */
export function getAutoTranslateSlotsPerDay(): number {
  const n = Number(process.env.AUTO_TRANSLATE_SLOTS_PER_DAY);
  if (Number.isFinite(n) && n >= 1 && n <= 1440) return Math.floor(n);
  return AUTO_TRANSLATE_SLOTS_PER_DAY_DEFAULT;
}

export function getAutoTranslateShardCooldownMs(): number {
  const n = Number(process.env.AUTO_TRANSLATE_SHARD_COOLDOWN_MS);
  return n > 0 ? n : AUTO_TRANSLATE_SHARD_COOLDOWN_MS_DEFAULT;
}

/** 单次扫描最多新建的任务数（0 = 不限制）。分槽已把峰值降到 ~30/时，此为安全带。 */
export function getAutoTranslateMaxNewJobsPerScan(): number {
  const n = Number(process.env.AUTO_TRANSLATE_MAX_NEW_JOBS_PER_SCAN);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/**
 * 当前时刻落在一天中的哪个槽位（0..slotsPerDay-1），按调度时区计算。
 * slotsPerDay=24 时即当前小时数。
 */
export function currentSlotIndex(
  now = new Date(),
  slotsPerDay = getAutoTranslateSlotsPerDay(),
  timeZone = getAutoTranslateScheduleTimezone(),
): number {
  const slots = Math.max(1, Math.min(1440, Math.floor(slotsPerDay)));
  const { h, min } = tzYmdHm(now, timeZone);
  const minutesSinceMidnight = h * 60 + min;
  const slotWidthMin = 1440 / slots;
  return Math.floor(minutesSinceMidnight / slotWidthMin) % slots;
}

/**
 * 把一个店稳定映射到 [0, slotsPerDay) 的槽位（FNV-1a，无状态、确定性）。
 * 同店所有语言共用同一槽位，故会在同一小时一起创建。
 */
export function shopSlotIndex(
  shop: string,
  slotsPerDay = getAutoTranslateSlotsPerDay(),
): number {
  const slots = Math.max(1, Math.min(1440, Math.floor(slotsPerDay)));
  let hash = 0x811c9dc5;
  for (let i = 0; i < shop.length; i++) {
    hash ^= shop.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % slots;
}

function timezoneOffsetMs(at: Date, timeZone: string): number {
  const utc = Date.parse(at.toLocaleString("en-US", { timeZone: "UTC" }));
  const tz = Date.parse(at.toLocaleString("en-US", { timeZone }));
  return tz - utc;
}

function tzYmdHm(
  at: Date,
  timeZone: string,
): { y: number; m: number; d: number; h: number; min: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(at);
  const pick = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return {
    y: pick("year"),
    m: pick("month"),
    d: pick("day"),
    h: pick("hour"),
    min: pick("minute"),
  };
}

function utcFromTzLocal(
  y: number,
  m: number,
  d: number,
  h: number,
  min: number,
  timeZone: string,
): Date {
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

export function resolveNextClockAlignedScanAt(
  now = new Date(),
  intervalMs = getAutoTranslateIntervalMs(),
  timeZone = getAutoTranslateScheduleTimezone(),
  scheduleMinute = getAutoTranslateScheduleMinute(),
): Date {
  const interval = Math.max(60_000, intervalMs);
  const cur = tzYmdHm(now, timeZone);
  let slot = utcFromTzLocal(
    cur.y,
    cur.m,
    cur.d,
    cur.h,
    scheduleMinute,
    timeZone,
  );

  while (slot.getTime() <= now.getTime() + 1000) {
    const p = tzYmdHm(new Date(slot.getTime() + interval), timeZone);
    slot = utcFromTzLocal(p.y, p.m, p.d, p.h, scheduleMinute, timeZone);
  }

  return slot;
}

export function msUntilNextClockAlignedScan(
  now = new Date(),
  intervalMs = getAutoTranslateIntervalMs(),
  timeZone = getAutoTranslateScheduleTimezone(),
  scheduleMinute = getAutoTranslateScheduleMinute(),
): number {
  const next = resolveNextClockAlignedScanAt(
    now,
    intervalMs,
    timeZone,
    scheduleMinute,
  );
  return Math.max(1000, next.getTime() - now.getTime());
}

/** 当前时刻之前、最近一轮应对齐的扫描时刻（默认上一整点）。 */
export function resolvePreviousClockAlignedScanAt(
  now = new Date(),
  intervalMs = getAutoTranslateIntervalMs(),
  timeZone = getAutoTranslateScheduleTimezone(),
  scheduleMinute = getAutoTranslateScheduleMinute(),
): Date {
  const interval = Math.max(60_000, intervalMs);
  const cur = tzYmdHm(now, timeZone);
  let candidate = utcFromTzLocal(
    cur.y,
    cur.m,
    cur.d,
    cur.h,
    scheduleMinute,
    timeZone,
  );
  if (candidate.getTime() > now.getTime()) {
    candidate = new Date(candidate.getTime() - interval);
    const p = tzYmdHm(candidate, timeZone);
    candidate = utcFromTzLocal(
      p.y,
      p.m,
      p.d,
      p.h,
      scheduleMinute,
      timeZone,
    );
  }
  if (candidate.getTime() > now.getTime() - 1000) {
    const prev = new Date(candidate.getTime() - interval);
    const p = tzYmdHm(prev, timeZone);
    return utcFromTzLocal(p.y, p.m, p.d, p.h, scheduleMinute, timeZone);
  }
  return candidate;
}

/** 单次 tick 最多补跑几轮漏掉的整点扫描（默认 1 = 上一小时）。 */
export function getAutoTranslateMaxCatchupScans(): number {
  const n = Number(process.env.AUTO_TRANSLATE_MAX_CATCHUP_SCANS);
  if (Number.isFinite(n) && n >= 0) return Math.floor(n);
  return 1;
}

const MISSED_SCAN_GRACE_MS = 60_000;

/**
 * 自上次成功扫描以来漏掉的整点对齐时刻（由旧到新），用于补偿扫描。
 * maxMissed 默认 1，可通过 AUTO_TRANSLATE_MAX_CATCHUP_SCANS 提高。
 */
export function listMissedClockAlignedScanAt(
  lastSuccessAt: Date | null,
  now = new Date(),
  maxMissed = getAutoTranslateMaxCatchupScans(),
  intervalMs = getAutoTranslateIntervalMs(),
  timeZone = getAutoTranslateScheduleTimezone(),
  scheduleMinute = getAutoTranslateScheduleMinute(),
): Date[] {
  if (maxMissed <= 0) return [];

  const floor = lastSuccessAt?.getTime() ?? 0;
  const missed: Date[] = [];
  let cursor = resolvePreviousClockAlignedScanAt(
    now,
    intervalMs,
    timeZone,
    scheduleMinute,
  );

  while (
    missed.length < maxMissed &&
    cursor.getTime() > floor + MISSED_SCAN_GRACE_MS
  ) {
    missed.unshift(cursor);
    const prevAnchor = new Date(cursor.getTime() - 1000);
    const older = resolvePreviousClockAlignedScanAt(
      prevAnchor,
      intervalMs,
      timeZone,
      scheduleMinute,
    );
    if (older.getTime() >= cursor.getTime()) break;
    cursor = older;
  }

  return missed;
}
