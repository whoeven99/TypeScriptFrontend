#!/usr/bin/env node
/**
 * 把 Spark worker 的 translationFilter 规则同步进 TSF（唯一真相在 Spark）。
 *
 *   node scripts/sync-translation-filter.mjs [sparkRepoPath]   # 同步并写 provenance
 *   node scripts/sync-translation-filter.mjs --check [sparkRepoPath]  # 仅校验副本未被手改
 *
 * 默认 sparkRepoPath = ../Spark（两仓库同级）。
 *
 * 转换：worker 用 ESM `.js` 后缀的相对 import（`./types.js`），TSF 用 Vite/bundler 解析，
 * 这里统一去掉相对 import 的 `.js` 后缀。除此之外内容原样拷贝。
 *
 * provenance（.synced-from-spark.json）记录来源 commit + 每文件 sha256 + 汇总 hash。
 * `--check` 重新计算 TSF 副本的 hash 与 provenance 比对，不一致即退出 1——
 * 用于 CI 守卫：**禁止手改 TSF 副本**，规则变更必须经本脚本从 Spark 同步。
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  readdirSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TSF_ROOT = resolve(__dirname, "..");
const DEST_DIR = join(TSF_ROOT, "app/server/translateV4/translationFilter");
const PROVENANCE = join(DEST_DIR, ".synced-from-spark.json");
const SRC_REL = "worker/src/services/translationFilter";

const args = process.argv.slice(2);
const checkMode = args.includes("--check");
const sparkArg = args.find((a) => !a.startsWith("--"));
const SPARK_ROOT = resolve(TSF_ROOT, sparkArg || "../Spark");
const SRC_DIR = join(SPARK_ROOT, SRC_REL);

/** 去掉相对 import 的 .js 后缀，适配 TSF 解析。 */
function transform(source) {
  return source.replace(
    /(from\s+["']\.{1,2}\/[^"']+?)\.js(["'])/g,
    "$1$2",
  );
}

function sha256(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function listTsFiles(dir) {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".ts"))
    .sort();
}

function sparkCommit() {
  try {
    return execFileSync("git", ["-C", SPARK_ROOT, "rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim();
  } catch {
    return "unknown";
  }
}

if (checkMode) {
  if (!existsSync(PROVENANCE)) {
    console.error(
      "[sync-filter] provenance 缺失，请先运行 sync。",
    );
    process.exit(1);
  }
  const recorded = JSON.parse(readFileSync(PROVENANCE, "utf8"));
  let drift = false;
  for (const file of listTsFiles(DEST_DIR)) {
    const actual = sha256(readFileSync(join(DEST_DIR, file), "utf8"));
    const expected = recorded.files?.[file];
    if (actual !== expected) {
      console.error(`[sync-filter] 副本被改动: ${file}`);
      drift = true;
    }
  }
  const recordedNames = Object.keys(recorded.files ?? {}).sort();
  const actualNames = listTsFiles(DEST_DIR);
  if (recordedNames.join(",") !== actualNames.join(",")) {
    console.error("[sync-filter] 副本文件清单与 provenance 不符");
    drift = true;
  }
  if (drift) {
    console.error(
      "[sync-filter] FAIL：translationFilter 副本与登记不符。请勿手改副本，改规则请在 Spark 改后运行同步脚本。",
    );
    process.exit(1);
  }
  console.log("[sync-filter] OK：副本与 provenance 一致。");
  process.exit(0);
}

// —— 同步模式 ——
if (!existsSync(SRC_DIR)) {
  console.error(`[sync-filter] 找不到来源目录: ${SRC_DIR}\n请用参数指定 Spark 仓库路径。`);
  process.exit(1);
}
mkdirSync(DEST_DIR, { recursive: true });

const files = {};
for (const file of listTsFiles(SRC_DIR)) {
  const transformed = transform(readFileSync(join(SRC_DIR, file), "utf8"));
  writeFileSync(join(DEST_DIR, file), transformed);
  files[file] = sha256(transformed);
}

const provenance = {
  note: "AUTO-GENERATED from Spark worker. 勿手改本目录任何文件——改规则请在 Spark 改后运行 scripts/sync-translation-filter.mjs。",
  source: `${SRC_REL} @ Spark`,
  sparkCommit: sparkCommit(),
  syncedAt: new Date().toISOString(),
  combined: sha256(Object.values(files).join("")),
  files,
};
writeFileSync(PROVENANCE, JSON.stringify(provenance, null, 2) + "\n");

console.log(
  `[sync-filter] 已同步 ${Object.keys(files).length} 个文件 ← ${SRC_DIR}\n  sparkCommit=${provenance.sparkCommit}`,
);
