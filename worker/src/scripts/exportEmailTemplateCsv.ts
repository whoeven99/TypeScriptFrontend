/**
 * 从 v4 Blob 导出 EMAIL_TEMPLATE 译文，并将译文 HTML 中的 Liquid 变量
 * 按顺序替换为原文 HTML 中的对应变量，输出 TSV/CSV。
 *
 * Usage:
 *   tsx src/scripts/exportEmailTemplateCsv.ts <taskId> [shopName] [outPath]
 *
 * 默认读取仓库根目录 `.env.prod` 连接 Blob / Cosmos（可用 `--local` 改读 `.env`）。
 *
 * 示例:
 *   tsx src/scripts/exportEmailTemplateCsv.ts c30d0627-4b6b-4fe1-ac41-2b729220cb5e
 *   tsx src/scripts/exportEmailTemplateCsv.ts c30d0627-4b6b-4fe1-ac41-2b729220cb5e ciwishop.myshopify.com ./email-template.tsv
 *
 * 列说明:
 *   moduleType   — 固定 EMAIL_TEMPLATE
 *   resourceId   — Shopify GID
 *   key          — 字段 key
 *   source_text  — 原文 HTML（blob originalValue）
 *   source_code  — 任务源语言（Cosmos job.source）
 *   target_text  — 变量已按原文还原后的译文 HTML
 *   target_code  — 目标语言（Cosmos job.target，如 ar）
 *   digest       — Shopify digest
 *   type         — Shopify 字段 type（来自 init blob shopifyType）
 *
 * 依赖 `.env.prod` 中的 Blob / Cosmos 环境变量（与 prod worker 一致）:
 *   AZURE_BLOB_CONNECTION_STRING, AZURE_BLOB_TRANSLATION_CONTAINER
 *   COSMOS_ENDPOINT, COSMOS_KEY, COSMOS_TRANSLATION_DATABASE_ID,
 *   COSMOS_TRANSLATION_V4_JOBS_CONTAINER（未设置时默认 translation_v4_jobs）
 */
import { createWriteStream, existsSync, readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CosmosClient } from "@azure/cosmos";
import { blobListPaths, blobRead } from "../services/blobV4.js";
import {
  loadTranslatedItemsForModule,
  type TranslatedResourceItem,
} from "../services/translateBlobIO.js";

const MODULE = "EMAIL_TEMPLATE";
const LIQUID_TOKEN_RE = /\{%-?[\s\S]*?-?%\}|\{\{[^{}]*\}\}/g;

const CSV_HEADER = [
  "moduleType",
  "resourceId",
  "key",
  "source_text",
  "source_code",
  "target_text",
  "target_code",
  "digest",
  "type",
] as const;

type CsvRow = Record<(typeof CSV_HEADER)[number], string>;

type InitFieldMeta = { shopifyType?: string };
type InitResource = {
  resourceId: string;
  fields: Array<{ key: string; shopifyType?: string }>;
};

type JobMeta = {
  shopName: string;
  sourceLocale: string;
  targetLocale: string;
  blobPrefix: string;
  status?: string;
  modules?: string[];
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const workerRoot = resolve(__dirname, "../..");
const repoRoot = resolve(workerRoot, "..");

function logInfo(msg: string): void {
  console.log(`[email-export] ${msg}`);
}

function logError(msg: string, err?: unknown): void {
  const detail = err instanceof Error ? err.message : err != null ? String(err) : "";
  console.error(`[email-export] ERROR ${msg}${detail ? `: ${detail}` : ""}`);
  if (err instanceof Error && err.stack) console.error(err.stack);
}

function loadEnvFile(filePath: string, override = false): boolean {
  if (!existsSync(filePath)) return false;
  for (const raw of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (override || !process.env[key]) process.env[key] = value;
  }
  return true;
}

/** 默认加载 `.env.prod`；`--local` 时改读 `.env`。 */
function loadRuntimeEnv(useLocal: boolean): void {
  const envPath = resolve(repoRoot, useLocal ? ".env" : ".env.prod");
  if (!loadEnvFile(envPath, true)) {
    logError(`${useLocal ? ".env" : ".env.prod"} 不存在: ${envPath}`);
    process.exit(1);
  }
  logInfo(`已加载 ${useLocal ? ".env" : ".env.prod"}`);
}

function logConnectionTargets(): void {
  const blobContainer =
    process.env.AZURE_BLOB_TRANSLATION_CONTAINER?.trim() || "translation-content";
  const cosmosDb =
    process.env.COSMOS_TRANSLATION_DATABASE_ID_V4?.trim() ||
    process.env.COSMOS_TRANSLATION_DATABASE_ID?.trim() ||
    "translation";
  const cosmosContainer =
    process.env.COSMOS_TRANSLATION_V4_JOBS_CONTAINER_V4?.trim() ||
    process.env.COSMOS_TRANSLATION_V4_JOBS_CONTAINER?.trim() ||
    "translation_v4_jobs";
  logInfo(
    `连接目标 blobContainer=${blobContainer} cosmosDb=${cosmosDb} cosmosContainer=${cosmosContainer}`,
  );
}

function cosmosConfig(): { endpoint: string; key: string; db: string; container: string } | null {
  const endpoint =
    process.env.COSMOS_ENDPOINT_V4?.trim() ||
    process.env.COSMOS_ENDPOINT?.trim() ||
    "";
  const key =
    process.env.COSMOS_KEY_V4?.trim() || process.env.COSMOS_KEY?.trim() || "";
  if (!endpoint || !key) return null;
  return {
    endpoint,
    key,
    db:
      process.env.COSMOS_TRANSLATION_DATABASE_ID_V4?.trim() ||
      process.env.COSMOS_TRANSLATION_DATABASE_ID?.trim() ||
      "translation",
    container:
      process.env.COSMOS_TRANSLATION_V4_JOBS_CONTAINER_V4?.trim() ||
      process.env.COSMOS_TRANSLATION_V4_JOBS_CONTAINER?.trim() ||
      "translation_v4_jobs",
  };
}

async function resolveJobMeta(taskId: string, shopArg?: string): Promise<JobMeta> {
  if (shopArg) {
    return {
      shopName: shopArg,
      sourceLocale: "",
      targetLocale: "",
      blobPrefix: `tasks/v4/${shopArg}/${taskId}`,
    };
  }

  const cfg = cosmosConfig();
  if (cfg) {
    const client = new CosmosClient({ endpoint: cfg.endpoint, key: cfg.key });
    const container = client.database(cfg.db).container(cfg.container);
    const { resources } = await container.items
      .query({
        query: "SELECT * FROM c WHERE c.id = @id",
        parameters: [{ name: "@id", value: taskId }],
      })
      .fetchAll();
    if (resources.length > 0) {
      const job = resources[0] as {
        shopName?: string;
        source?: string;
        target?: string;
        blobPrefix?: string;
        status?: string;
        modules?: string[];
      };
      const shopName = job.shopName?.trim();
      if (shopName) {
        return {
          shopName,
          sourceLocale: job.source?.trim() ?? "",
          targetLocale: job.target?.trim() ?? "",
          blobPrefix: job.blobPrefix?.trim() || `tasks/v4/${shopName}/${taskId}`,
          status: job.status,
          modules: job.modules,
        };
      }
    }
  }

  // Blob 路径扫描兜底
  logInfo(`Cosmos 未命中，扫描 Blob 路径 tasks/v4/*/${taskId}/ ...`);
  const allPaths = await blobListPaths("tasks/v4/");
  const match = allPaths.find((p) => p.includes(`/${taskId}/`));
  if (!match) {
    throw new Error(
      `无法定位任务 ${taskId}：请传入 shopName，或配置 Cosmos/Blob 环境变量`,
    );
  }
  const parts = match.split("/");
  const shopName = parts[2];
  if (!shopName) throw new Error(`Blob 路径解析失败: ${match}`);
  return {
    shopName,
    sourceLocale: "",
    targetLocale: "",
    blobPrefix: `tasks/v4/${shopName}/${taskId}`,
  };
}

async function loadInitFieldMeta(blobPrefix: string): Promise<Map<string, InitFieldMeta>> {
  const meta = new Map<string, InitFieldMeta>();
  const prefix = `${blobPrefix}/init/${MODULE}/`;
  const paths = (await blobListPaths(prefix)).filter((p) => p.endsWith(".json"));
  for (const path of paths) {
    const chunk = await blobRead<InitResource[]>(path);
    if (!chunk) continue;
    for (const res of chunk) {
      for (const field of res.fields ?? []) {
        meta.set(`${res.resourceId}\0${field.key}`, { shopifyType: field.shopifyType });
      }
    }
  }
  return meta;
}

/** 列出 init/translate 下已有的 module 名，便于排查空数据。 */
async function diagnoseBlobModules(blobPrefix: string): Promise<void> {
  for (const stage of ["init", "translate"] as const) {
    const prefix = `${blobPrefix}/${stage}/`;
    const paths = await blobListPaths(prefix);
    const modules = new Set<string>();
    for (const p of paths) {
      const rest = p.slice(prefix.length);
      const mod = rest.split("/")[0];
      if (mod) modules.add(mod);
    }
    logInfo(`${stage} 阶段 module: ${modules.size ? [...modules].join(", ") : "(无)"}`);
    if (paths.length > 0) {
      logInfo(`${stage} blob 样例: ${paths.slice(0, 3).join(" | ")}`);
    }
  }
}

/** 按出现顺序，将 target 中的 Liquid 变量替换为 source 中对应变量。 */
export function replaceLiquidVariablesFromSource(
  sourceHtml: string,
  targetHtml: string,
): { fixed: string; sourceCount: number; targetCount: number } {
  const sourceTokens: string[] = [];
  LIQUID_TOKEN_RE.lastIndex = 0;
  sourceHtml.replace(LIQUID_TOKEN_RE, (m) => {
    sourceTokens.push(m);
    return m;
  });

  let targetCount = 0;
  LIQUID_TOKEN_RE.lastIndex = 0;
  targetCount = (targetHtml.match(LIQUID_TOKEN_RE) ?? []).length;

  let idx = 0;
  LIQUID_TOKEN_RE.lastIndex = 0;
  const fixed = targetHtml.replace(LIQUID_TOKEN_RE, (m) => {
    const replacement = sourceTokens[idx];
    idx += 1;
    return replacement ?? m;
  });

  return { fixed, sourceCount: sourceTokens.length, targetCount };
}

function csvCell(value: string): string {
  const normalized = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (/[\t\n"]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

function renderProgress(done: number, total: number, label: string): void {
  const width = 36;
  const pct = total > 0 ? done / total : 1;
  const filled = Math.round(width * pct);
  const bar = "█".repeat(filled) + "░".repeat(width - filled);
  const pctText = `${Math.round(pct * 100)}%`.padStart(4);
  process.stdout.write(`\r[${bar}] ${pctText} ${done}/${total} ${label}`.padEnd(100));
  if (done >= total) process.stdout.write("\n");
}

function buildRows(
  items: TranslatedResourceItem[],
  meta: Map<string, InitFieldMeta>,
  job: JobMeta,
  onProgress: (done: number, total: number) => void,
): { rows: CsvRow[]; warnings: string[] } {
  const rows: CsvRow[] = [];
  const warnings: string[] = [];
  let fieldTotal = 0;
  for (const item of items) fieldTotal += item.translations?.length ?? 0;

  let done = 0;
  for (const item of items) {
    for (const t of item.translations ?? []) {
      done += 1;
      onProgress(done, fieldTotal);

      const sourceHtml = t.originalValue ?? "";
      const targetHtml = t.translatedValue ?? "";
      const { fixed, sourceCount, targetCount } = replaceLiquidVariablesFromSource(
        sourceHtml,
        targetHtml,
      );

      if (sourceCount !== targetCount) {
        warnings.push(
          `${item.resourceId} key=${t.key}: Liquid 变量数量不一致 source=${sourceCount} target=${targetCount}`,
        );
      }

      const fieldMeta = meta.get(`${item.resourceId}\0${t.key}`);
      rows.push({
        moduleType: MODULE,
        resourceId: item.resourceId,
        key: t.key,
        source_text: sourceHtml,
        source_code: job.sourceLocale,
        target_text: fixed,
        target_code: job.targetLocale,
        digest: t.digest ?? "",
        type: fieldMeta?.shopifyType ?? "",
      });
    }
  }
  return { rows, warnings };
}

async function writeTsv(outPath: string, rows: CsvRow[]): Promise<void> {
  await mkdir(dirname(outPath), { recursive: true });
  await new Promise<void>((resolvePromise, reject) => {
    const stream = createWriteStream(outPath, { encoding: "utf8" });
    stream.on("error", reject);
    stream.on("finish", () => resolvePromise());

    stream.write(`${CSV_HEADER.join("\t")}\n`);
    for (const row of rows) {
      stream.write(`${CSV_HEADER.map((h) => csvCell(row[h] ?? "")).join("\t")}\n`);
    }
    stream.end();
  });
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const useLocal = args.includes("--local");
  const filteredArgs = args.filter((a) => a !== "--local" && a !== "--prod");

  loadRuntimeEnv(useLocal);
  logConnectionTargets();

  const [taskId, shopArg, outArg] = filteredArgs;
  if (!taskId) {
    console.error(
      "Usage: tsx src/scripts/exportEmailTemplateCsv.ts <taskId> [shopName] [outPath]",
    );
    process.exit(1);
  }

  if (!process.env.AZURE_BLOB_CONNECTION_STRING?.trim()) {
    logError("缺少 AZURE_BLOB_CONNECTION_STRING");
    process.exit(1);
  }

  logInfo(`taskId=${taskId}`);
  const job = await resolveJobMeta(taskId, shopArg);
  logInfo(`shop=${job.shopName} blobPrefix=${job.blobPrefix}`);
  if (job.status) logInfo(`status=${job.status}`);
  if (job.modules?.length) logInfo(`modules=${job.modules.join(",")}`);
  if (job.sourceLocale) logInfo(`source=${job.sourceLocale} target=${job.targetLocale}`);

  logInfo("读取 init 元数据 ...");
  const meta = await loadInitFieldMeta(job.blobPrefix);
  logInfo(`init 字段元数据 ${meta.size} 条`);

  logInfo(`读取 translate/${MODULE} ...`);
  const items = await loadTranslatedItemsForModule(job.blobPrefix, MODULE);
  if (items.length === 0) {
    logError(`未找到 ${MODULE} 译文数据，请检查 taskId/shopName`);
    await diagnoseBlobModules(job.blobPrefix);
    logError("若 Cosmos 有任务但 Blob 为空，请确认 `.env.prod` 中 Blob 配置与任务环境一致");
    process.exit(2);
  }
  logInfo(`资源数 ${items.length}`);

  const { rows, warnings } = buildRows(items, meta, job, (done, total) => {
    renderProgress(done, total, "fields");
  });

  for (const w of warnings) logError(w);
  logInfo(`警告 ${warnings.length} 条，成功行 ${rows.length} 条`);

  const defaultName = `email-template-${job.shopName.replace(/[^\w.-]+/g, "_")}-${taskId}.csv`;
  const outPath = resolve(outArg || join(repoRoot, defaultName));
  await writeTsv(outPath, rows);
  logInfo(`已写入 ${outPath}`);
}

main().catch((err) => {
  logError("脚本失败", err);
  process.exit(1);
});
