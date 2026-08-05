import { createHash } from "node:crypto";
import { tsfExecute, hasTsfDbCredentials } from "./tsfDb.js";
import type { TranslationV4Job } from "./cosmosV4.js";

/** Virtual module: Turso LiquidRule pipeline (not a Shopify resource type). */
export const CUSTOM_LIQUID_MODULE = "CUSTOM_LIQUID";

export type PendingLiquidRule = {
  id: string;
  beforeTranslation: string;
};

export function jobModulesWithLiquid(job: Pick<TranslationV4Job, "modules" | "includeLiquid">): string[] {
  const modules = Array.isArray(job.modules) ? [...job.modules] : [];
  if (job.includeLiquid && !modules.includes(CUSTOM_LIQUID_MODULE)) {
    modules.push(CUSTOM_LIQUID_MODULE);
  }
  return modules;
}

function digestOf(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function fieldDigest(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex").slice(0, 32);
}

/**
 * Claim PENDING LiquidRule rows for this job → TRANSLATING + jobId.
 * Returns claimed rows for init blob writing.
 */
export async function claimPendingLiquidRules(args: {
  shop: string;
  languageCode: string;
  jobId: string;
  limit?: number;
}): Promise<PendingLiquidRule[]> {
  if (!hasTsfDbCredentials()) return [];
  const limit = Math.max(1, Math.min(args.limit ?? 5000, 20_000));

  const pending = await tsfExecute({
    sql: `SELECT id, beforeTranslation FROM LiquidRule
          WHERE shop = ? AND languageCode = ? AND status = 'PENDING'
          ORDER BY createdAt ASC
          LIMIT ?`,
    args: [args.shop, args.languageCode, limit],
  });

  const rows: PendingLiquidRule[] = pending.rows.map((r) => ({
    id: String(r.id),
    beforeTranslation: String(r.beforeTranslation ?? ""),
  })).filter((r) => r.id && r.beforeTranslation);

  if (!rows.length) return [];

  const ids = rows.map((r) => r.id);
  const placeholders = ids.map(() => "?").join(",");
  await tsfExecute({
    sql: `UPDATE LiquidRule
          SET status = 'TRANSLATING', jobId = ?, updatedAt = datetime('now')
          WHERE shop = ? AND status = 'PENDING' AND id IN (${placeholders})`,
    args: [args.jobId, args.shop, ...ids],
  });

  // Re-read claimed (another job may have raced; only keep our jobId)
  const claimed = await tsfExecute({
    sql: `SELECT id, beforeTranslation FROM LiquidRule
          WHERE shop = ? AND jobId = ? AND status = 'TRANSLATING'`,
    args: [args.shop, args.jobId],
  });
  return claimed.rows.map((r) => ({
    id: String(r.id),
    beforeTranslation: String(r.beforeTranslation ?? ""),
  })).filter((r) => r.id && r.beforeTranslation);
}

export function liquidRulesToInitChunk(rules: PendingLiquidRule[]): Array<{
  resourceId: string;
  fields: Array<{
    key: string;
    value: string;
    digest: string;
    shopifyType: string;
  }>;
}> {
  return rules.map((r) => ({
    resourceId: r.id,
    fields: [
      {
        key: "liquid",
        value: r.beforeTranslation,
        digest: fieldDigest(r.beforeTranslation),
        shopifyType: "SINGLE_LINE_TEXT_FIELD",
      },
    ],
  }));
}

/** Write translated value → DONE; clear jobId. */
export async function completeLiquidRuleWriteback(args: {
  shop: string;
  ruleId: string;
  afterTranslation: string;
  jobId: string;
}): Promise<boolean> {
  if (!hasTsfDbCredentials()) return false;
  const after = String(args.afterTranslation ?? "").trim();
  if (!after) return false;
  const res = await tsfExecute({
    sql: `UPDATE LiquidRule
          SET afterTranslation = ?, status = 'DONE', jobId = NULL, updatedAt = datetime('now')
          WHERE shop = ? AND id = ? AND (jobId = ? OR jobId IS NULL)`,
    args: [after, args.shop, args.ruleId, args.jobId],
  });
  return (res.rowsAffected ?? 0) > 0;
}

/** Release TRANSLATING rows for this job back to PENDING (cancel / failed / unused). */
export async function releaseLiquidRulesForJob(args: {
  shop: string;
  jobId: string;
}): Promise<number> {
  if (!hasTsfDbCredentials()) return 0;
  const res = await tsfExecute({
    sql: `UPDATE LiquidRule
          SET status = 'PENDING', jobId = NULL, updatedAt = datetime('now')
          WHERE shop = ? AND jobId = ? AND status = 'TRANSLATING'`,
    args: [args.shop, args.jobId],
  });
  return res.rowsAffected ?? 0;
}

/** Ensure sourceDigest column filled when inserting from worker (unused; collect is App-side). */
export function liquidSourceDigest(beforeTranslation: string): string {
  return digestOf(beforeTranslation);
}
