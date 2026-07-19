/**
 * TSF 额度（token×系数）客户端 + 动态并发上限计算。
 *
 * 模型：**事后实扣 + 按剩余额度动态调并发**（无预估）。
 *   - 每批 LLM 返回后按真实 token×系数 扣减（deductTsfQuota），拿到剩余额度。
 *   - 用剩余额度算出该 shop 允许的并发上限（quotaConcurrencyCap），喂给按 shop 的并发闸。
 *   - 剩余为负 → worker 暂停任务（已在飞的调用继续翻译并扣除，可接受）。
 *
 * 启用规则：**TsFrontend / TsFrontend-Auto 来源默认开启**，QUOTA_ENFORCE=false 可显式关闭；其它来源始终关闭。
 * 额度读写均直连 Turso Account 账本（不再回退 Spring /quota）。
 */

export type QuotaDeductResult = {
  /** 接口调用是否成功（与额度是否充足无关）。 */
  ok: boolean;
  /** 扣减后的剩余额度（可能为负，负数即额度耗尽）。 */
  remaining: number;
};

import {
  TSF_AUTO_TASK_SOURCE,
  TS_FRONTEND_TASK_SOURCE,
} from "./cosmosV4.js";
import {
  deductTsfAccountCredits,
  getTsfAccountRemaining,
} from "./tsfDb.js";

/** TSF 手动 + 自动翻译任务来源（均扣 TSF 额度池）。 */
const TSF_QUOTA_TASK_SOURCES = new Set([
  TS_FRONTEND_TASK_SOURCE,
  TSF_AUTO_TASK_SOURCE,
]);

/**
 * 是否对该来源的任务启用额度控制。
 * 规则：**TsFrontend / TsFrontend-Auto 默认开启**；`QUOTA_ENFORCE=false` 可显式关闭；
 * 其它来源始终关闭（本控制器是 TSF 专属，扣的是 TSF 额度池）。
 */
export function quotaEnforceEnabled(taskSource?: string | null): boolean {
  if (!taskSource || !TSF_QUOTA_TASK_SOURCES.has(taskSource)) return false;
  return process.env.QUOTA_ENFORCE?.trim().toLowerCase() !== "false";
}

/** 翻译系数：LLM 返回 token × 此系数 = 扣减额度 / 任务 usedTokens。默认 1.5。 */
export function quotaTokenMultiplier(): number {
  const v = Number(process.env.QUOTA_TOKEN_MULTIPLIER);
  return Number.isFinite(v) && v > 0 ? v : 1.5;
}

/**
 * 由剩余额度算出允许的并发上限：
 *   remaining ≥ ceiling×perCall → 满并发（ceiling）
 *   perCall ≤ remaining < …     → floor(remaining / perCall)（平滑降速）
 *   remaining < perCall         → 1（硬停由 worker 的 abort 负责）
 */
export function quotaConcurrencyCap(remaining: number): number {
  const perCall = Math.max(1, Number(process.env.QUOTA_PER_CALL_COST) || 15000);
  const ceiling = Math.max(1, Number(process.env.QUOTA_MAX_CONCURRENCY) || 128);
  if (remaining <= 0) return 0;
  if (remaining >= ceiling * perCall) return ceiling;
  if (remaining >= perCall) return Math.max(1, Math.floor(remaining / perCall));
  return 1;
}

/**
 * 读取剩余额度（worker 进入 TRANSLATE 时 seed 初始并发用）。
 * 查询失败 → 保守返回 1（从并发 1 起步，由首次扣减纠正），不直接掐断任务。
 */
export async function getTsfRemaining(shop: string): Promise<number> {
  return getTsfRemainingWithRetry(shop);
}

/** 带重试的额度查询；续跑时避免一次抖动就把并发 seed 到 1。
 *  无 Account 记录 → 返回 0（不是付费用户，不放行）。
 *  查询临时失败 → 保守返回 1（避免误杀正在跑的任务）。 */
export async function getTsfRemainingWithRetry(
  shop: string,
  attempts = 3,
): Promise<number> {
  const maxAttempts = Math.max(1, attempts);
  for (let i = 0; i < maxAttempts; i++) {
    const remaining = await getTsfAccountRemaining(shop);
    if (remaining !== null) return remaining;
    if (i < maxAttempts - 1) {
      await new Promise((r) => setTimeout(r, 200 * (i + 1)));
    }
  }
  // 重试耗尽仍为 null → 无 Account 记录，不是查询抖动 → 返回 0 阻断
  console.warn(`[tsfQuota] no account for shop=${shop}, blocking (remaining=0)`);
  return 0;
}

/** 邮件展示用：查询剩余额度；不可查或失败时返回 null。 */
export async function getTsfRemainingForEmail(shop: string): Promise<number | null> {
  return getTsfAccountRemaining(shop);
}

/**
 * 续跑时 seed 并发上限：优先实时查询，失败则回退 Redis 里上次扣减后的 remaining。
 */
export function resolveQuotaSeedCap(
  remaining: number,
  fallbackRemaining?: number,
): { remaining: number; cap: number; usedFallback: boolean } {
  let effective = remaining;
  let usedFallback = false;
  if (effective <= 1 && fallbackRemaining != null && fallbackRemaining > 1) {
    effective = fallbackRemaining;
    usedFallback = true;
  }
  return { remaining: effective, cap: quotaConcurrencyCap(effective), usedFallback };
}

/**
 * 扣减 `amount` 额度，返回剩余（可能为负）。
 * 接口异常/无账户 → ok:false（worker 据此暂停，避免无账本超用）。
 */
export async function deductTsfQuota(
  shop: string,
  amount: number,
): Promise<QuotaDeductResult> {
  const remaining = await deductTsfAccountCredits(shop, amount);
  if (remaining === null) {
    console.warn(`[tsfQuota] deduct failed (no account?) shop=${shop}`);
    return { ok: false, remaining: 0 };
  }
  return { ok: true, remaining };
}
