import { randomUUID } from "node:crypto";
import {
  createShopScanJob,
  hasActiveOrCompletedShopScan,
  type ShopScanTrigger,
} from "./cosmos.server";
import { pushShopScanHint } from "~/server/translateV4/redis.server";

/**
 * 店铺扫描（Shop Scan）通用触发入口。
 *
 * - install：安装/首次进 App 触发计量扫描（contentSize + coverage），幂等
 *   （已有进行中或已完成的计量扫描则跳过），避免每次进 /app 重复扫。
 * - scheduled：定期复扫计量，覆写当前生效 summary / Redis 缓存。
 * - manual：仅跑 AI 阶段（profile）；glossary 已停用。调试页入口，生产可不暴露 UI。
 *
 * 生产环境允许 install/scheduled 入队。全程 best-effort：Cosmos/Redis
 * 不可用时静默返回，绝不阻断 App 加载。
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
    // install 幂等：已有进行中或已完成的计量扫描则跳过（scheduled/manual 允许重扫）
    if (trigger === "install") {
      const exists = await hasActiveOrCompletedShopScan(shop);
      if (exists) return { enqueued: false, reason: "skipped_existing" };
    }

    const scanId = buildScanId(shop);
    // 稳定产物前缀；明细合并写入 shop-profile/{shop}/latest-scan.json
    const blobPrefix = `shop-profile/${shop}`;
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
