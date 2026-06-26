import crypto from "node:crypto";

/**
 * 校验 Shopify App Proxy 的 HMAC 签名。
 *
 * @see https://shopify.dev/docs/apps/build/online-store/app-proxies/authenticate-app-proxies
 * 与其他 Shopify HMAC 不同：各 param 格式化为 `key=value`（同 key 多值用逗号拼接）后
 * 按字典序排序，再**无分隔符**直接拼接，最后 HMAC-SHA256 hex。
 */
export function verifyAppProxyHmac(url: URL, apiSecret: string): boolean {
  const signature = url.searchParams.get("signature");
  if (!signature) return false;

  const grouped = new Map<string, string[]>();
  for (const [key, value] of url.searchParams.entries()) {
    if (key === "signature") continue;
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
    // signature 可能长度不一致（HMAC hex 应固定 64 字符），安全比较
    const sigBuf = Buffer.from(signature, "hex");
    const expBuf = Buffer.from(expected, "hex");
    if (sigBuf.length !== expBuf.length) return false;
    return crypto.timingSafeEqual(expBuf, sigBuf);
  } catch {
    return false;
  }
}
