import { hasTsfDbCredentials, tsfExecute } from "./tsfDb.js";
import type { TranslationV4Job, TranslationV4Status } from "./cosmosV4.js";

const LOG = "[jobUsageSnapshot]";

export type JobUsageSnapshotStatus = Extract<
  TranslationV4Status,
  "COMPLETED" | "FAILED" | "CANCELLED" | "PAUSED"
>;

function sumEngineSourceChars(
  engineUsage: TranslationV4Job["engineUsage"],
): number {
  if (!engineUsage) return 0;
  let total = 0;
  for (const u of Object.values(engineUsage)) {
    total += Number(u?.chars) || 0;
  }
  return Math.max(0, Math.floor(total));
}

function parseJobCreatedAt(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const ms = Date.parse(raw);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

/**
 * 任务终态用量快照 → Turso `TranslateV4JobUsage`。
 * 以 jobId 幂等 upsert；失败只打日志，不抛出（不阻断流水线）。
 */
export async function recordJobUsageSnapshot(
  job: TranslationV4Job,
  status: JobUsageSnapshotStatus,
): Promise<void> {
  if (!hasTsfDbCredentials()) {
    console.warn(
      `${LOG} skip job=${job.id} — TSF Turso credentials not configured`,
    );
    return;
  }

  const metrics = job.metrics;
  const usedTokens = Math.max(0, Math.floor(Number(metrics?.usedTokens) || 0));
  const translateUnitDone = Math.max(
    0,
    Math.floor(Number(metrics?.translateUnitDone) || 0),
  );
  const translateDone = Math.max(
    0,
    Math.floor(Number(metrics?.translateDone) || 0),
  );
  const sourceChars = sumEngineSourceChars(job.engineUsage);
  const jobCreatedAt = parseJobCreatedAt(job.createdAt);
  const taskSource = job.taskSource?.trim() || null;

  try {
    await tsfExecute({
      sql: `
        INSERT INTO TranslateV4JobUsage (
          jobId, shop, recordedAt, createdAt, status, taskSource,
          source, target, usedTokens, translateUnitDone, sourceChars, translateDone
        ) VALUES (
          ?, ?, datetime('now'), ?, ?, ?,
          ?, ?, ?, ?, ?, ?
        )
        ON CONFLICT(jobId) DO UPDATE SET
          shop = excluded.shop,
          recordedAt = datetime('now'),
          createdAt = COALESCE(excluded.createdAt, TranslateV4JobUsage.createdAt),
          status = excluded.status,
          taskSource = excluded.taskSource,
          source = excluded.source,
          target = excluded.target,
          usedTokens = excluded.usedTokens,
          translateUnitDone = excluded.translateUnitDone,
          sourceChars = excluded.sourceChars,
          translateDone = excluded.translateDone
      `,
      args: [
        job.id,
        job.shopName,
        jobCreatedAt,
        status,
        taskSource,
        job.source,
        job.target,
        usedTokens,
        translateUnitDone,
        sourceChars,
        translateDone,
      ],
    });
    console.log(
      `${LOG} job=${job.id} status=${status} usedTokens=${usedTokens}` +
        ` units=${translateUnitDone} chars=${sourceChars} done=${translateDone}`,
    );
  } catch (e) {
    console.error(`${LOG} failed job=${job.id} status=${status}`, e);
  }
}
