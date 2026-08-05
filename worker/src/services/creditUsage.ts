import { randomUUID } from "node:crypto";
import { hasTsfDbCredentials, tsfExecute } from "./tsfDb.js";

export type CreditUsageSource = "single" | "image" | "v4_job";

export type RecordCreditUsageParams = {
  shop: string;
  source: CreditUsageSource;
  credits: number;
  referenceId?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Worker 侧写入 Turso CreditUsage（计费积分审计）。
 * 失败只打日志，不抛出（不阻断翻译/扣费主路径）。
 */
export async function recordCreditUsage(
  params: RecordCreditUsageParams,
): Promise<void> {
  const credits = Math.max(0, Math.floor(params.credits));
  if (credits <= 0) return;

  const referenceId =
    params.referenceId?.trim() ||
    `${params.source}:${params.shop}:${randomUUID()}`;

  if (!hasTsfDbCredentials()) {
    console.warn(
      `[credit.deduct] skip audit — no Turso creds shop=${params.shop}` +
        ` source=${params.source} credits=${credits}`,
    );
    return;
  }

  try {
    await tsfExecute({
      sql: `
        INSERT INTO CreditUsage (id, shop, source, credits, referenceId, metadata, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `,
      args: [
        randomUUID(),
        params.shop,
        params.source,
        credits,
        referenceId,
        params.metadata ? JSON.stringify(params.metadata) : null,
      ],
    });
    console.log(
      `[credit.deduct] shop=${params.shop} source=${params.source}` +
        ` credits=${credits} ref=${referenceId}`,
    );
  } catch (err) {
    console.error(
      `[credit.deduct] audit write failed shop=${params.shop}` +
        ` source=${params.source} credits=${credits} ref=${referenceId}`,
      err,
    );
  }
}
