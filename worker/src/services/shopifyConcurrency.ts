/**
 * 按 shop 的 Shopify API 自适应并发。
 *
 * shopifyFetch 每次响应后调用 noteShopifyThrottle，依据 extensions.cost.throttleStatus
 * 与 429 实时调节并发：桶富余 → 提速，桶紧张 / 429 → 降速。
 * init / writeback / verify 用 runShopifyAdaptive 跑，并发随 cap 动态增减。
 */
const MIN_CAP = 1;
const MAX_CAP = Math.max(1, Number(process.env.SHOPIFY_MAX_CONCURRENCY) || 10);
const INIT_CAP = Math.max(
  MIN_CAP,
  Math.min(MAX_CAP, Number(process.env.SHOPIFY_INIT_CONCURRENCY) || 3),
);
/** 单次 translationsRegister 估算消耗点数（用于由 bucket 反推安全并发）。 */
const POINTS_PER_REQUEST = Math.max(
  1,
  Number(process.env.SHOPIFY_POINTS_PER_REQUEST) || 12,
);
const CAP_WATCH_MS = Math.max(
  100,
  Number(process.env.SHOPIFY_CAP_WATCH_MS) || 400,
);

export type ShopifyThrottleSnapshot = {
  currentlyAvailable: number;
  maximumAvailable: number;
  restoreRate?: number;
};

type ShopConc = { cap: number };
const _conc = new Map<string, ShopConc>();

function entry(shop: string): ShopConc {
  let c = _conc.get(shop);
  if (!c) {
    c = { cap: INIT_CAP };
    _conc.set(shop, c);
  }
  return c;
}

export function getShopifyCap(shop: string): number {
  return entry(shop).cap;
}

function clampCap(n: number): number {
  return Math.min(MAX_CAP, Math.max(MIN_CAP, n));
}

function bucketDerivedCap(throttle: ShopifyThrottleSnapshot): number {
  return clampCap(Math.floor(throttle.currentlyAvailable / POINTS_PER_REQUEST));
}

/**
 * 每次 Shopify 响应后调用：依据桶余量 + 429 实时调节并发（无死区，持续升降）。
 */
export function noteShopifyThrottle(
  shop: string,
  throttle: ShopifyThrottleSnapshot | null | undefined,
  was429: boolean,
): void {
  const c = entry(shop);
  const prev = c.cap;

  if (was429) {
    c.cap = Math.max(MIN_CAP, Math.floor(c.cap / 2));
  } else if (throttle && throttle.maximumAvailable > 0) {
    const ratio = throttle.currentlyAvailable / throttle.maximumAvailable;
    const fromBucket = bucketDerivedCap(throttle);

    let stepped = c.cap;
    if (ratio >= 0.7) stepped = Math.min(MAX_CAP, c.cap + 3);
    else if (ratio >= 0.55) stepped = Math.min(MAX_CAP, c.cap + 2);
    else if (ratio >= 0.4) stepped = Math.min(MAX_CAP, c.cap + 1);
    else if (ratio <= 0.15) stepped = Math.max(MIN_CAP, Math.floor(c.cap / 2));
    else if (ratio <= 0.3) stepped = Math.max(MIN_CAP, c.cap - 1);

    const target = Math.max(fromBucket, stepped);
    // 平滑逼近 bucket 推导值，避免抖动但保持对 rate limit 的跟随
    c.cap = clampCap(Math.round(c.cap * 0.35 + target * 0.65));
  }

  if (c.cap !== prev && process.env.SHOPIFY_LOG_CAP_CHANGES !== "0") {
    const bucket =
      throttle && throttle.maximumAvailable > 0
        ? ` bucket=${throttle.currentlyAvailable}/${throttle.maximumAvailable}`
        : was429
          ? " (429)"
          : "";
    console.log(`[shopifyAdaptive] ${shop} concurrency ${prev} → ${c.cap}${bucket}`);
  }
}

export type RunShopifyAdaptiveOptions = {
  /** 并发上限（如 init 的 module 数）；默认仅受 getShopifyCap / MAX_CAP 约束。 */
  maxConcurrency?: number;
  /** 为 true 时任一项失败则 reject（init 需要）；默认 false 仅打日志（writeback）。 */
  propagateErrors?: boolean;
};

function effectiveShopifyCap(shop: string, maxConcurrency?: number): number {
  const adaptive = getShopifyCap(shop);
  const ceiling =
    maxConcurrency != null && maxConcurrency > 0
      ? Math.min(maxConcurrency, MAX_CAP)
      : MAX_CAP;
  return Math.max(MIN_CAP, Math.min(adaptive, ceiling));
}

/**
 * 自适应并发跑一批任务：在飞数量随 getShopifyCap(shop) 动态增减。
 * cap 上升时通过定时 pump 尽快加并发（不必等慢请求先完成）。
 */
export async function runShopifyAdaptive<T>(
  shop: string,
  items: T[],
  fn: (item: T, index: number) => Promise<void>,
  options: RunShopifyAdaptiveOptions = {},
): Promise<void> {
  if (items.length === 0) return;

  const { maxConcurrency, propagateErrors = false } = options;

  let next = 0;
  let active = 0;
  let lastSeenCap = effectiveShopifyCap(shop, maxConcurrency);
  let capWatch: ReturnType<typeof setInterval> | null = null;
  let firstError: unknown = null;

  await new Promise<void>((resolve, reject) => {
    const finish = () => {
      if (capWatch) clearInterval(capWatch);
      if (firstError) reject(firstError);
      else resolve();
    };

    const pump = () => {
      if (firstError) {
        if (active === 0) finish();
        return;
      }
      if (next >= items.length && active === 0) {
        finish();
        return;
      }
      const cap = effectiveShopifyCap(shop, maxConcurrency);
      lastSeenCap = cap;
      while (active < cap && next < items.length) {
        const i = next++;
        active++;
        Promise.resolve()
          .then(() => fn(items[i], i))
          .catch((e) => {
            if (propagateErrors) {
              if (!firstError) firstError = e;
            } else {
              console.error(`[shopifyAdaptive] item ${i} failed:`, e);
            }
          })
          .finally(() => {
            active--;
            pump();
          });
      }
    };

    capWatch = setInterval(() => {
      const cap = effectiveShopifyCap(shop, maxConcurrency);
      if (cap > lastSeenCap && next < items.length && !firstError) {
        lastSeenCap = cap;
        pump();
      }
    }, CAP_WATCH_MS);

    pump();
  });
}
