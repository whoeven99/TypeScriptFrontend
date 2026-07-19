/**
 * 创建任务 / 开拓市场共用的展示用额度粗估。
 * 与 worker 实扣（LLM token × QUOTA_TOKEN_MULTIPLIER）不是同一公式。
 */
import { getLatestShopScanJob } from "~/server/shopScan/cosmos.server";
import { getShopCreditQuota } from "~/server/billing/quota/quotaRouter.server";
import { expandV2ModuleKeys } from "./moduleCatalog";

const CHARS_PER_WORD = 4;
const ESTIMATE_TOKEN_MULTIPLIER = Number(
  process.env.QUOTA_TOKEN_MULTIPLIER?.trim() || "1.5",
);

/** 无 scan 时：每个 v2 模块粗估字符（偏保守）。 */
const FALLBACK_CHARS_PER_V2_MODULE = 20_000;

/** 增量模式：未知覆盖率时不缩放，展示为上限；已知时下限 15%。 */
const INCREMENTAL_MIN_RATIO = 0.15;

export function estimateCreditsFromChars(chars: number): number {
  if (chars <= 0) return 0;
  const words = Math.ceil(chars / CHARS_PER_WORD);
  const mult = Number.isFinite(ESTIMATE_TOKEN_MULTIPLIER)
    ? ESTIMATE_TOKEN_MULTIPLIER
    : 1.5;
  return Math.max(1, Math.ceil(words * mult));
}

export type CreateTaskCreditEstimate = {
  estimatedCredits: number | null;
  remainingCredits: number;
  usedShopScan: boolean;
  /** true：增量且无覆盖率，数字为未缩放上限 */
  isUpperBound: boolean;
  needsMoreCredits: boolean;
};

function sumCharsForModules(
  moduleStats: Record<string, { items?: number; chars?: number }> | undefined,
  v4Modules: string[],
): { chars: number; hitCount: number } {
  if (!moduleStats || typeof moduleStats !== "object") {
    return { chars: 0, hitCount: 0 };
  }
  let chars = 0;
  let hitCount = 0;
  for (const mod of v4Modules) {
    const row = moduleStats[mod];
    if (row && typeof row.chars === "number" && row.chars > 0) {
      chars += row.chars;
      hitCount += 1;
    }
  }
  return { chars, hitCount };
}

function fallbackChars(
  moduleStats: Record<string, { items?: number; chars?: number }> | undefined,
  v2ModuleKeys: string[],
  v4Modules: string[],
): number {
  const productChars = moduleStats?.PRODUCT?.chars;
  if (typeof productChars === "number" && productChars > 0) {
    // 有商品字符但所选模块未命中：按模块数量相对 PRODUCT 三件套粗扩。
    const scale = Math.max(1, v4Modules.length / 3);
    return Math.ceil(productChars * scale);
  }
  return Math.max(1, v2ModuleKeys.length) * FALLBACK_CHARS_PER_V2_MODULE;
}

/**
 * 按所选 v2 模块 + 目标语言数粗估创建任务额度。
 * untranslatedRatioByLocale：0=已全译，1=全未译；缺省则增量模式标为上限。
 */
export async function estimateCreateTaskCredits(args: {
  shop: string;
  v2ModuleKeys: string[];
  targets: string[];
  isCover: boolean;
  untranslatedRatioByLocale?: Record<string, number | null>;
}): Promise<CreateTaskCreditEstimate> {
  const targets = args.targets.map((t) => t.trim()).filter(Boolean);
  const v2ModuleKeys = [...new Set(args.v2ModuleKeys.map((k) => k.trim()).filter(Boolean))];

  const quota = await getShopCreditQuota(args.shop).catch(() => null);
  const remainingCredits = Math.max(0, Math.floor(quota?.remaining ?? 0));

  if (targets.length === 0 || v2ModuleKeys.length === 0) {
    return {
      estimatedCredits: null,
      remainingCredits,
      usedShopScan: false,
      isUpperBound: false,
      needsMoreCredits: false,
    };
  }

  const v4Modules = expandV2ModuleKeys(v2ModuleKeys);
  const scan = await getLatestShopScanJob(args.shop).catch(() => null);
  const moduleStats = scan?.summary?.moduleStats;
  const { chars: scannedChars, hitCount } = sumCharsForModules(
    moduleStats,
    v4Modules,
  );

  let usedShopScan = hitCount > 0;
  let chars =
    hitCount > 0
      ? scannedChars
      : fallbackChars(moduleStats, v2ModuleKeys, v4Modules);
  if (hitCount === 0 && typeof moduleStats?.PRODUCT?.chars === "number") {
    usedShopScan = true;
  }

  let estimated = estimateCreditsFromChars(chars) * targets.length;
  let isUpperBound = false;

  if (!args.isCover) {
    const ratios = targets.map((locale) => {
      const raw = args.untranslatedRatioByLocale?.[locale];
      return typeof raw === "number" && Number.isFinite(raw) ? raw : null;
    });
    const known = ratios.filter((r): r is number => r != null);
    if (known.length > 0) {
      const avg =
        known.reduce((sum, r) => sum + Math.min(1, Math.max(0, r)), 0) /
        known.length;
      const scale = Math.max(INCREMENTAL_MIN_RATIO, avg);
      estimated = Math.max(1, Math.ceil(estimated * scale));
    } else {
      isUpperBound = true;
    }
  }

  const estimatedCredits = Math.max(1, Math.floor(estimated));
  return {
    estimatedCredits,
    remainingCredits,
    usedShopScan,
    isUpperBound,
    needsMoreCredits:
      remainingCredits >= 0 && estimatedCredits > remainingCredits,
  };
}
