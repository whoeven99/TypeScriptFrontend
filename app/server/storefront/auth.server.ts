import crypto from "node:crypto";

/**
 * 校验 Shopify App Proxy 的 HMAC 签名。
 *
 * Shopify 将请求转发给 TSF 时附带 `signature` query param，
 * 值为所有其他 query params（按 key 排序后拼 `k=v&k=v`）的 HMAC-SHA256 hex。
 */
export function verifyAppProxyHmac(url: URL, apiSecret: string): boolean {
  const signature = url.searchParams.get("signature");
  if (!signature) return false;

  const pairs: string[] = [];
  for (const [key, value] of url.searchParams.entries()) {
    if (key !== "signature") {
      pairs.push(`${key}=${value}`);
    }
  }
  pairs.sort();

  const message = pairs.join("&");
  const expected = crypto
    .createHmac("sha256", apiSecret)
    .update(message, "utf8")
    .digest("hex");

  try {
    // signature 可能长度不一致（HMAC hex 应固定 64 字符），安全比较
    const sigBuf = Buffer.from(signature, "hex");
    const expBuf = Buffer.from(expected, "hex");
    if (sigBuf.length !== expBuf.length) return false;
    return crypto.timingSafeEqual(expBuf, sigBuf);
  } catch {
    return false;
  }
}
