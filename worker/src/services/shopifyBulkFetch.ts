/**
 * Shopify Bulk Operations path for translation v4 init (full rollout).
 *
 * Per-module bulk failures are re-queued (no paginated fallback).
 * Shared submit/poll/JSONL/queue live in shopifyBulkShared.ts.
 */
import {
  runShopifyBulkJobQueue,
  streamBulkJsonlResources,
  type ShopifyBulkJob,
} from "./shopifyBulkShared.js";
import {
  MODULE_TO_SHOPIFY_TYPE,
  chunkBlobBytes,
  getMaxChunkBytes,
  mapNodeToResource,
  resourceBlobBytes,
  type FetchTranslatableOptions,
  type TranslatableResource,
} from "./shopifyFetch.js";

const LOG = "[shopifyBulk:init]";

async function streamJsonlToChunks(args: {
  url: string;
  module: string;
  options: FetchTranslatableOptions;
  limitPerType: number;
  writeChunk: (chunkIndex: number, chunk: TranslatableResource[]) => Promise<void>;
  onHeartbeat: () => Promise<void>;
}): Promise<{ totalItems: number; chunks: number }> {
  const { url, module, options, limitPerType, writeChunk, onHeartbeat } = args;

  const maxBytes = getMaxChunkBytes();
  let fetchedRaw = 0;
  let chunkIndex = 0;
  let totalItems = 0;
  let current: TranslatableResource[] = [];
  let sumResourceBytes = 0;

  const flushCurrent = async () => {
    if (current.length === 0) return;
    await writeChunk(chunkIndex, current);
    totalItems += current.length;
    chunkIndex++;
    current = [];
    sumResourceBytes = 0;
  };

  await streamBulkJsonlResources({
    url,
    logLabel: module,
    onHeartbeat,
    onLine: async (row) => {
      if (fetchedRaw >= limitPerType) return;
      fetchedRaw++;

      const resource = mapNodeToResource(
        {
          resourceId: String(row.resourceId ?? row.id),
          translations: row.translations ?? [],
          translatableContent: (row.translatableContent ?? []).map((f) => ({
            key: f.key,
            value: f.value,
            digest: f.digest ?? "",
            locale: f.locale ?? "",
            type: f.type,
          })),
        },
        module,
        options,
      );
      if (!resource) return;

      const rBytes = resourceBlobBytes(resource);
      if (current.length > 0) {
        const estimate = sumResourceBytes + rBytes + current.length + 2;
        if (
          estimate > maxBytes &&
          chunkBlobBytes(current.concat(resource)) > maxBytes
        ) {
          await flushCurrent();
        }
      }
      current.push(resource);
      sumResourceBytes += rBytes;
    },
  });

  await flushCurrent();
  return { totalItems, chunks: chunkIndex };
}

export type BulkInitModuleStats = {
  module: string;
  totalItems: number;
  chunks: number;
};

export type BulkInitModulePhase = "querying" | "saving";

export type RunBulkInitModulesArgs = {
  shopDomain: string;
  modules: string[];
  limitPerType: number;
  chunkSize: number;
  options: FetchTranslatableOptions;
  onHeartbeat: () => Promise<void>;
  writeChunk: (
    module: string,
    chunkIndex: number,
    chunk: TranslatableResource[],
  ) => Promise<void>;
  onModuleComplete: (stats: BulkInitModuleStats) => Promise<void>;
  /** Fired when a module enters the submit/download pipeline (UI activity). */
  onModuleStart?: (module: string) => Promise<void>;
  /** Fired when a module changes coarse phase (querying → saving). */
  onModulePhase?: (module: string, phase: BulkInitModulePhase) => Promise<void>;
  isShutdown: () => boolean;
};

/**
 * Run bulk init for all modules with submit window / poll / download concurrency.
 * Per-module failures re-queue bulk submit (SHOPIFY_BULK_SUBMIT_MAX_RETRIES).
 */
export async function runBulkInitModules(args: RunBulkInitModulesArgs): Promise<void> {
  const {
    shopDomain,
    modules,
    limitPerType,
    options,
    onHeartbeat,
    writeChunk,
    onModuleComplete,
    onModuleStart,
    onModulePhase,
    isShutdown,
  } = args;

  const jobs: ShopifyBulkJob[] = [];
  for (const module of modules) {
    const resourceType = MODULE_TO_SHOPIFY_TYPE[module];
    if (!resourceType) {
      console.warn(`${LOG} unsupported module=${module}, skip`);
      await onModuleComplete({
        module,
        totalItems: 0,
        chunks: 0,
      });
      continue;
    }
    jobs.push({
      id: module,
      resourceType,
      locale: options.targetLocale,
    });
  }

  await runShopifyBulkJobQueue({
    shopDomain,
    jobs,
    onHeartbeat,
    isShutdown,
    fallbackOnFailure: false,
    retryOnFailure: true,
    logPrefix: LOG,
    // Mark module active at submit time — Shopify bulk poll can take minutes
    // before processOutcome runs; without this the App shows "waiting for slot".
    onJobSubmit: async (job) => {
      await onModuleStart?.(job.id);
      await onModulePhase?.(job.id, "querying");
    },
    processOutcome: async (outcome) => {
      const module = outcome.job.id;
      await onModulePhase?.(module, "querying");

      let stats: { totalItems: number; chunks: number };
      let savingAnnounced = false;
      const writeChunkTracked = async (
        i: number,
        chunk: TranslatableResource[],
      ) => {
        if (!savingAnnounced) {
          savingAnnounced = true;
          await onModulePhase?.(module, "saving");
        }
        await writeChunk(module, i, chunk);
      };

      if (outcome.mode === "empty") {
        stats = { totalItems: 0, chunks: 0 };
      } else if (outcome.mode === "fallback") {
        throw new Error(`unexpected fallback outcome module=${module}`);
      } else {
        console.log(`${LOG} download module=${module}`);
        stats = await streamJsonlToChunks({
          url: outcome.url,
          module,
          options,
          limitPerType,
          writeChunk: writeChunkTracked,
          onHeartbeat,
        });
      }

      await onModuleComplete({
        module,
        totalItems: stats.totalItems,
        chunks: stats.chunks,
      });
    },
  });
}
