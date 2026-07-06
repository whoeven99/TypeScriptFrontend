import { randomUUID } from "node:crypto";
import {
  createShopScanJob,
  hasActiveOrCompletedShopScan,
  type ShopScanTrigger,
} from "./cosmos.server";
import { pushShopScanHint } from "~/server/translateV4/redis.server";

/**
 * 店铺画像扫描（Shop Profile Scan）通用触发入口。
 *
 * - install：安装/首次进 App 触发，幂等（已有进行中或已完成扫描则跳过），
 *   避免每次进 /app 重复扫。
 * - scheduled / manual：未来定期巡检 / 手动刷新复用同一套（本期仅预留）。
 *
 * 全程 best-effort：Cosmos/Redis 不可用时静默返回，绝不阻断 App 加载。
 */

export type EnqueueShopScanResult = {
  enqueued: boolean;
  scanId?: string;
  reason?: "skipped_existing" | "not_configured" | "error";
};

function shopScanCosmosConfigured(): boolean {
  return Boolean(
    process.env.COSMOS_ENDPOINT_V4?.trim() && process.env.COSMOS_KEY_V4?.trim(),
  );
}

function buildScanId(shop: string): string {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  return `${shop}-${stamp}-${randomUUID().slice(0, 8)}`;
}

export async function enqueueShopScan({
  shop,
  trigger,
}: {
  shop: string;
  trigger: ShopScanTrigger;
}): Promise<EnqueueShopScanResult> {
  if (!shop || !shopScanCosmosConfigured()) {
    return { enqueued: false, reason: "not_configured" };
  }

  try {
    // install 幂等：已有进行中或已完成扫描则跳过（未来 scheduled/manual 允许重扫）
    if (trigger === "install") {
      const exists = await hasActiveOrCompletedShopScan(shop);
      if (exists) return { enqueued: false, reason: "skipped_existing" };
    }

    const scanId = buildScanId(shop);
    const blobPrefix = `shop-scan/${shop}/${scanId}`;
    await createShopScanJob({ scanId, shop, trigger, blobPrefix });
    await pushShopScanHint({ scanId, shopName: shop });
    return { enqueued: true, scanId };
  } catch (error) {
    console.error(
      `[shopScan] enqueue failed shop=${shop} trigger=${trigger}:`,
      error instanceof Error ? error.message : error,
    );
    return { enqueued: false, reason: "error" };
  }
}
