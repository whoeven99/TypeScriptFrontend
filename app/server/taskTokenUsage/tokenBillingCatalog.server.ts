import prisma from "~/db.server";
import type { TokenBillingFeature } from "./tokenBillingTypes.server";
import { normalizeBillingModelKey } from "./tokenBillingTypes.server";

export type TokenBillingRuleRecord = {
  ruleKey: string;
  feature: TokenBillingFeature;
  modelKey: string;
  displayName: string;
  multiplier: number;
  baseTokenCost: number | null;
};

const CACHE_TTL_MS = 5 * 60 * 1000;

type CacheEntry = {
  rules: TokenBillingRuleRecord[];
  expiresAt: number;
};

let cache: CacheEntry | null = null;

function rowToRecord(row: {
  ruleKey: string;
  feature: string;
  modelKey: string;
  displayName: string;
  multiplier: number;
  baseTokenCost: number | null;
}): TokenBillingRuleRecord | null {
  if (row.feature !== "translation") return null;
  const multiplier = Number(row.multiplier);
  if (!Number.isFinite(multiplier) || multiplier < 0) return null;
  return {
    ruleKey: row.ruleKey,
    feature: "translation",
    modelKey: row.modelKey,
    displayName: row.displayName,
    multiplier,
    baseTokenCost: row.baseTokenCost,
  };
}

export function invalidateTokenBillingRuleCache(): void {
  cache = null;
}

async function loadEnabledRules(): Promise<TokenBillingRuleRecord[]> {
  if (cache && Date.now() < cache.expiresAt) {
    return cache.rules;
  }

  const rows = await prisma.tokenBillingRule.findMany({
    where: { enabled: true, feature: "translation" },
    orderBy: [{ modelKey: "asc" }],
  });

  const rules = rows
    .map(rowToRecord)
    .filter((r): r is TokenBillingRuleRecord => r != null);

  cache = { rules, expiresAt: Date.now() + CACHE_TTL_MS };
  return rules;
}

function pickRule(
  rules: TokenBillingRuleRecord[],
  modelKey: string,
): TokenBillingRuleRecord | null {
  const normalizedModel = normalizeBillingModelKey(modelKey);
  for (const key of [normalizedModel, "_default"]) {
    const found = rules.find((r) => r.modelKey === key);
    if (found) return found;
  }
  return null;
}

export type ResolvedTokenBillingRule = {
  rule: TokenBillingRuleRecord | null;
  multiplier: number;
  baseTokenCost: number | null;
};

export async function resolveTokenBillingRule(params: {
  modelKey: string;
}): Promise<ResolvedTokenBillingRule> {
  const rules = await loadEnabledRules();
  const rule = pickRule(rules, params.modelKey);
  const multiplier = rule?.multiplier ?? 1.5;
  return { rule, multiplier, baseTokenCost: rule?.baseTokenCost ?? null };
}
