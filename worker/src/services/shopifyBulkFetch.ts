/**
 * Shopify Bulk Operations path for translation v4 init.
 *
 * Only shops listed in INIT_BULK_SHOP_ALLOWLIST use this module. Others keep
 * paginated GraphQL in shopifyFetch.ts unchanged.
 *
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
  fetchTranslatableResources,
  getMaxChunkBytes,
  mapNodeToResource,
  resourceBlobBytes,
  type FetchTranslatableOptions,
  type TranslatableResource,
} from "./shopifyFetch.js";

const LOG = "[shopifyBulk:init]";

const BULK_FALLBACK =
  (process.env.INIT_BULK_FALLBACK?.trim() ?? "1") !== "0" &&
  (process.env.INIT_BULK_FALLBACK?.trim() ?? "1").toLowerCase() !== "false";

function normalizeShopName(shop: string): string {
  return shop
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
}

/** True only when shop is listed in INIT_BULK_SHOP_ALLOWLIST (comma-separated). */
export function isShopInBulkInitAllowlist(shopName: string): boolean {
  const raw = process.env.INIT_BULK_SHOP_ALLOWLIST?.trim() ?? "";
  if (!raw) return false;
  const needle = normalizeShopName(shopName);
  if (!needle) return false;
  return raw
    .split(",")
    .map((s) => normalizeShopName(s))
    .filter(Boolean)
    .includes(needle);
}

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

async function writePageChunks(args: {
  shopDomain: string;
  module: string;
  limitPerType: number;
  chunkSize: number;
  options: FetchTranslatableOptions;
  writeChunk: (chunkIndex: number, chunk: TranslatableResource[]) => Promise<void>;
}): Promise<{ totalItems: number; chunks: number }> {
  const chunks = await fetchTranslatableResources(
    args.shopDomain,
    args.module,
    args.limitPerType,
    args.chunkSize,
    args.options,
  );
  let totalItems = 0;
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]!;
    await args.writeChunk(i, chunk);
    totalItems += chunk.length;
  }
  return { totalItems, chunks: chunks.length };
}

export type BulkInitModuleStats = {
  module: string;
  totalItems: number;
  chunks: number;
  usedFallback: boolean;
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
 * Per-module failure falls back to paginated fetch when INIT_BULK_FALLBACK is on.
 */
export async function runBulkInitModules(args: RunBulkInitModulesArgs): Promise<void> {
  const {
    shopDomain,
    modules,
    limitPerType,
    chunkSize,
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
        usedFallback: false,
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
    fallbackOnFailure: BULK_FALLBACK,
    logPrefix: LOG,
    processOutcome: async (outcome) => {
      const module = outcome.job.id;
      await onModuleStart?.(module);
      await onModulePhase?.(module, "querying");

      let stats: { totalItems: number; chunks: number };
      let usedFallback = false;
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
        console.log(
          `${LOG} fallback page module=${module} reason=${outcome.reason}`,
        );
        usedFallback = true;
        stats = await writePageChunks({
          shopDomain,
          module,
          limitPerType,
          chunkSize,
          options: { ...options, onPage: onHeartbeat },
          writeChunk: writeChunkTracked,
        });
      } else {
        console.log(`${LOG} download module=${module}`);
        try {
          stats = await streamJsonlToChunks({
            url: outcome.url,
            module,
            options,
            limitPerType,
            writeChunk: writeChunkTracked,
            onHeartbeat,
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.warn(
            `${LOG} download/parse failed module=${module}: ${msg}`,
          );
          if (!BULK_FALLBACK) throw e;
          usedFallback = true;
          stats = await writePageChunks({
            shopDomain,
            module,
            limitPerType,
            chunkSize,
            options: { ...options, onPage: onHeartbeat },
            writeChunk: writeChunkTracked,
          });
        }
      }

      await onModuleComplete({
        module,
        totalItems: stats.totalItems,
        chunks: stats.chunks,
        usedFallback,
      });
    },
  });
}
