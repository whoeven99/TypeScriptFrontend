import { randomUUID } from "node:crypto";
import prisma from "../../../db.server";

/** 积分消费审计来源（与 Prisma CreditUsage.source 对齐）。 */
export type CreditUsageSource = "single" | "image" | "v4_job";

export type RecordCreditUsageParams = {
  shop: string;
  source: CreditUsageSource;
  credits: number;
  /** 幂等键；缺省则生成 UUID。 */
  referenceId?: string;
  metadata?: Record<string, unknown>;
};

/**
 * 写入 CreditUsage 消费审计。失败只打日志，不抛出（不阻断扣费主路径）。
 * 单位为计费积分 credits（token×系数后），非现金。
 */
export async function recordCreditUsage(
  params: RecordCreditUsageParams,
): Promise<void> {
  const credits = Math.max(0, Math.floor(params.credits));
  if (credits <= 0) return;

  const referenceId =
    params.referenceId?.trim() || `${params.source}:${params.shop}:${randomUUID()}`;

  try {
    await prisma.creditUsage.create({
      data: {
        shop: params.shop,
        source: params.source,
        credits,
        referenceId,
        metadata: params.metadata ?? undefined,
      },
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
