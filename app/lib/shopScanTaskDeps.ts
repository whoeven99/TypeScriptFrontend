/**
 * 店铺扫描任务依赖校验（客户端 / 服务端共用）。
 * 不要放进 *.server.ts：profile 页按钮需要在浏览器侧复用同一套规则。
 */

export type ShopScanTaskStatus = "CREATED" | "QUEUED" | "SCANNING" | "COMPLETED" | "PARTIAL" | "SKIPPED" | "FAILED";

export type ShopScanTaskName =
  | "content_size"
  | "coverage"
  | "profile_material"
  | "profile_identity"
  | "market_locale"
  | "catalog_material"
  | "editorial_material"
  | "style_material"
  | "profile_ai"
  | "glossary_samples"
  | "glossary_ai";

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

function isSuccessfulScanStatus(status: ShopScanTaskStatus | undefined): boolean {
  return status === "COMPLETED";
}

/** AI 任务前置依赖：未满足时返回人类可读说明，满足则返回 null。 */
export function getShopScanDependencyMessage(
  task: ShopScanTaskName,
  latestByTask: Partial<Record<ShopScanTaskName, { status: ShopScanTaskStatus }>>,
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
