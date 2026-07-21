import { randomUUID } from "node:crypto";
import {
  createShopScanJob,
  getLatestShopScanJobsByTask,
  type ShopScanTask,
  type ShopScanTrigger,
} from "./cosmos.server";
import { pushShopScanHint } from "~/server/translateV4/redis.server";
<<<<<<< HEAD
import { isProductionNodeEnv } from "~/config/nodeEnv.server";
import {
  getShopScanDependencyMessage,
  type EnqueueShopScanResult,
} from "~/lib/shopScanTaskDeps";
=======
>>>>>>> origin/master

/**
 * 店铺扫描（Shop Scan）通用触发入口。
 *
 * - install：安装/首次进 App 触发计量扫描（contentSize + coverage），幂等
 *   （已有进行中或已完成的计量扫描则跳过），避免每次进 /app 重复扫。
 * - scheduled：定期复扫计量，覆写当前生效 summary / Redis 缓存。
 * - manual：仅跑 AI 阶段（profile + glossary）；调试页入口，生产可不暴露 UI。
 *
<<<<<<< HEAD
 * 生产环境默认不入队；与 shop-profile 页面门禁一致，仅允许 ciwishop 的
 * manual 任务入队（测试服也常配 NODE_ENV=production）。
 * 全程 best-effort：Cosmos/Redis 不可用时静默返回，绝不阻断 App 加载。
 */

function isCiwishop(shop: string): boolean {
  return shop.replace(/\.myshopify\.com$/i, "") === "ciwishop";
}

export type { EnqueueShopScanReason, EnqueueShopScanResult } from "~/lib/shopScanTaskDeps";
export { getShopScanDependencyMessage } from "~/lib/shopScanTaskDeps";
=======
 * 生产环境允许 install/scheduled 入队。全程 best-effort：Cosmos/Redis
 * 不可用时静默返回，绝不阻断 App 加载。
 */

export type EnqueueShopScanResult = {
  enqueued: boolean;
  scanId?: string;
  reason?: "skipped_existing" | "not_configured" | "error";
};
>>>>>>> origin/master

function shopScanCosmosConfigured(): boolean {
  return Boolean(
    process.env.COSMOS_ENDPOINT_V4?.trim() && process.env.COSMOS_KEY_V4?.trim(),
  );
}

function buildScanId(shop: string): string {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  return `${shop}-${stamp}-${randomUUID().slice(0, 8)}`;
}

function buildProfileWorkspacePrefix(shop: string): string {
  return `shop-scan/${shop}/profile-workspace`;
}

function buildGlossaryWorkspacePrefix(shop: string): string {
  return `shop-scan/${shop}/glossary-workspace`;
}

function resolveBlobPrefix(shop: string, scanId: string, task: ShopScanTask): string {
  switch (task) {
    case "profile_material":
    case "profile_identity":
    case "market_locale":
    case "catalog_material":
    case "editorial_material":
    case "style_material":
      return buildProfileWorkspacePrefix(shop);
    case "glossary_samples":
      return buildGlossaryWorkspacePrefix(shop);
    default:
      return `shop-scan/${shop}/${scanId}`;
  }
}

export async function enqueueShopScan({
  shop,
  trigger,
  task,
}: {
  shop: string;
  trigger: ShopScanTrigger;
  task: ShopScanTask;
}): Promise<EnqueueShopScanResult> {
<<<<<<< HEAD
  // 生产默认关闭；ciwishop 手动任务放行（与 profile 页门禁一致，兼容测试服 NODE_ENV=production）。
  if (isProductionNodeEnv() && !(trigger === "manual" && isCiwishop(shop))) {
    return {
      enqueued: false,
      reason: "disabled_in_production",
      message: "生产环境已禁用店铺扫描入队（仅 ciwishop 手动任务可用）",
    };
  }

=======
>>>>>>> origin/master
  if (!shop || !shopScanCosmosConfigured()) {
    return {
      enqueued: false,
      reason: "not_configured",
      message: "Cosmos 未配置，无法创建扫描任务",
    };
  }

  try {
<<<<<<< HEAD
    if (task === "profile_ai" || task === "glossary_ai") {
      const latestByTask = await getLatestShopScanJobsByTask(shop);
      const dependencyMessage = getShopScanDependencyMessage(task, latestByTask);
      if (dependencyMessage) {
        return {
          enqueued: false,
          reason: "dependency_not_met",
          message: dependencyMessage,
        };
      }
=======
    // install 幂等：已有进行中或已完成的计量扫描则跳过（scheduled/manual 允许重扫）
    if (trigger === "install") {
      const exists = await hasActiveOrCompletedShopScan(shop);
      if (exists) return { enqueued: false, reason: "skipped_existing" };
>>>>>>> origin/master
    }

    const scanId = buildScanId(shop);
    const blobPrefix = resolveBlobPrefix(shop, scanId, task);
    await createShopScanJob({
      scanId,
      shop,
      trigger,
      mode: task.endsWith("_ai") ? "ai_only" : "data_only",
      task,
      blobPrefix,
    });
    await pushShopScanHint({ scanId, shopName: shop });
    return { enqueued: true, scanId };
  } catch (error) {
    console.error(
      `[shopScan] enqueue failed shop=${shop} trigger=${trigger}:`,
      error instanceof Error ? error.message : error,
    );
    return {
      enqueued: false,
      reason: "error",
      message: "创建扫描任务失败，请稍后重试",
    };
  }
}
