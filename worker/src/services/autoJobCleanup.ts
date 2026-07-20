import {
  deleteJob,
  TSF_AUTO_TASK_SOURCE,
  type TranslationV4Job,
} from "./cosmosV4.js";
import { blobDeletePrefix } from "./blobV4.js";
import { clearTaskRedis } from "./redisV4.js";

export type PurgeV4JobOptions = {
  /** 删除 Blob 时每个文件间隔，降低对存储的突发压力。 */
  blobDeleteDelayMs?: number;
  shouldAbort?: () => boolean;
};

/** 删除 v4 任务及其 Blob / Redis 进度。 */
export async function purgeV4Job(
  job: Pick<TranslationV4Job, "id" | "shopName" | "blobPrefix">,
  options: PurgeV4JobOptions = {},
): Promise<void> {
  await blobDeletePrefix(job.blobPrefix, {
    delayMs: options.blobDeleteDelayMs,
    shouldAbort: options.shouldAbort,
  });
  if (options.shouldAbort?.()) return;
  await deleteJob(job.shopName, job.id);
  await clearTaskRedis(job.id);
}

/** 兼容旧调用；等价于 purgeV4Job。 */
export async function purgeAutoJob(
  job: Pick<TranslationV4Job, "id" | "shopName" | "blobPrefix">,
): Promise<void> {
  await purgeV4Job(job);
}

export function isEmptyAutoJob(job: TranslationV4Job): boolean {
  if (job.taskSource !== TSF_AUTO_TASK_SOURCE) return false;
  const initTotal = job.metrics?.initTotal ?? 0;
  const translateTotal = job.metrics?.translateTotal ?? 0;
  return initTotal <= 0 && translateTotal <= 0;
}
