import crypto from "node:crypto";

/**
 * 校验 Shopify App Proxy 的 HMAC 签名。
 *
 * @see https://shopify.dev/docs/apps/build/online-store/app-proxies/authenticate-app-proxies
 * 与其他 Shopify HMAC 不同：各 param 格式化为 `key=value`（同 key 多值用逗号拼接）后
 * 按字典序排序，再**无分隔符**直接拼接，最后 HMAC-SHA256 hex。
 *
 * 使用 raw query 解析，避免 URLSearchParams 对参数的 decode/重排干扰签名校验。
 */
export function verifyAppProxyHmac(url: URL, apiSecret: string): boolean {
  const rawQuery = url.search.startsWith("?") ? url.search.slice(1) : url.search;
  const sigMatch = rawQuery.match(/(?:^|&)signature=([^&]*)/);
  if (!sigMatch?.[1]) return false;
  const signature = decodeURIComponent(sigMatch[1].replace(/\+/g, " "));

  const grouped = new Map<string, string[]>();
  for (const part of rawQuery.split("&")) {
    if (!part) continue;
    const eqIdx = part.indexOf("=");
    const rawKey = eqIdx === -1 ? part : part.slice(0, eqIdx);
    const rawValue = eqIdx === -1 ? "" : part.slice(eqIdx + 1);
    const key = decodeURIComponent(rawKey.replace(/\+/g, " "));
    if (key === "signature") continue;
    const value = decodeURIComponent(rawValue.replace(/\+/g, " "));
    const list = grouped.get(key) ?? [];
    list.push(value);
    grouped.set(key, list);
  }

  const pairs = [...grouped.entries()]
    .map(([key, values]) => `${key}=${values.join(",")}`)
    .sort();

  const message = pairs.join("");
  const expected = crypto
    .createHmac("sha256", apiSecret)
    .update(message, "utf8")
    .digest("hex");

  try {
    const sigBuf = Buffer.from(signature, "hex");
    const expBuf = Buffer.from(expected, "hex");
    if (sigBuf.length !== expBuf.length) return false;
    return crypto.timingSafeEqual(expBuf, sigBuf);
  } catch {
    return false;
  }
}
