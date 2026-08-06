/** Per-shop job budget gate for LLM call preflight / concurrency. */

import { AdaptiveSemaphore } from "./llmKeyPool.js";
import { MAX_POOL_CONCURRENCY } from "./deepseekClient.js";

// ─── Per-shop job budget gate（同店同时仅 1 个 TRANSLATING）──────────────────
// 任务开始记下 budget；发 LLM 前 committed += 预估；返回后把该批预估换成实扣。
// 准入：committed + nextEst > budget → 不发新请求。
type ShopQuotaState = {
  gate: AdaptiveSemaphore;
  /** null = 未启用额度预检（非 TSF / 未 sync）。 */
  budgetCredits: number | null;
  /** 已占用：在飞用预估，返回后改为实扣 credits。 */
  committedCredits: number;
  quotaMultiplier: number;
};

const _shopQuotaState = new Map<string, ShopQuotaState>();

export function getShopQuotaState(shop: string): ShopQuotaState {
  let s = _shopQuotaState.get(shop);
  if (!s) {
    s = {
      gate: new AdaptiveSemaphore(MAX_POOL_CONCURRENCY),
      budgetCredits: null,
      committedCredits: 0,
      quotaMultiplier: 1,
    };
    _shopQuotaState.set(shop, s);
  }
  return s;
}

/** 按 budget 剩余头寸收紧并发（与 worker QUOTA_PER_CALL_COST 对齐）。 */
export function refreshGateFromBudget(s: ShopQuotaState): void {
  if (s.budgetCredits == null) return;
  const headroom = Math.max(0, s.budgetCredits - s.committedCredits);
  const perCall = Math.max(1, Number(process.env.QUOTA_PER_CALL_COST) || 15_000);
  const ceiling = Math.max(1, Number(process.env.QUOTA_MAX_CONCURRENCY) || 128);
  if (headroom < perCall) {
    s.gate.setMax(0);
    return;
  }
  if (headroom >= ceiling * perCall) {
    s.gate.setMax(ceiling);
    return;
  }
  s.gate.setMax(Math.max(1, Math.floor(headroom / perCall)));
}

/** 由额度逻辑调用：设置某 shop 的 LLM 并发上限（0=禁止新调用）。 */
export function setShopQuotaCap(shop: string, cap: number): void {
  getShopQuotaState(shop).gate.setMax(Math.max(0, cap));
}

/**
 * Worker 在任务 seed / 暂停时同步本任务预算。
 * - budgetCredits：任务开始时记下的剩余额度；传 0 可禁止新调用
 * - resetCommitted：seed 时清零「预估已花费」
 */
export function syncShopQuotaBudget(
  shop: string,
  args: {
    budgetCredits: number;
    quotaMultiplier?: number;
    resetCommitted?: boolean;
  },
): void {
  const s = getShopQuotaState(shop);
  s.budgetCredits = Math.max(0, Math.floor(args.budgetCredits));
  if (args.resetCommitted) s.committedCredits = 0;
  if (args.quotaMultiplier != null && Number.isFinite(args.quotaMultiplier) && args.quotaMultiplier > 0) {
    s.quotaMultiplier = args.quotaMultiplier;
  }
  refreshGateFromBudget(s);
}

/** @internal test helper */
export function __resetShopQuotaStateForTest(): void {
  _shopQuotaState.clear();
}

/** @internal test helper */
export function __getShopQuotaCommittedForTest(shop: string): {
  budgetCredits: number | null;
  committedCredits: number;
} {
  const s = getShopQuotaState(shop);
  return { budgetCredits: s.budgetCredits, committedCredits: s.committedCredits };
}
