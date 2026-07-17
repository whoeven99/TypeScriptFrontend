import { randomUUID } from "node:crypto";
import {
  createShopScanJob,
  getLatestShopScanJobsByTask,
  type ShopScanStatus,
  type ShopScanTask,
  type ShopScanTrigger,
} from "./cosmos.server";
import { pushShopScanHint } from "~/server/translateV4/redis.server";
import { isProductionNodeEnv } from "~/config/nodeEnv.server";

/**
 * 店铺画像扫描（Shop Profile Scan）通用触发入口。
 *
 * - install：安装/首次进 App 触发，幂等（已有进行中或已完成扫描则跳过），
 *   避免每次进 /app 重复扫。
 * - scheduled / manual：未来定期巡检 / 手动刷新复用同一套（本期仅预留）。
 *
 * 生产环境默认不入队；与 shop-profile 页面门禁一致，仅允许 ciwishop 的
 * manual 任务入队（测试服也常配 NODE_ENV=production）。
 * 全程 best-effort：Cosmos/Redis 不可用时静默返回，绝不阻断 App 加载。
 */

function isCiwishop(shop: string): boolean {
  return shop.replace(/\.myshopify\.com$/i, "") === "ciwishop";
}

export type EnqueueShopScanReason =
  | "skipped_existing"
  | "not_configured"
  | "disabled_in_production"
  | "dependency_not_met"
  | "error";

export type EnqueueShopScanResult = {
  enqueued: boolean;
  scanId?: string;
  reason?: EnqueueShopScanReason;
  message?: string;
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

function isSuccessfulScanStatus(status: ShopScanStatus | undefined): boolean {
  return status === "COMPLETED";
}

/** AI 任务前置依赖：未满足时返回人类可读说明，满足则返回 null。 */
export function getShopScanDependencyMessage(
  task: ShopScanTask,
  latestByTask: Partial<Record<ShopScanTask, { status: ShopScanStatus }>>,
): string | null {
  if (task === "profile_ai") {
    const hasMaterial =
      isSuccessfulScanStatus(latestByTask.profile_material?.status) ||
      isSuccessfulScanStatus(latestByTask.profile_identity?.status);
    if (!hasMaterial) {
      return "请先完成「扫描全部画像源」或「扫描店铺身份」，再生成店铺画像";
    }
    return null;
  }

  if (task === "glossary_ai") {
    if (!isSuccessfulScanStatus(latestByTask.glossary_samples?.status)) {
      return "请先完成「扫描术语样本」，再生成术语建议";
    }
    return null;
  }

  return null;
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
  // 生产默认关闭；ciwishop 手动任务放行（与 profile 页门禁一致，兼容测试服 NODE_ENV=production）。
  if (isProductionNodeEnv() && !(trigger === "manual" && isCiwishop(shop))) {
    return {
      enqueued: false,
      reason: "disabled_in_production",
      message: "生产环境已禁用店铺扫描入队（仅 ciwishop 手动任务可用）",
    };
  }

  if (!shop || !shopScanCosmosConfigured()) {
    return {
      enqueued: false,
      reason: "not_configured",
      message: "Cosmos 未配置，无法创建扫描任务",
    };
  }

  try {
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
