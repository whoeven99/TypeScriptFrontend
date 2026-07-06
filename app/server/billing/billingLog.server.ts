import type { Prisma } from "../../generated/prisma";
import prisma from "../../db.server";
import type { BillingLogEvent } from "./types.server";

export type AppendBillingLogParams = {
  shop: string;
  eventType: BillingLogEvent;
  planKey?: string | null;
  referenceId?: string | null;
  creditsDelta?: number | null;
  usedCredits?: number | null;
  metadata?: Record<string, unknown> | null;
};

/** 追加一条计费流水（审计 + referenceId 幂等依据）。 */
export async function appendBillingLog(
  params: AppendBillingLogParams,
): Promise<void> {
  await prisma.billingLog.create({
    data: {
      shop: params.shop,
      eventType: params.eventType,
      planKey: params.planKey ?? null,
      referenceId: params.referenceId ?? null,
      creditsDelta: params.creditsDelta ?? null,
      usedCredits: params.usedCredits ?? null,
      metadata: (params.metadata ?? undefined) as Prisma.InputJsonValue,
    },
  });
}
