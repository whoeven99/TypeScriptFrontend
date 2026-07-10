/**
 * 跨店公平 claim：hint 队列 + Cosmos 兜底扫描。
 *
 * 同店串行（busy shop）时 **不** 把 hint 塞回队尾，避免大店占满队列饿死其它店；
 * 同店下一条由 wakeNext*ForShop 在完成后 RPUSH。
 */
import {
  findPendingJobs,
  getJob,
  type TranslationV4Job,
  type TranslationV4Status,
} from "./cosmosV4.js";
import {
  popHint,
  requeueHintTail,
  type HintPayload,
} from "./redisV4.js";
import {
  stagePoolKindForJob,
  stageSlots,
  type StagePoolStage,
} from "./stagePool.js";

export type FairStageClaimOptions = {
  stage: StagePoolStage;
  hintKey: "init" | "translate" | "writeback";
  drainMax: number;
  queuedStatus: TranslationV4Status;
  logTag: string;
  scanBatch?: number;
  scanMaxBatches?: number;
  isStaleHint: (hint: HintPayload) => Promise<boolean>;
  isShopBusy: (shopName: string) => Promise<boolean>;
  tryClaimJob: (shopName: string, taskId: string) => Promise<TranslationV4Job | null>;
};

export async function claimNextJobWithFairScheduling(
  options: FairStageClaimOptions,
): Promise<TranslationV4Job | null> {
  const {
    stage,
    hintKey,
    drainMax,
    queuedStatus,
    logTag,
    scanBatch = 50,
    scanMaxBatches = 5,
    isStaleHint,
    isShopBusy,
    tryClaimJob,
  } = options;

  for (let n = 0; n < drainMax; n++) {
    const hint = await popHint(hintKey);
    if (!hint) break;

    if (await isStaleHint(hint)) {
      console.log(
        `[${logTag}] discard stale hint job=${hint.taskId} shop=${hint.shopName}`,
      );
      continue;
    }

    const queued = await getJob(hint.shopName, hint.taskId);
    if (
      queued &&
      !stageSlots.hasCapacity(stage, stagePoolKindForJob(queued))
    ) {
      await requeueHintTail(hintKey, hint);
      continue;
    }

    if (await isShopBusy(hint.shopName)) {
      // 同店已有任务在跑：丢弃 hint（Cosmos 仍为 queued），由 wakeNext*ForShop 再入队
      continue;
    }

    const job = await tryClaimJob(hint.shopName, hint.taskId);
    if (job) return job;

    await requeueHintTail(hintKey, hint);
  }

  const busyShops = new Set<string>();
  for (let batch = 0; batch < scanMaxBatches; batch++) {
    const offset = batch * scanBatch;
    const candidates = await findPendingJobs(queuedStatus, scanBatch, offset);
    if (candidates.length === 0) break;

    for (const candidate of candidates) {
      if (busyShops.has(candidate.shopName)) continue;
      if (!stageSlots.hasCapacity(stage, stagePoolKindForJob(candidate))) {
        continue;
      }
      if (await isShopBusy(candidate.shopName)) {
        busyShops.add(candidate.shopName);
        continue;
      }
      const job = await tryClaimJob(candidate.shopName, candidate.id);
      if (job) return job;
    }

    if (candidates.length < scanBatch) break;
  }

  return null;
}
