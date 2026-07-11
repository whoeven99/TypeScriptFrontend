export type ShopQuota = {
  shopName: string;
  maxToken: number;
  usedToken: number;
  remaining: number;
};

export function normalizeQuotaNumber(value: unknown): number | null {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.trim())
        : Number.NaN;

  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.floor(parsed));
}

export function normalizeShopQuota(
  quota: ShopQuota | null | undefined,
): ShopQuota | null {
  if (!quota) return null;
  const shopName =
    typeof quota.shopName === "string" ? quota.shopName.trim() : "";
  const maxToken = normalizeQuotaNumber(quota.maxToken);
  const usedToken = normalizeQuotaNumber(quota.usedToken);
  const remaining = normalizeQuotaNumber(quota.remaining);

  if (!shopName || maxToken == null || usedToken == null || remaining == null) {
    return null;
  }

  return {
    shopName,
    maxToken,
    usedToken,
    remaining,
  };
}

export function getNormalizedQuotaRemaining(
  quota: Pick<ShopQuota, "remaining"> | null | undefined,
): number | null {
  return normalizeQuotaNumber(quota?.remaining);
}
