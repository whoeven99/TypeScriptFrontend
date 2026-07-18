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

/** 模块化画像素材必须写到共享 profile-workspace，旧 per-job 前缀不能解锁 AI。 */
function isWorkspaceBackedProfileMaterial(job?: {
  status?: ShopScanTaskStatus;
  blobPrefix?: string | null;
}): boolean {
  if (!isSuccessfulScanStatus(job?.status)) return false;
  const prefix = job?.blobPrefix?.trim() ?? "";
  return prefix.endsWith("/profile-workspace") || prefix.includes("/profile-workspace/");
}

/** AI 任务前置依赖：未满足时返回人类可读说明，满足则返回 null。 */
export function getShopScanDependencyMessage(
  task: ShopScanTaskName,
  latestByTask: Partial<
    Record<ShopScanTaskName, { status: ShopScanTaskStatus; blobPrefix?: string | null }>
  >,
): string | null {
  if (task === "profile_ai") {
    const hasMaterial =
      isWorkspaceBackedProfileMaterial(latestByTask.profile_material) ||
      isWorkspaceBackedProfileMaterial(latestByTask.profile_identity);
    if (!hasMaterial) {
      return "请先重新执行「扫描全部画像源」（写入 profile-workspace）后，再生成参数产物。仅扫描 Theme 或旧版素材不够。";
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
