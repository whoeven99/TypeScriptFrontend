import { findOldJobsForRetentionCleanup } from "./cosmosV4.js";
import { purgeV4Job } from "./autoJobCleanup.js";
import { isShuttingDown } from "../shutdown.js";

const LOG = "[jobRetentionCleanup]";

/** 默认保留 7 天。 */
const DEFAULT_RETENTION_DAYS = 7;
/** 默认北京时间每天 15:00 开始清理（工作时间便于观察）。 */
const DEFAULT_HOUR = 15;
const DEFAULT_MINUTE = 0;
const DEFAULT_TZ = "Asia/Shanghai";
/** 单次最多删除条数，剩余顺延到次日。 */
const DEFAULT_MAX_PER_RUN = 150;
/** 两条任务删除间隔，降低 Cosmos/Blob/Redis 突发压力。 */
const DEFAULT_JOB_DELAY_MS = 1_000;
/** 同一任务内每个 Blob 删除间隔。 */
const DEFAULT_BLOB_DELAY_MS = 50;
/** 近 N 毫秒内有心跳的进行中任务跳过，避免误删正在跑的任务。 */
const DEFAULT_HEARTBEAT_GRACE_MS = 10 * 60_000;
/** 每次从 Cosmos 拉取的候选上限（应 ≤ maxPerRun）。 */
const DEFAULT_QUERY_BATCH = 50;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function envBool(name: string, defaultValue: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (raw == null || raw === "") return defaultValue;
  if (raw === "0" || raw === "false" || raw === "off" || raw === "no") {
    return false;
  }
  if (raw === "1" || raw === "true" || raw === "on" || raw === "yes") {
    return true;
  }
  return defaultValue;
}

function envInt(name: string, fallback: number, min: number, max: number): number {
  const n = Number(process.env[name]);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

export function isJobRetentionCleanupEnabled(): boolean {
  return envBool("V4_JOB_RETENTION_CLEANUP_ENABLED", true);
}

export function getJobRetentionDays(): number {
  return envInt("V4_JOB_RETENTION_DAYS", DEFAULT_RETENTION_DAYS, 1, 365);
}

export function getJobRetentionCleanupTimezone(): string {
  return process.env.V4_JOB_RETENTION_CLEANUP_TZ?.trim() || DEFAULT_TZ;
}

export function getJobRetentionCleanupHour(): number {
  return envInt("V4_JOB_RETENTION_CLEANUP_HOUR", DEFAULT_HOUR, 0, 23);
}

export function getJobRetentionCleanupMinute(): number {
  return envInt("V4_JOB_RETENTION_CLEANUP_MINUTE", DEFAULT_MINUTE, 0, 59);
}

function getMaxPerRun(): number {
  return envInt(
    "V4_JOB_RETENTION_CLEANUP_MAX_PER_RUN",
    DEFAULT_MAX_PER_RUN,
    1,
    2000,
  );
}

function getJobDelayMs(): number {
  return envInt(
    "V4_JOB_RETENTION_CLEANUP_DELAY_MS",
    DEFAULT_JOB_DELAY_MS,
    0,
    60_000,
  );
}

function getBlobDelayMs(): number {
  return envInt(
    "V4_JOB_RETENTION_BLOB_DELETE_DELAY_MS",
    DEFAULT_BLOB_DELAY_MS,
    0,
    5_000,
  );
}

function getQueryBatch(): number {
  return envInt(
    "V4_JOB_RETENTION_CLEANUP_QUERY_BATCH",
    DEFAULT_QUERY_BATCH,
    1,
    200,
  );
}

function getHeartbeatGraceMs(): number {
  return envInt(
    "V4_JOB_RETENTION_HEARTBEAT_GRACE_MS",
    DEFAULT_HEARTBEAT_GRACE_MS,
    0,
    60 * 60_000,
  );
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

/** 下一次定点清理时刻（按配置时区的时:分）。 */
export function resolveNextJobRetentionCleanupAt(now = new Date()): Date {
  const timeZone = getJobRetentionCleanupTimezone();
  const hour = getJobRetentionCleanupHour();
  const minute = getJobRetentionCleanupMinute();
  const cur = tzYmdHm(now, timeZone);
  let next = utcFromTzLocal(cur.y, cur.m, cur.d, hour, minute, timeZone);
  if (next.getTime() <= now.getTime() + 1000) {
    const tomorrow = new Date(next.getTime() + 24 * 60 * 60_000);
    const t = tzYmdHm(tomorrow, timeZone);
    next = utcFromTzLocal(t.y, t.m, t.d, hour, minute, timeZone);
  }
  return next;
}

export function msUntilNextJobRetentionCleanup(now = new Date()): number {
  return Math.max(1000, resolveNextJobRetentionCleanupAt(now).getTime() - now.getTime());
}

function hasFreshHeartbeat(
  lastHeartbeat: string | null | undefined,
  graceMs: number,
): boolean {
  if (!lastHeartbeat || graceMs <= 0) return false;
  const ts = Date.parse(lastHeartbeat);
  if (!Number.isFinite(ts)) return false;
  const age = Date.now() - ts;
  return age >= 0 && age < graceMs;
}

/**
 * 缓慢删除超过保留期的翻译任务（Cosmos + Blob + Redis）。
 * 单次有上限；未删完的次日继续。跳过近心跳的进行中任务。
 */
export async function cleanupOldTranslationJobs(): Promise<void> {
  if (!isJobRetentionCleanupEnabled()) {
    console.log(`${LOG} 未启用（V4_JOB_RETENTION_CLEANUP_ENABLED=false）`);
    return;
  }

  const retentionDays = getJobRetentionDays();
  const cutoff = new Date(
    Date.now() - retentionDays * 24 * 60 * 60_000,
  ).toISOString();
  const maxPerRun = getMaxPerRun();
  const jobDelayMs = getJobDelayMs();
  const blobDelayMs = getBlobDelayMs();
  const queryBatch = Math.min(getQueryBatch(), maxPerRun);
  const heartbeatGraceMs = getHeartbeatGraceMs();

  console.log(
    `${LOG} 开始 cutoff=${cutoff} retentionDays=${retentionDays} maxPerRun=${maxPerRun} jobDelayMs=${jobDelayMs} blobDelayMs=${blobDelayMs}`,
  );

  let deleted = 0;
  let skippedHeartbeat = 0;
  let failed = 0;

  while (deleted + failed < maxPerRun) {
    if (isShuttingDown()) {
      console.log(`${LOG} 收到 shutdown，中止本轮`);
      break;
    }

    const remaining = maxPerRun - deleted - failed;
    const batch = await findOldJobsForRetentionCleanup(
      cutoff,
      Math.min(queryBatch, remaining),
    );
    if (!batch.length) break;

    let progressed = false;
    for (const job of batch) {
      if (isShuttingDown()) break;
      if (deleted + failed >= maxPerRun) break;

      if (hasFreshHeartbeat(job.lastHeartbeat, heartbeatGraceMs)) {
        skippedHeartbeat++;
        console.log(
          `${LOG} 跳过近心跳任务 id=${job.id} status=${job.status} lastHeartbeat=${job.lastHeartbeat}`,
        );
        continue;
      }

      try {
        await purgeV4Job(job, {
          blobDeleteDelayMs: blobDelayMs,
          shouldAbort: () => isShuttingDown(),
        });
        if (isShuttingDown()) break;
        deleted++;
        progressed = true;
        console.log(
          `${LOG} 已删 id=${job.id} shop=${job.shopName} createdAt=${job.createdAt} status=${job.status} (${deleted}/${maxPerRun})`,
        );
      } catch (err) {
        failed++;
        progressed = true;
        console.error(
          `${LOG} 删除失败 id=${job.id} shop=${job.shopName}`,
          err,
        );
      }

      if (jobDelayMs > 0 && deleted + failed < maxPerRun && !isShuttingDown()) {
        await sleep(jobDelayMs);
      }
    }

    // 整批都被心跳跳过时避免死循环
    if (!progressed) {
      console.log(
        `${LOG} 本批候选均被心跳保护跳过，结束本轮（次日再试） skippedHeartbeat=${skippedHeartbeat}`,
      );
      break;
    }
  }

  console.log(
    `${LOG} 完成 deleted=${deleted} failed=${failed} skippedHeartbeat=${skippedHeartbeat} cutoff=${cutoff}`,
  );
}
