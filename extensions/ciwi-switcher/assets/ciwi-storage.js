// storage.js
/**
 * 简单 localStorage TTL 封装
 */

export function setWithTTL(key, value, ttlMs = 1000 * 60 * 60) {
  const payload = { ts: Date.now(), ttl: ttlMs, data: value };
  try {
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (e) {
    console.warn("setWithTTL failed", e);
  }
}

export function getWithTTL(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return null;
    if (Date.now() - obj.ts > (obj.ttl || 0)) {
      localStorage.removeItem(key);
      return null;
    }
    return obj.data;
  } catch (e) {
    console.warn("getWithTTL failed", e);
    return null;
  }
}

/**
 * useCacheThenRefresh:
 *  - 如果没有缓存 => await fetcher() 并保存，返回 fresh（与原第一次调用逻辑一致）
 *  - 如果有缓存 => 立即返回缓存，并在后台执行 fetcher() 来刷新缓存（这就保留了你说的“最多两次”的调用语义）
 *
 * @param {string} key
 * @param {() => Promise<any>} fetcher
 * @param {number} ttlMs
 * @param {boolean} refreshInBackground
 */
export async function useCacheThenRefresh(
  key,
  fetcher,
  ttlMs = 1000 * 60 * 60,
) {
  const cached = getWithTTL(key);
  if (!cached) {
    const fresh = await fetcher();
    if (fresh !== null && fresh !== undefined) setWithTTL(key, fresh, ttlMs);
    return fresh;
  }
  return cached;
}
