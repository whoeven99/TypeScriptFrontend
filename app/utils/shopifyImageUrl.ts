/**
 * 对齐 ciwi-switcher：用 /files/ 后的文件名匹配 Shopify 图，
 * 忽略 host / 路径前缀 / ?v= 查询串变化，避免 Admin 精确 === 对不上库里的 imageBeforeUrl。
 */
export function shopifyFilesImageKey(
  url: string | null | undefined,
): string | null {
  if (!url) return null;
  const afterFiles = url.split("/files/")[2];
  if (afterFiles) {
    return afterFiles.split("?")[0]?.trim() || null;
  }
  try {
    const pathname = new URL(url).pathname;
    const base = pathname.split("/").pop() || "";
    return base.split("?")[0]?.trim() || null;
  } catch {
    const base = url.split("/").pop() || "";
    return base.split("?")[0]?.trim() || null;
  }
}

export function sameShopifyImageUrl(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  const ka = shopifyFilesImageKey(a);
  const kb = shopifyFilesImageKey(b);
  return !!ka && !!kb && ka === kb;
}
