import { randomUUID } from "node:crypto";
import {
  createJob,
  getLatestAutoJobCreatedAtForShop,
  hasActiveJobForTarget,
  isShopAutoCooldownElapsed,
  TSF_AUTO_TASK_SOURCE,
} from "./cosmosV4.js";
import { pushHint } from "./redisV4.js";
import {
  hasTsfDbCredentials,
  listAutoTranslateShops,
  getOfflineAccessTokenFromTsf,
  syncShopPrimaryLocaleInTsf,
} from "./tsfDb.js";
import { fetchShopPrimaryLocale } from "./shopifyFetch.js";
import { AUTO_TRANSLATE_V4_MODULES } from "./moduleCatalog.js";
import { setAutoScanLastAt } from "./redisV4.js";
import {
  currentSlotIndex,
  getAutoTranslateMaxNewJobsPerScan,
  getAutoTranslateShardCooldownMs,
  getAutoTranslateShopCooldownMs,
  getAutoTranslateSlotsPerDay,
  isAutoTranslateShardingEnabled,
  shopSlotIndex,
  resolveNextClockAlignedScanAt,
} from "./autoScanSchedule.js";

/** 自动任务模块（不含 EMAIL_TEMPLATE、ONLINE_STORE_THEME_LOCALE_CONTENT）。 */
const AUTO_MODULES = [...AUTO_TRANSLATE_V4_MODULES];

/** v4 自动翻译任务固定使用 GPT-4.1 nano（与 TSF 手动任务默认模型一致）。 */
function autoAiModel(): string {
  return "gpt-4.1-nano";
}

/**
 * 扫描 TSF 库中「已迁移且开启自动翻译」的店，为每个 shop+target 创建
 * 自动更新任务（isCover=false，增量、不覆盖已翻译）。
 *
 * - 全局 scheduler 每小时扫描一次（AUTO_TRANSLATE_INTERVAL_MS，默认 1h）。
 * - 分槽打散（AUTO_TRANSLATE_SHARDING，默认开）：每个店按稳定 hash 固定到一天中
 *   的某个槽位（AUTO_TRANSLATE_SLOTS_PER_DAY，默认 24），扫描时只处理落在当前
 *   槽位的店，该店所有语言在同一小时一起创建；整店冷却
 *   AUTO_TRANSLATE_SHARD_COOLDOWN_MS（默认 20h）保证每店每天≈1 批。
 * - 分槽关闭时回退旧逻辑：整店按 AUTO_TRANSLATE_SHOP_COOLDOWN_MS（默认 3h）冷却。
 * - 各 shop+target 若已有进行中任务则单独跳过。
 * - AUTO_TRANSLATE_MAX_NEW_JOBS_PER_SCAN（默认 0=不限）：单次扫描新建上限，安全带。
 */
export async function runAutoTranslateScan(): Promise<void> {
  if (!hasTsfDbCredentials()) {
    console.log("[autoTranslate] TSF Turso 未配置（TSF_TURSO_*），跳过自动扫描");
    return;
  }

  const sharding = isAutoTranslateShardingEnabled();
  const slotsPerDay = getAutoTranslateSlotsPerDay();
  const curSlot = currentSlotIndex();
  const shopCooldownMs = getAutoTranslateShopCooldownMs();
  const shardCooldownMs = getAutoTranslateShardCooldownMs();
  // 分槽开启时用整店每日冷却（≈20h）；关闭时用旧的短冷却（≈3h）。
  const cooldownMs = sharding ? shardCooldownMs : shopCooldownMs;
  const maxNewJobs = getAutoTranslateMaxNewJobsPerScan();

  const shops = await listAutoTranslateShops();
  if (shops.length === 0) {
    console.log("[autoTranslate] 无开启自动翻译的店");
    await setAutoScanLastAt(new Date().toISOString());
    return;
  }

  let created = 0;
  let skippedActive = 0;
  let skippedShopCooldown = 0;
  let skippedSlot = 0;
  let cappedOut = false;

  for (const { shop, primaryLocale, targets } of shops) {
    if (maxNewJobs > 0 && created >= maxNewJobs) {
      cappedOut = true;
      break;
    }

    let source = primaryLocale?.trim();
    if (!source || !Array.isArray(targets) || targets.length === 0) continue;

    // 分槽打散：整店按 hash 固定到某槽位，只在当前槽位处理（该店所有语言一起建）。
    if (sharding && shopSlotIndex(shop, slotsPerDay) !== curSlot) {
      skippedSlot++;
      continue;
    }

    // 整店冷却：分槽下≈每天一批；非分槽下≈每 3h 一批。FAILED 不计入冷却。
    const lastShopBatchAt = await getLatestAutoJobCreatedAtForShop(shop);
    if (!isShopAutoCooldownElapsed(lastShopBatchAt, cooldownMs)) {
      skippedShopCooldown++;
      continue;
    }

    const token = (await getOfflineAccessTokenFromTsf(shop)) ?? "";
    if (!token) {
      console.warn(`[autoTranslate] ${shop} 在 TSF 无 offline token，跳过该店`);
      continue;
    }

    try {
      const livePrimary = await fetchShopPrimaryLocale(shop, token, true);
      if (livePrimary) {
        await syncShopPrimaryLocaleInTsf(shop, livePrimary);
        source = livePrimary;
      }
    } catch (err) {
      console.warn(`[autoTranslate] ${shop} 读取 Shopify 默认语言失败，沿用 TSF 缓存`, err);
    }

    for (const rawTarget of targets) {
      if (maxNewJobs > 0 && created >= maxNewJobs) {
        cappedOut = true;
        break;
      }

      const target = String(rawTarget).trim();
      if (!target || target === source) continue;

      if (await hasActiveJobForTarget(shop, source, target)) {
        skippedActive++;
        continue;
      }

      const jobId = randomUUID();
      try {
        await createJob({
          id: jobId,
          shopName: shop,
          shopifyAccessToken: token,
          source,
          target,
          modules: AUTO_MODULES,
          aiModel: autoAiModel(),
          limitPerType: Number.MAX_SAFE_INTEGER,
          isCover: false,
          isHandle: false,
          taskSource: TSF_AUTO_TASK_SOURCE,
          status: "INIT_QUEUED",
          blobPrefix: `tasks/v4/${shop}/${jobId}`,
          createdBy: "auto",
        });
        await pushHint("init", { taskId: jobId, shopName: shop });
        created++;
        console.log(
          `[autoTranslate] 建任务 id=${jobId} shop=${shop} ${source}→${target}`,
        );
      } catch (err) {
        console.error(`[autoTranslate] 建任务失败 shop=${shop} ${source}→${target}`, err);
      }
    }
  }

  const slotLabel = sharding ? `${curSlot}/${slotsPerDay}` : "off";
  console.log(
    `[autoTranslate] 扫描完成：店=${shops.length} 槽位=${slotLabel} 新建=${created}` +
      ` 跳过(非本槽店)=${skippedSlot}` +
      ` 跳过(店冷却<${cooldownMs / 3600_000}h)=${skippedShopCooldown}` +
      ` 跳过(语言进行中)=${skippedActive}` +
      (cappedOut ? ` [达单次上限 ${maxNewJobs}，剩余顺延下轮]` : ""),
  );
  await setAutoScanLastAt(resolveNextClockAlignedScanAt().toISOString());
}
