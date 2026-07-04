import prisma from "~/db.server";
import { isBillingEnabled } from "~/server/billing/constants.server";
import type { BilledTaskTokenItem } from "./applyTaskTokenBilling.server";
import { billTokenUsage } from "./applyTaskTokenBilling.server";
import { parseUsageMetadata, sumParsedTokenUsage } from "./parseUsageMetadata.server";
import { recordTaskTokenUsage } from "./recordTaskTokenUsage.server";

export async function recordBilledTaskTokenUsages(params: {
  shop: string;
  items: BilledTaskTokenItem[];
}): Promise<number> {
  const shop = params.shop.trim();
  if (!shop || params.items.length === 0) return 0;
  if (!isBillingEnabled()) return 0;

  const billedItems = await Promise.all(
    params.items.map(async (item) => {
      const rawUsage = parseUsageMetadata(item.usage);
      const billedUsage = await billTokenUsage({
        modelKey: item.modelKey,
        usage: item.usage,
      });
      return { item, rawUsage, billedUsage };
    }),
  );

  const positiveItems = billedItems.filter(
    (entry) => entry.billedUsage.totalTokens > 0,
  );
  if (positiveItems.length <= 0) return 0;

  const usage = sumParsedTokenUsage(
    positiveItems.map((entry) => entry.billedUsage),
  );
  if (usage.totalTokens <= 0) return 0;

  await recordTaskTokenUsage({ shop, usage });

  await prisma.taskTokenUsageLog.createMany({
    data: positiveItems.map((entry) => ({
      shop,
      taskType: entry.item.taskType,
      jobId: entry.item.jobId ?? null,
      modelKey: entry.item.modelKey,
      rawTokens: entry.rawUsage.totalTokens,
      billedTokens: entry.billedUsage.totalTokens,
      inputTokens: entry.billedUsage.inputTokens,
      outputTokens: entry.billedUsage.outputTokens,
    })),
  });

  return usage.totalTokens;
}
