import {
  deleteShopScanJob,
  findOldShopScanJobsForCleanup,
  getLatestTerminalShopScanId,
} from "./shopScanCosmos.js";
import { blobDeletePrefix } from "./blobV4.js";
import { isShuttingDown } from "../shutdown.js";

const LOG = "[shopScanJobCleanup]";

const DEFAULT_RETENTION_DAYS = 7;
const DEFAULT_MINUTE = 50;
const DEFAULT_INTERVAL_MS = 60 * 60_000;
const DEFAULT_TZ = "Asia/Shanghai";
const DEFAULT_MAX_PER_RUN = 100;
const DEFAULT_JOB_DELAY_MS = 500;
const DEFAULT_BLOB_DELAY_MS = 50;
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

export function isShopScanJobCleanupEnabled(): boolean {
  return envBool("SHOP_SCAN_JOB_CLEANUP_ENABLED", true);
}

export function getShopScanJobRetentionDays(): number {
  return envInt("SHOP_SCAN_JOB_RETENTION_DAYS", DEFAULT_RETENTION_DAYS, 1, 365);
}

export function getShopScanJobCleanupTimezone(): string {
  return process.env.SHOP_SCAN_JOB_CLEANUP_TZ?.trim() || DEFAULT_TZ;
}

export function getShopScanJobCleanupMinute(): number {
  return envInt("SHOP_SCAN_JOB_CLEANUP_MINUTE", DEFAULT_MINUTE, 0, 59);
}

export function getShopScanJobCleanupIntervalMs(): number {
  return envInt(
    "SHOP_SCAN_JOB_CLEANUP_INTERVAL_MS",
    DEFAULT_INTERVAL_MS,
    60_000,
    24 * 60 * 60_000,
  );
}

function getMaxPerRun(): number {
  return envInt("SHOP_SCAN_JOB_CLEANUP_MAX_PER_RUN", DEFAULT_MAX_PER_RUN, 1, 2000);
}

function getJobDelayMs(): number {
  return envInt("SHOP_SCAN_JOB_CLEANUP_DELAY_MS", DEFAULT_JOB_DELAY_MS, 0, 60_000);
}

function getBlobDelayMs(): number {
  return envInt(
    "SHOP_SCAN_JOB_CLEANUP_BLOB_DELETE_DELAY_MS",
    DEFAULT_BLOB_DELAY_MS,
    0,
    5_000,
  );
}

function getQueryBatch(): number {
  return envInt("SHOP_SCAN_JOB_CLEANUP_QUERY_BATCH", DEFAULT_QUERY_BATCH, 1, 200);
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

/** 下一次清理：按配置时区对齐到每小时的 scheduleMinute（默认 :50）。 */
export function resolveNextShopScanJobCleanupAt(now = new Date()): Date {
  const timeZone = getShopScanJobCleanupTimezone();
  const scheduleMinute = getShopScanJobCleanupMinute();
  const intervalMs = getShopScanJobCleanupIntervalMs();
  const cur = tzYmdHm(now, timeZone);
  let slot = utcFromTzLocal(cur.y, cur.m, cur.d, cur.h, scheduleMinute, timeZone);

  while (slot.getTime() <= now.getTime() + 1000) {
    const p = tzYmdHm(new Date(slot.getTime() + intervalMs), timeZone);
    slot = utcFromTzLocal(p.y, p.m, p.d, p.h, scheduleMinute, timeZone);
  }

  return slot;
}

export function msUntilNextShopScanJobCleanup(now = new Date()): number {
  return Math.max(1000, resolveNextShopScanJobCleanupAt(now).getTime() - now.getTime());
}

function isLegacyPerScanBlobPrefix(blobPrefix: string | null | undefined): boolean {
  if (!blobPrefix) return false;
  const p = blobPrefix.replace(/\/$/, "");
  return p.startsWith("shop-scan/") && p.split("/").length >= 3;
}

/**
 * 删除超过保留期的 shop_scan_jobs（终态）。
 * 每店保留最新一条 COMPLETED/PARTIAL；FAILED 可删。
 * 稳定产物 `shop-profile/{shop}/latest-scan.json` 不删；
 * 仅 best-effort 清遗留 `shop-scan/{shop}/{scanId}/` 前缀。
 */
export async function cleanupOldShopScanJobs(): Promise<{
  deleted: number;
  skippedKeepLatest: number;
  blobsPurged: number;
}> {
  const retentionDays = getShopScanJobRetentionDays();
  const maxPerRun = getMaxPerRun();
  const queryBatch = Math.min(getQueryBatch(), maxPerRun);
  const jobDelayMs = getJobDelayMs();
  const blobDelayMs = getBlobDelayMs();
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60_000).toISOString();

  let deleted = 0;
  let skippedKeepLatest = 0;
  let blobsPurged = 0;
  const keepLatestCache = new Map<string, string | null>();

  console.log(
    `${LOG} start cutoff=${cutoff} maxPerRun=${maxPerRun} retentionDays=${retentionDays}`,
  );

  while (deleted < maxPerRun && !isShuttingDown()) {
    const batchLimit = Math.min(queryBatch, maxPerRun - deleted);
    const candidates = await findOldShopScanJobsForCleanup(cutoff, batchLimit);
    if (candidates.length === 0) break;

    let progressed = false;
    for (const job of candidates) {
      if (isShuttingDown() || deleted >= maxPerRun) break;

      if (job.status === "COMPLETED" || job.status === "PARTIAL") {
        let latestId = keepLatestCache.get(job.shopName);
        if (latestId === undefined) {
          latestId = await getLatestTerminalShopScanId(job.shopName);
          keepLatestCache.set(job.shopName, latestId);
        }
        if (latestId && latestId === job.id) {
          skippedKeepLatest++;
          continue;
        }
      }

      try {
        if (isLegacyPerScanBlobPrefix(job.blobPrefix)) {
          const n = await blobDeletePrefix(job.blobPrefix, {
            delayMs: blobDelayMs,
            shouldAbort: () => isShuttingDown(),
          });
          blobsPurged += n;
        }
        await deleteShopScanJob(job.shopName, job.id);
        deleted++;
        progressed = true;
        if (jobDelayMs > 0) await sleep(jobDelayMs);
      } catch (err) {
        console.warn(
          `${LOG} delete failed shop=${job.shopName} id=${job.id}:`,
          err instanceof Error ? err.message : err,
        );
      }
    }

    if (!progressed) break;
  }

  console.log(
    `${LOG} done deleted=${deleted} skippedKeepLatest=${skippedKeepLatest} blobsPurged=${blobsPurged}`,
  );
  return { deleted, skippedKeepLatest, blobsPurged };
}
