/**
 * Shopify Bulk Operations path for translation v4 init.
 *
 * Only shops listed in INIT_BULK_SHOP_ALLOWLIST use this module. Others keep
 * paginated GraphQL in shopifyFetch.ts unchanged.
 *
 * Flow: sliding window of up to 5 bulk queries → poll every 1s → on complete,
 * submit next module and stream-download JSONL (download concurrency default 5)
 * → filter → chunk → Blob via caller callback.
 */
import { createInterface } from "readline";
import { Readable } from "stream";
import {
  MODULE_TO_SHOPIFY_TYPE,
  chunkBlobBytes,
  fetchTranslatableResources,
  getMaxChunkBytes,
  mapNodeToResource,
  resourceBlobBytes,
  shopifyGraphql,
  type FetchTranslatableOptions,
  type TranslatableResource,
} from "./shopifyFetch.js";

const LOG = "[shopifyBulk]";

const BULK_SUBMIT_WINDOW = Math.max(
  1,
  Math.min(5, Number(process.env.INIT_BULK_SUBMIT_WINDOW?.trim()) || 5),
);
const BULK_POLL_MS = Math.max(250, Number(process.env.INIT_BULK_POLL_MS?.trim()) || 1_000);
const BULK_DOWNLOAD_CONCURRENCY = Math.max(
  1,
  Math.min(5, Number(process.env.INIT_BULK_DOWNLOAD_CONCURRENCY?.trim()) || 5),
);
const BULK_TIMEOUT_MS = Math.max(
  60_000,
  Number(process.env.INIT_BULK_TIMEOUT_MS?.trim()) || 6 * 60 * 60 * 1_000,
);
const BULK_FALLBACK =
  (process.env.INIT_BULK_FALLBACK?.trim() ?? "1") !== "0" &&
  (process.env.INIT_BULK_FALLBACK?.trim() ?? "1").toLowerCase() !== "false";

type BulkStatus =
  | "CREATED"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELED"
  | "CANCELING";

type InFlightBulk = {
  module: string;
  operationId: string;
  submittedAt: number;
};

export type BulkInitModuleStats = {
  module: string;
  totalItems: number;
  chunks: number;
  usedFallback: boolean;
};

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

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function escapeGraphqlString(value: string): string {
  return JSON.stringify(value);
}

function buildTranslatableResourcesBulkQuery(
  resourceType: string,
  targetLocale: string,
): string {
  // Inner query is embedded for bulkOperationRunQuery — locale must be inlined.
  return `{
  translatableResources(resourceType: ${resourceType}) {
    edges {
      node {
        resourceId
        translations(locale: ${escapeGraphqlString(targetLocale)}) {
          key
          value
          outdated
        }
        translatableContent {
          key
          value
          digest
          locale
          type
        }
      }
    }
  }
}`;
}

async function submitBulkQuery(
  shopDomain: string,
  accessToken: string,
  resourceType: string,
  targetLocale: string,
  preferLegacyToken: boolean,
): Promise<string> {
  const inner = buildTranslatableResourcesBulkQuery(resourceType, targetLocale);
  const mutation = `
mutation BulkInitTranslatableResources($query: String!) {
  bulkOperationRunQuery(query: $query) {
    bulkOperation { id status }
    userErrors { field message code }
  }
}`;

  const data = (await shopifyGraphql(
    shopDomain,
    accessToken,
    mutation,
    { query: inner },
    { preferLegacyToken },
  )) as {
    bulkOperationRunQuery: {
      bulkOperation: { id: string; status: string } | null;
      userErrors: Array<{ field?: string[]; message: string; code?: string }>;
    };
  };

  const payload = data.bulkOperationRunQuery;
  const errors = payload?.userErrors ?? [];
  if (errors.length > 0) {
    throw new Error(
      `${LOG} bulkOperationRunQuery userErrors: ${JSON.stringify(errors)}`,
    );
  }
  const opId = payload?.bulkOperation?.id;
  if (!opId) {
    throw new Error(`${LOG} bulkOperationRunQuery returned no operation id`);
  }
  return opId;
}

async function pollBulkOperation(
  shopDomain: string,
  accessToken: string,
  operationId: string,
  preferLegacyToken: boolean,
): Promise<{
  status: BulkStatus;
  errorCode: string | null;
  url: string | null;
  objectCount: string | null;
}> {
  const query = `
query BulkInitPoll($id: ID!) {
  bulkOperation(id: $id) {
    id
    status
    errorCode
    objectCount
    url
    partialDataUrl
  }
}`;

  const data = (await shopifyGraphql(
    shopDomain,
    accessToken,
    query,
    { id: operationId },
    { preferLegacyToken },
  )) as {
    bulkOperation: {
      id: string;
      status: BulkStatus;
      errorCode?: string | null;
      objectCount?: string | null;
      url?: string | null;
      partialDataUrl?: string | null;
    } | null;
  };

  const op = data.bulkOperation;
  if (!op) {
    throw new Error(`${LOG} bulkOperation not found id=${operationId}`);
  }
  return {
    status: op.status,
    errorCode: op.errorCode ?? null,
    url: op.url ?? op.partialDataUrl ?? null,
    objectCount: op.objectCount ?? null,
  };
}

async function cancelBulkOperation(
  shopDomain: string,
  accessToken: string,
  operationId: string,
  preferLegacyToken: boolean,
): Promise<void> {
  const mutation = `
mutation BulkInitCancel($id: ID!) {
  bulkOperationCancel(id: $id) {
    bulkOperation { id status }
    userErrors { field message }
  }
}`;
  try {
    await shopifyGraphql(
      shopDomain,
      accessToken,
      mutation,
      { id: operationId },
      { preferLegacyToken },
    );
  } catch (e) {
    console.warn(
      `${LOG} cancel failed op=${operationId}: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}

type JsonlResourceLine = {
  resourceId?: string;
  id?: string;
  translations?: Array<{ key: string; value?: string | null; outdated?: boolean | null }>;
  translatableContent?: Array<{
    key: string;
    value: string;
    digest: string;
    locale: string;
    type?: string | null;
  }>;
  __parentId?: string;
};

function isResourceJsonlLine(row: JsonlResourceLine): boolean {
  if (row.__parentId) return false;
  const resourceId = row.resourceId ?? row.id;
  return Boolean(resourceId && Array.isArray(row.translatableContent));
}

async function streamJsonlToChunks(args: {
  url: string;
  module: string;
  options: FetchTranslatableOptions;
  limitPerType: number;
  chunkSize: number;
  writeChunk: (chunkIndex: number, chunk: TranslatableResource[]) => Promise<void>;
  onHeartbeat: () => Promise<void>;
}): Promise<{ totalItems: number; chunks: number }> {
  const { url, module, options, limitPerType, writeChunk, onHeartbeat } = args;

  const resp = await fetch(url);
  if (!resp.ok || !resp.body) {
    throw new Error(`${LOG} JSONL download HTTP ${resp.status} module=${module}`);
  }

  const nodeStream = Readable.fromWeb(
    resp.body as import("stream/web").ReadableStream<Uint8Array>,
  );
  const rl = createInterface({ input: nodeStream, crlfDelay: Infinity });

  const maxBytes = getMaxChunkBytes();
  let fetchedRaw = 0;
  let chunkIndex = 0;
  let totalItems = 0;
  let current: TranslatableResource[] = [];
  let sumResourceBytes = 0;
  let lastHeartbeat = 0;

  const flushCurrent = async () => {
    if (current.length === 0) return;
    await writeChunk(chunkIndex, current);
    totalItems += current.length;
    chunkIndex++;
    current = [];
    sumResourceBytes = 0;
  };

  try {
    for await (const line of rl) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      let row: JsonlResourceLine;
      try {
        row = JSON.parse(trimmed) as JsonlResourceLine;
      } catch {
        console.warn(`${LOG} skip invalid JSONL line module=${module}`);
        continue;
      }

      if (!isResourceJsonlLine(row)) continue;
      if (fetchedRaw >= limitPerType) break;
      fetchedRaw++;

      const resource = mapNodeToResource(
        {
          resourceId: String(row.resourceId ?? row.id),
          translations: row.translations ?? [],
          translatableContent: row.translatableContent ?? [],
        },
        module,
        options,
      );
      if (!resource) continue;

      const rBytes = resourceBlobBytes(resource);
      if (current.length > 0) {
        const estimate = sumResourceBytes + rBytes + current.length + 2;
        if (estimate > maxBytes && chunkBlobBytes(current.concat(resource)) > maxBytes) {
          await flushCurrent();
        }
      }
      current.push(resource);
      sumResourceBytes += rBytes;

      const now = Date.now();
      if (now - lastHeartbeat > 15_000) {
        lastHeartbeat = now;
        await onHeartbeat();
      }
    }
    await flushCurrent();
  } finally {
    rl.close();
    nodeStream.destroy();
  }

  return { totalItems, chunks: chunkIndex };
}

async function writePageChunks(args: {
  shopDomain: string;
  accessToken: string;
  module: string;
  limitPerType: number;
  chunkSize: number;
  options: FetchTranslatableOptions;
  writeChunk: (chunkIndex: number, chunk: TranslatableResource[]) => Promise<void>;
}): Promise<{ totalItems: number; chunks: number }> {
  const chunks = await fetchTranslatableResources(
    args.shopDomain,
    args.accessToken,
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

export type RunBulkInitModulesArgs = {
  shopDomain: string;
  accessToken: string;
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
  isShutdown: () => boolean;
};

/**
 * Run bulk init for all modules with submit window / poll / download concurrency.
 * Per-module failure falls back to paginated fetch when INIT_BULK_FALLBACK is on.
 */
export async function runBulkInitModules(args: RunBulkInitModulesArgs): Promise<void> {
  const {
    shopDomain,
    accessToken,
    modules,
    limitPerType,
    chunkSize,
    options,
    onHeartbeat,
    writeChunk,
    onModuleComplete,
    isShutdown,
  } = args;

  const preferLegacyToken = options.preferLegacyToken ?? false;
  const queue = modules.filter((m) => {
    if (!MODULE_TO_SHOPIFY_TYPE[m]) {
      console.warn(`${LOG} unsupported module=${m}, skip`);
      return false;
    }
    return true;
  });

  const inFlight = new Map<string, InFlightBulk>();
  type DownloadItem = {
    module: string;
    url: string | null;
    mode: "jsonl" | "empty" | "fallback";
  };
  const downloadQueue: DownloadItem[] = [];
  let activeDownloads = 0;
  const downloadSlotWaiters: Array<() => void> = [];
  const downloadTasks: Promise<void>[] = [];
  const moduleErrors: string[] = [];

  const wakeDownloadSlot = () => {
    const next = downloadSlotWaiters.shift();
    if (next) next();
  };

  const acquireDownloadSlot = async () => {
    while (activeDownloads >= BULK_DOWNLOAD_CONCURRENCY) {
      await new Promise<void>((resolve) => downloadSlotWaiters.push(resolve));
    }
    activeDownloads++;
  };

  const releaseDownloadSlot = () => {
    activeDownloads--;
    wakeDownloadSlot();
  };

  const runDownload = (item: DownloadItem) => {
    const task = (async () => {
      await acquireDownloadSlot();
      try {
        if (isShutdown()) {
          throw new Error("shutdown: init yielding for deploy");
        }
        await onHeartbeat();

        let stats: { totalItems: number; chunks: number };
        let usedFallback = false;

        if (item.mode === "empty") {
          stats = { totalItems: 0, chunks: 0 };
        } else if (item.mode === "fallback" || !item.url) {
          console.log(`${LOG} fallback page module=${item.module}`);
          usedFallback = true;
          stats = await writePageChunks({
            shopDomain,
            accessToken,
            module: item.module,
            limitPerType,
            chunkSize,
            options: { ...options, onPage: onHeartbeat },
            writeChunk: (i, chunk) => writeChunk(item.module, i, chunk),
          });
        } else {
          console.log(`${LOG} download module=${item.module}`);
          try {
            stats = await streamJsonlToChunks({
              url: item.url,
              module: item.module,
              options,
              limitPerType,
              chunkSize,
              writeChunk: (i, chunk) => writeChunk(item.module, i, chunk),
              onHeartbeat,
            });
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            console.warn(`${LOG} download/parse failed module=${item.module}: ${msg}`);
            if (!BULK_FALLBACK) throw e;
            usedFallback = true;
            stats = await writePageChunks({
              shopDomain,
              accessToken,
              module: item.module,
              limitPerType,
              chunkSize,
              options: { ...options, onPage: onHeartbeat },
              writeChunk: (i, chunk) => writeChunk(item.module, i, chunk),
            });
          }
        }

        await onModuleComplete({
          module: item.module,
          totalItems: stats.totalItems,
          chunks: stats.chunks,
          usedFallback,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        moduleErrors.push(`${item.module}: ${msg}`);
        console.error(`${LOG} module failed module=${item.module}: ${msg}`);
      } finally {
        releaseDownloadSlot();
      }
    })();
    downloadTasks.push(task);
  };

  const enqueueDownload = (item: DownloadItem) => {
    downloadQueue.push(item);
    while (downloadQueue.length > 0) {
      runDownload(downloadQueue.shift()!);
    }
  };

  const submitAvailable = async () => {
    while (inFlight.size < BULK_SUBMIT_WINDOW && queue.length > 0) {
      if (isShutdown()) {
        throw new Error("shutdown: init yielding for deploy");
      }
      const module = queue.shift()!;
      const resourceType = MODULE_TO_SHOPIFY_TYPE[module]!;
      try {
        console.log(
          `${LOG} submit module=${module} type=${resourceType} shop=${shopDomain}`,
        );
        const operationId = await submitBulkQuery(
          shopDomain,
          accessToken,
          resourceType,
          options.targetLocale,
          preferLegacyToken,
        );
        inFlight.set(module, {
          module,
          operationId,
          submittedAt: Date.now(),
        });
        console.log(`${LOG} submitted module=${module} op=${operationId}`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn(`${LOG} submit failed module=${module}: ${msg}`);
        if (BULK_FALLBACK) {
          enqueueDownload({ module, url: null, mode: "fallback" });
        } else {
          moduleErrors.push(`${module}: submit ${msg}`);
        }
      }
      await onHeartbeat();
    }
  };

  try {
    await submitAvailable();

    while (inFlight.size > 0 || queue.length > 0) {
      if (isShutdown()) {
        for (const [, op] of inFlight) {
          await cancelBulkOperation(
            shopDomain,
            accessToken,
            op.operationId,
            preferLegacyToken,
          );
        }
        throw new Error("shutdown: init yielding for deploy");
      }

      await onHeartbeat();

      for (const [module, op] of [...inFlight.entries()]) {
        let polled;
        try {
          polled = await pollBulkOperation(
            shopDomain,
            accessToken,
            op.operationId,
            preferLegacyToken,
          );
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.warn(`${LOG} poll error module=${module}: ${msg}`);
          continue;
        }

        if (polled.status === "COMPLETED") {
          inFlight.delete(module);
          console.log(
            `${LOG} completed module=${module} objects=${polled.objectCount ?? "?"} url=${polled.url ? "yes" : "null"}`,
          );
          enqueueDownload({
            module,
            url: polled.url,
            mode: polled.url ? "jsonl" : "empty",
          });
          await submitAvailable();
          continue;
        }

        if (
          polled.status === "FAILED" ||
          polled.status === "CANCELED" ||
          polled.status === "CANCELING"
        ) {
          inFlight.delete(module);
          console.warn(
            `${LOG} op ${polled.status} module=${module} errorCode=${polled.errorCode ?? "null"}`,
          );
          if (BULK_FALLBACK) {
            enqueueDownload({ module, url: null, mode: "fallback" });
          } else {
            moduleErrors.push(
              `${module}: bulk ${polled.status} ${polled.errorCode ?? ""}`.trim(),
            );
          }
          await submitAvailable();
          continue;
        }

        if (Date.now() - op.submittedAt > BULK_TIMEOUT_MS) {
          console.warn(`${LOG} timeout module=${module} op=${op.operationId}`);
          await cancelBulkOperation(
            shopDomain,
            accessToken,
            op.operationId,
            preferLegacyToken,
          );
          inFlight.delete(module);
          if (BULK_FALLBACK) {
            enqueueDownload({ module, url: null, mode: "fallback" });
          } else {
            moduleErrors.push(`${module}: bulk timeout`);
          }
          await submitAvailable();
        }
      }

      if (inFlight.size > 0 || queue.length > 0) {
        await sleep(BULK_POLL_MS);
      }
    }

    await Promise.all(downloadTasks);

    if (moduleErrors.length > 0) {
      throw new Error(`${LOG} module failures: ${moduleErrors.join("; ")}`);
    }
  } catch (e) {
    for (const [, op] of inFlight) {
      await cancelBulkOperation(
        shopDomain,
        accessToken,
        op.operationId,
        preferLegacyToken,
      );
    }
    throw e;
  }
}
