import { randomUUID } from "node:crypto";
import IORedis from "ioredis";

let _redis: IORedis | undefined;
let _lastRedisErrorLogAt = 0;

const REDIS_COMMON_OPTIONS = {
  maxRetriesPerRequest: 2,
  connectTimeout: 10_000,
  retryStrategy: (times: number) => Math.min(times * 500, 5_000),
} as const;

function attachRedisListeners(redis: IORedis): void {
  redis.on("error", (err: Error) => {
    const now = Date.now();
    if (now - _lastRedisErrorLogAt < 60_000) return;
    _lastRedisErrorLogAt = now;
    console.error(`[redisV4] connection error: ${err.message}`);
  });
  redis.on("connect", () => {
    console.info("[redisV4] connected");
  });
  redis.on("reconnecting", () => {
    const now = Date.now();
    if (now - _lastRedisErrorLogAt < 60_000) return;
    _lastRedisErrorLogAt = now;
    console.warn("[redisV4] reconnecting…");
  });
}

export function getRedis(): IORedis {
  if (_redis) return _redis;

  const url =
    process.env.REDIS_URL?.trim() ||
    process.env.REDIS_URL_V4?.trim();
  if (url) {
    _redis = new IORedis(url, REDIS_COMMON_OPTIONS);
    attachRedisListeners(_redis);
    return _redis;
  }

  const host =
    process.env.REDIS_HOSTNAME?.trim() ||
    process.env.REDIS_HOST?.trim() ||
    process.env.REDISCACHEHOSTNAME?.trim();
  const password =
    process.env.REDIS_PASSWORD?.trim() ||
    process.env.REDISCACHEKEY?.trim();

  if (!host || !password) {
    throw new Error("Redis not configured: set REDIS_URL or REDIS_HOSTNAME + REDIS_PASSWORD");
  }

  const port = Number(process.env.REDIS_PORT?.trim() || "6380");
  const useTls = process.env.REDIS_TLS !== "false";

  _redis = new IORedis({
    host,
    port,
    password,
    tls: useTls ? {} : undefined,
    ...REDIS_COMMON_OPTIONS,
  });
  attachRedisListeners(_redis);
  return _redis;
}

/** 启动时探测 Redis 连通性（不阻塞 worker 调度）。 */
export async function pingRedis(): Promise<boolean> {
  try {
    const pong = await getRedis().ping();
    return pong === "PONG";
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[redisV4] ping failed: ${message}`);
    return false;
  }
}

export const HINT_KEYS = {
  init: "translate:v4:hint:init",
  translate: "translate:v4:hint:translate",
  writeback: "translate:v4:hint:writeback",
  verify: "translate:v4:hint:verify",
  analysis: "translate:v4:hint:analysis",
} as const;

export type HintPayload = { taskId: string; shopName: string };
export type AnalysisHintPayload = {
  shopName: string;
  sourceLanguage: string;
  modules: string[];
  target?: "profile" | "glossary" | "both";
};

export async function popHint(
  stage: keyof typeof HINT_KEYS,
): Promise<HintPayload | null> {
  try {
    const raw = await getRedis().lpop(HINT_KEYS[stage]);
    if (!raw) return null;
    return JSON.parse(raw) as HintPayload;
  } catch {
    return null;
  }
}

/** 新任务入队尾（FIFO），LPOP 队头消费，跨店公平；同店串行由 worker claim 保证。 */
export async function pushHint(
  stage: keyof typeof HINT_KEYS,
  payload: HintPayload,
): Promise<void> {
  try {
    await getRedis().rpush(HINT_KEYS[stage], JSON.stringify(payload));
  } catch {
    // best-effort
  }
}

/** Re-queue at tail so LPOP head can pick a different shop's hint next tick. */
export async function requeueHintTail(
  stage: keyof typeof HINT_KEYS,
  payload: HintPayload,
): Promise<void> {
  try {
    await getRedis().rpush(HINT_KEYS[stage], JSON.stringify(payload));
  } catch {
    // best-effort
  }
}

// ── 店铺画像扫描（Shop Profile Scan）hint 队列 ─────────────────────────────────
// 与翻译 v4 pipeline 解耦，独立 key。触发端 push、shopScanWorker 消费；
// 兜底靠 worker 轮询 Cosmos shop_scan_jobs（CREATED/QUEUED），hint 只做「立即唤醒」。
export const SHOP_SCAN_HINT_KEY = "tsf:shop_scan:hints";

export type ShopScanHintPayload = { scanId: string; shopName: string };

export async function popShopScanHint(): Promise<ShopScanHintPayload | null> {
  try {
    const raw = await getRedis().lpop(SHOP_SCAN_HINT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ShopScanHintPayload;
  } catch {
    return null;
  }
}

export async function pushShopScanHint(payload: ShopScanHintPayload): Promise<void> {
  try {
    await getRedis().lpush(SHOP_SCAN_HINT_KEY, JSON.stringify(payload));
  } catch {
    // best-effort
  }
}

/** Re-queue at tail so LPOP head can pick a different shop's hint next tick. */
export async function requeueShopScanHintTail(
  payload: ShopScanHintPayload,
): Promise<void> {
  try {
    await getRedis().rpush(SHOP_SCAN_HINT_KEY, JSON.stringify(payload));
  } catch {
    // best-effort
  }
}

const PROGRESS_TTL = 7 * 24 * 3600; // 7 days in seconds

export function progressKey(taskId: string): string {
  return `translate:v4:progress:${taskId}`;
}

export const AUTO_SCAN_LAST_AT_KEY = "translate:v4:auto_scan:last_at";

export async function setAutoScanLastAt(at: string): Promise<void> {
  try {
    await getRedis().set(AUTO_SCAN_LAST_AT_KEY, at);
  } catch {
    // best-effort
  }
}

export async function clearTaskRedis(taskId: string): Promise<void> {
  try {
    await getRedis().del(progressKey(taskId), controlKey(taskId));
  } catch {
    // best-effort
  }
}

/**
 * 任务运行时的外部控制键。外部（TSF/Spark 前端、运营、或额度耗尽逻辑）写入
 * "pause" / "cancel"，worker 在阶段中途的检查点读取后优雅中断。
 */
export function controlKey(taskId: string): string {
  return `translate:v4:control:${taskId}`;
}

export type V4Control = "pause" | "cancel" | null;

/** 读取任务的外部控制指令（无则 null）。 */
export async function readControl(taskId: string): Promise<V4Control> {
  try {
    const v = await getRedis().get(controlKey(taskId));
    return v === "pause" || v === "cancel" ? v : null;
  } catch {
    return null;
  }
}

/** 设置外部控制指令（TTL 1 天，避免残留）。 */
export async function setControl(
  taskId: string,
  action: "pause" | "cancel",
): Promise<void> {
  try {
    await getRedis().set(controlKey(taskId), action, "EX", 24 * 3600);
  } catch {
    // best-effort
  }
}

/** 清除控制指令（resume / 任务收尾时调用）。 */
export async function clearControl(taskId: string): Promise<void> {
  try {
    await getRedis().del(controlKey(taskId));
  } catch {
    // best-effort
  }
}

export async function setProgress(
  taskId: string,
  fields: Record<string, string | number>,
): Promise<void> {
  try {
    const redis = getRedis();
    const key = progressKey(taskId);
    const flat: string[] = [];
    for (const [k, v] of Object.entries(fields)) {
      flat.push(k, String(v));
    }
    flat.push("updatedAt", Date.now().toString());
    await redis.hset(key, ...flat);
    await redis.expire(key, PROGRESS_TTL);
  } catch {
    // best-effort
  }
}

export async function getProgress(
  taskId: string,
): Promise<Record<string, string>> {
  try {
    return await getRedis().hgetall(progressKey(taskId)) ?? {};
  } catch {
    return {};
  }
}

/**
 * 汇总页统计缓存键。TSF 汇总页直接读此 hash（field=module，value=JSON）。
 * 由 worker 任务完成时写入，TSF 缺失时现算并回写。
 */
export function itemsCountKey(shopName: string, locale: string): string {
  return `tsf:items_count:${shopName}:${locale}`;
}

/** 写入某 module 的统计（total/translated），随 hash 续期 TTL。 */
export async function setItemsCount(
  shopName: string,
  locale: string,
  module: string,
  value: { total: number; translated: number },
): Promise<boolean> {
  try {
    const redis = getRedis();
    const key = itemsCountKey(shopName, locale);
    await redis.hset(
      key,
      module,
      JSON.stringify({ ...value, updatedAt: new Date().toISOString() }),
    );
    await redis.expire(key, PROGRESS_TTL);
    return true;
  } catch {
    return false;
  }
}

// ── 自动翻译完成邮件：店铺级分布式锁 ──────────────────────────────────────────
// 防止多 worker 实例 / 重叠轮询在 emailSent 落库前对同一店重复发 SES。
// Redis 不可用时返回 skipped（宁可本轮不发，也不无锁双发）。

const EMAIL_SHOP_LOCK_PREFIX = "translate:v4:email:lock:";
/** 覆盖 SES + 多 job 串行 markEmailSent；超时后其他实例可重试。 */
const EMAIL_SHOP_LOCK_TTL_SEC = Math.max(
  30,
  Number(process.env.EMAIL_SHOP_LOCK_TTL_SEC) || 120,
);

/** 仅当 value 仍是本持有者 token 时删除，避免误删他人锁。 */
const RELEASE_LOCK_LUA = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
end
return 0
`;

export function emailShopLockKey(shopName: string): string {
  return `${EMAIL_SHOP_LOCK_PREFIX}${shopName}`;
}

export type ShopEmailLockResult =
  | { status: "acquired"; token: string }
  | { status: "busy" }
  | { status: "unavailable"; errorMessage: string };

/** SET NX EX：同一店同一时刻只允许一个 email 流程。 */
export async function tryAcquireShopEmailLock(
  shopName: string,
): Promise<ShopEmailLockResult> {
  const key = emailShopLockKey(shopName);
  const token = randomUUID();
  try {
    const ok = await getRedis().set(key, token, "EX", EMAIL_SHOP_LOCK_TTL_SEC, "NX");
    if (ok === "OK") return { status: "acquired", token };
    return { status: "busy" };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return { status: "unavailable", errorMessage };
  }
}

/** 释放本持有者的锁；token 不匹配或已过期时静默成功。 */
export async function releaseShopEmailLock(
  shopName: string,
  token: string,
): Promise<void> {
  try {
    await getRedis().eval(RELEASE_LOCK_LUA, 1, emailShopLockKey(shopName), token);
  } catch {
    // best-effort：TTL 会兜底
  }
}

/**
 * 持锁执行店铺自动邮件流程。
 * - busy / Redis 不可用：不执行 fn，返回对应 status（调用方打日志并跳过本轮）
 * - acquired：执行 fn，finally 释放锁，返回 ran
 */
export async function withShopEmailLock<T>(
  shopName: string,
  fn: () => Promise<T>,
): Promise<
  | { status: "ran"; result: T }
  | { status: "busy" }
  | { status: "unavailable"; errorMessage: string }
> {
  const acquired = await tryAcquireShopEmailLock(shopName);
  if (acquired.status === "busy") return acquired;
  if (acquired.status === "unavailable") return acquired;
  try {
    const result = await fn();
    return { status: "ran", result };
  } finally {
    await releaseShopEmailLock(shopName, acquired.token);
  }
}
