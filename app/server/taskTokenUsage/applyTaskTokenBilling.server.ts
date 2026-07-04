import {
  parseUsageMetadata,
  sumParsedTokenUsage,
  type ParsedTokenUsage,
} from "./parseUsageMetadata.server";
import { resolveTokenBillingRule } from "./tokenBillingCatalog.server";
import { normalizeBillingModelKey } from "./tokenBillingTypes.server";

export function applyTokenBillingMultiplier(
  usage: ParsedTokenUsage,
  multiplier: number,
): ParsedTokenUsage {
  const m = Number.isFinite(multiplier) && multiplier >= 0 ? multiplier : 1;
  const scale = (n: number) => Math.max(0, Math.ceil(n * m));
  return {
    inputTokens: scale(usage.inputTokens),
    outputTokens: scale(usage.outputTokens),
    totalTokens: scale(usage.totalTokens),
  };
}

export async function billTokenUsage(params: {
  modelKey: string;
  usage: ParsedTokenUsage | unknown;
}): Promise<ParsedTokenUsage> {
  const parsed = parseUsageMetadata(params.usage);
  const { multiplier } = await resolveTokenBillingRule({
    modelKey: normalizeBillingModelKey(params.modelKey),
  });
  return applyTokenBillingMultiplier(parsed, multiplier);
}

export type BilledTaskTokenItem = {
  taskType: string;
  modelKey: string;
  jobId?: string | null;
  usage: ParsedTokenUsage | unknown;
};

export async function sumBilledTaskTokenUsages(params: {
  items: BilledTaskTokenItem[];
}): Promise<ParsedTokenUsage> {
  const billed: ParsedTokenUsage[] = [];
  for (const item of params.items) {
    billed.push(
      await billTokenUsage({
        modelKey: item.modelKey,
        usage: item.usage,
      }),
    );
  }
  return sumParsedTokenUsage(billed);
}
