import { blobRead, blobWrite } from "../blobV4.js";

/**
 * Shop scan 稳定产物：每店一份 latest-scan.json（覆盖写 / patch 合并）。
 * 路径与 Cosmos job.blobPrefix 对齐：`shop-profile/{shop}` + `/latest-scan.json`。
 */

export type ShopProfileLatestCoverageRow = {
  locale: string;
  published?: boolean;
  translated: number;
  total: number;
  percent: number | null;
};

export type ShopProfileLatestScan = {
  shop: string;
  scanId?: string;
  trigger?: string;
  updatedAt: string;
  contentSize?: Record<string, unknown> | null;
  coverage?: ShopProfileLatestCoverageRow[] | null;
  /** 与旧 profile-facts.json 同形，供 readers 取 understanding/markets/signals。 */
  profile?: Record<string, unknown> | null;
  /** 轻量 glossary：perLocale[].terms；不含采样原文。 */
  glossary?: Record<string, unknown> | null;
};

export type ShopProfileLatestScanPatch = {
  scanId?: string;
  trigger?: string;
  contentSize?: Record<string, unknown> | null;
  coverage?: ShopProfileLatestCoverageRow[] | null;
  profile?: Record<string, unknown> | null;
  glossary?: Record<string, unknown> | null;
};

export function shopProfileArtifactPrefix(shop: string): string {
  return `shop-profile/${shop.trim()}`;
}

export function shopProfileLatestScanPath(shop: string): string {
  return `${shopProfileArtifactPrefix(shop)}/latest-scan.json`;
}

/** 建任务时写入 Cosmos 的稳定 blobPrefix。 */
export function shopProfileJobBlobPrefix(shop: string): string {
  return shopProfileArtifactPrefix(shop);
}

/**
 * 读现有 latest-scan → 合并 patch（未出现的段保留）→ 覆盖写回。
 */
export async function upsertShopProfileLatestScan(
  shop: string,
  patch: ShopProfileLatestScanPatch,
): Promise<void> {
  const trimmed = shop.trim();
  if (!trimmed) return;

  const path = shopProfileLatestScanPath(trimmed);
  const existing = (await blobRead<ShopProfileLatestScan>(path)) ?? {
    shop: trimmed,
    updatedAt: "",
  };

  const next: ShopProfileLatestScan = {
    shop: trimmed,
    scanId: patch.scanId ?? existing.scanId,
    trigger: patch.trigger ?? existing.trigger,
    updatedAt: new Date().toISOString(),
    contentSize:
      patch.contentSize !== undefined ? patch.contentSize : existing.contentSize ?? null,
    coverage: patch.coverage !== undefined ? patch.coverage : existing.coverage ?? null,
    profile: patch.profile !== undefined ? patch.profile : existing.profile ?? null,
    glossary: patch.glossary !== undefined ? patch.glossary : existing.glossary ?? null,
  };

  await blobWrite(path, next);
}
