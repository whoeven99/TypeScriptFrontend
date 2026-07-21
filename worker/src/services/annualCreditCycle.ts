/**
 * 年付额度周期纯函数：只从 Shopify/本地 currentPeriodEnd 对齐，禁止用 createdAt。
 * 与 app/server/billing/subscription/annualCreditCycle.server.ts 保持一致。
 */

export const DAY_MS = 24 * 60 * 60 * 1000;
export const CREDIT_CYCLE_DAYS = 30;
export const ANNUAL_BILLING_DAYS = 365;
export const CREDIT_CYCLE_MS = CREDIT_CYCLE_DAYS * DAY_MS;
export const ANNUAL_BILLING_MS = ANNUAL_BILLING_DAYS * DAY_MS;
export const MAX_ANNUAL_CREDIT_GRANTS = 12;

export type AnnualYearWindow = {
  yearStart: Date;
  yearEnd: Date;
};

export type BillingGrantLogLike = {
  eventType: string;
  metadata?: unknown;
};

export function getAnnualYearWindow(currentPeriodEnd: Date): AnnualYearWindow {
  return {
    yearEnd: currentPeriodEnd,
    yearStart: new Date(currentPeriodEnd.getTime() - ANNUAL_BILLING_MS),
  };
}

export function getAnnualCreditCycleIndex(
  now: Date | number,
  currentPeriodEnd: Date,
): number {
  const { yearStart, yearEnd } = getAnnualYearWindow(currentPeriodEnd);
  const ts = typeof now === "number" ? now : now.getTime();
  const clamped = Math.min(Math.max(ts, yearStart.getTime()), yearEnd.getTime() - 1);
  const elapsed = Math.max(0, clamped - yearStart.getTime());
  return Math.min(
    MAX_ANNUAL_CREDIT_GRANTS - 1,
    Math.floor(elapsed / CREDIT_CYCLE_MS),
  );
}

export function getAnnualCreditWindow(
  currentPeriodEnd: Date,
  cycleIndex: number,
): { start: Date; end: Date } {
  const { yearStart } = getAnnualYearWindow(currentPeriodEnd);
  const idx = Math.max(
    0,
    Math.min(MAX_ANNUAL_CREDIT_GRANTS - 1, Math.floor(cycleIndex)),
  );
  return {
    start: new Date(yearStart.getTime() + idx * CREDIT_CYCLE_MS),
    end: new Date(yearStart.getTime() + (idx + 1) * CREDIT_CYCLE_MS),
  };
}

function parseMetadata(raw: unknown): Record<string, unknown> {
  if (raw == null) return {};
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  try {
    const parsed = JSON.parse(String(raw));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function samePeriodEndIso(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) {
    return a === b;
  }
  return Math.abs(da.getTime() - db.getTime()) < 2000;
}

/**
 * 统计本 Shopify 年账期内已发放次数（ACTIVATED + RENEWED）。
 * 优先 metadata.billingPeriodEnd === currentPeriodEnd；
 * 若尚无带该字段的日志，则回退计 1 次无 billingPeriodEnd 的 ACTIVATED（legacy 迁移）。
 */
export function countGrantsForBillingPeriod(
  logs: BillingGrantLogLike[],
  currentPeriodEnd: Date,
): number {
  const periodEndIso = currentPeriodEnd.toISOString();
  let withMeta = 0;
  let legacyActivated = 0;

  for (const log of logs) {
    const eventType = String(log.eventType || "");
    if (
      eventType !== "SUBSCRIPTION_ACTIVATED" &&
      eventType !== "SUBSCRIPTION_RENEWED"
    ) {
      continue;
    }
    const meta = parseMetadata(log.metadata);
    const billingPeriodEnd = meta.billingPeriodEnd;
    if (typeof billingPeriodEnd === "string" && billingPeriodEnd) {
      if (samePeriodEndIso(billingPeriodEnd, periodEndIso)) {
        withMeta += 1;
      }
      continue;
    }
    if (eventType === "SUBSCRIPTION_ACTIVATED") {
      legacyActivated = 1;
    }
  }

  return withMeta > 0 ? withMeta : legacyActivated;
}

export function getExpectedAnnualGrants(
  now: Date | number,
  currentPeriodEnd: Date,
): number {
  const ts = typeof now === "number" ? now : now.getTime();
  if (ts >= currentPeriodEnd.getTime()) {
    return MAX_ANNUAL_CREDIT_GRANTS;
  }
  return Math.min(
    MAX_ANNUAL_CREDIT_GRANTS,
    getAnnualCreditCycleIndex(ts, currentPeriodEnd) + 1,
  );
}

/** 下次额度发放时刻；已满 12 次或已过年账期则 null。 */
export function getNextAnnualCreditGrantAt(
  currentPeriodEnd: Date,
  grantedCount: number,
): Date | null {
  if (grantedCount >= MAX_ANNUAL_CREDIT_GRANTS) return null;
  const { yearStart, yearEnd } = getAnnualYearWindow(currentPeriodEnd);
  const next = new Date(yearStart.getTime() + grantedCount * CREDIT_CYCLE_MS);
  if (next.getTime() >= yearEnd.getTime()) return null;
  return next;
}

export type AnnualCreditGrantDecision =
  | { action: "grant"; creditCycleIndex: number; grantedCount: number }
  | {
      action: "skip";
      reason: "annual_grants_exhausted" | "not_due_yet";
      grantedCount: number;
      expectedGrants: number;
    };

export function decideAnnualCreditGrant(params: {
  now?: Date | number;
  currentPeriodEnd: Date;
  grantedCount: number;
}): AnnualCreditGrantDecision {
  const now = params.now ?? Date.now();
  const ts = typeof now === "number" ? now : now.getTime();
  const expected = getExpectedAnnualGrants(ts, params.currentPeriodEnd);
  const grantedCount = Math.max(0, Math.floor(params.grantedCount));

  if (grantedCount >= MAX_ANNUAL_CREDIT_GRANTS) {
    return {
      action: "skip",
      reason: "annual_grants_exhausted",
      grantedCount,
      expectedGrants: expected,
    };
  }
  if (grantedCount >= expected) {
    return {
      action: "skip",
      reason: "not_due_yet",
      grantedCount,
      expectedGrants: expected,
    };
  }
  return {
    action: "grant",
    creditCycleIndex: Math.min(MAX_ANNUAL_CREDIT_GRANTS - 1, grantedCount),
    grantedCount,
  };
}
