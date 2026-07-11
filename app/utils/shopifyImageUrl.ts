function normalizeImageCandidate(
  url: string | null | undefined,
): string | null {
  if (!url) return null;

  const raw = String(url).trim();
  if (!raw) return null;

  const candidate = raw.split(",")[0]?.trim().split(/\s+/)[0]?.trim();
  if (!candidate) return null;

  try {
    return new URL(candidate, "https://shopify-image.local").pathname;
  } catch {
    const withoutQuery = candidate.split("?")[0]?.split("#")[0]?.trim();
    return withoutQuery || null;
  }
}

function normalizeShopifyFilesPath(pathname: string | null | undefined): string | null {
  if (!pathname) return null;
  const normalized = pathname.trim();
  if (!normalized) return null;

  const filesMarker = "/files/";
  const lastFilesIndex = normalized.lastIndexOf(filesMarker);
  if (lastFilesIndex >= 0) {
    const afterFiles = normalized.slice(lastFilesIndex + filesMarker.length).trim();
    return afterFiles || null;
  }

  return null;
}

/**
 * 生成 Shopify 图片匹配 key。
 * 优先使用完整 pathname，避免只按文件名匹配时把同名图片串位。
 */
export function shopifyFilesImageKey(
  url: string | null | undefined,
): string | null {
  const pathname = normalizeImageCandidate(url);
  const filesPath = normalizeShopifyFilesPath(pathname);
  if (filesPath) return filesPath;
  if (pathname) return pathname;

  if (!url) return null;
  const base = String(url).split("/").pop() || "";
  return base.split("?")[0]?.trim() || null;
}

export function sameShopifyImageUrl(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  if (!a || !b) return false;
  if (a === b) return true;

  const normalizedA = normalizeImageCandidate(a);
  const normalizedB = normalizeImageCandidate(b);
  const filesKeyA = normalizeShopifyFilesPath(normalizedA);
  const filesKeyB = normalizeShopifyFilesPath(normalizedB);
  if (filesKeyA && filesKeyB) {
    return filesKeyA === filesKeyB;
  }
  if (normalizedA && normalizedB) {
    return normalizedA === normalizedB;
  }

  const ka = shopifyFilesImageKey(a);
  const kb = shopifyFilesImageKey(b);
  return !!ka && !!kb && ka === kb;
}
