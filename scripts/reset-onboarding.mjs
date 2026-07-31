/**
 * 把「指定 shop」重置为可重新看到首次翻译新手引导（onboarding）的状态。
 *
 * 作用范围（默认，最小侵入）：
 *   1) Turso  ShopOnboarding        —— 删除该店行（status 回到 not_started）
 *   2) Cosmos translation_v4_jobs   —— 删除该店全部 v4 任务（否则入口判定为老用户）
 *   3) Turso  TranslateV4JobUsage   —— 删除该店任务用量快照
 *
 * 附加（--billing，更彻底，让 isNew=true / 恢复试用资格）：
 *   4) Turso  AccountPeriodUsage / BillingLog / AppSubscription / Account
 *
 * 安全设计：
 *   - 默认 dry-run，只打印将删除的条数，不落库；加 --write 才真正执行。
 *   - 必须显式 --shop，且所有操作都 WHERE shop = <shop> / partitionKey=<shop>。
 *   - 不打印任何密钥；只打印脱敏 host。
 *
 * 用法：
 *   node scripts/reset-onboarding.mjs --shop=xxx.myshopify.com               （dry-run，读 .env）
 *   node scripts/reset-onboarding.mjs --shop=xxx --env=.env.test --write
 *   node scripts/reset-onboarding.mjs --shop=xxx --env=.env.test --write --billing
 *   node scripts/reset-onboarding.mjs --shop=xxx --target=prod --write        （谨慎！）
 *
 * 依赖：@libsql/client、@azure/cosmos（仓库已装）。
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@libsql/client";
import { CosmosClient } from "@azure/cosmos";

// ---------- 参数解析 ----------
function parseArgs(argv) {
  const args = { _: [] };
  for (const raw of argv) {
    if (!raw.startsWith("--")) {
      args._.push(raw);
      continue;
    }
    const body = raw.slice(2);
    const eq = body.indexOf("=");
    if (eq === -1) args[body] = true;
    else args[body.slice(0, eq)] = body.slice(eq + 1);
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const shop = String(args.shop || "").trim();
const write = Boolean(args.write);
const includeBilling = Boolean(args.billing);
const envFile = String(args.env || ".env").trim();

if (!shop) {
  console.error(
    "缺少 --shop。示例：node scripts/reset-onboarding.mjs --shop=xxx.myshopify.com --env=.env.test",
  );
  process.exit(1);
}

// ---------- 读取 env 文件（不覆盖已存在的 process.env）----------
const root = resolve(import.meta.dirname, "..");
function loadEnvFile(file) {
  let text;
  try {
    text = readFileSync(resolve(root, file), "utf8");
  } catch {
    console.error(`无法读取 env 文件：${file}`);
    process.exit(1);
  }
  for (const raw of text.split(/\r?\n/)) {
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
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnvFile(envFile);

// ---------- 解析 Turso 目标库（与 app/config/tursoTarget.server.ts 对齐）----------
function normalizeTarget(v) {
  const s = String(v || "").trim().toLowerCase();
  if (s === "prod" || s === "production") return "prod";
  if (s === "test" || s === "testing") return "test";
  return "";
}
const target =
  normalizeTarget(args.target) || normalizeTarget(process.env.TURSO_TARGET) || "test";

function readTursoCreds(desired) {
  // 候选按「期望 target 优先 → 另一 target → TSF_*」排序，取第一组齐全的凭据。
  // 兼容 .env.test 里 TURSO_TARGET=prod 但只带 TURSO_TEST_* 的常见情况。
  const candidates = [
    desired === "prod"
      ? { urlKey: "TURSO_PROD_DATABASE_URL", tokenKey: "TURSO_PROD_AUTH_TOKEN" }
      : { urlKey: "TURSO_TEST_DATABASE_URL", tokenKey: "TURSO_TEST_AUTH_TOKEN" },
    desired === "prod"
      ? { urlKey: "TURSO_TEST_DATABASE_URL", tokenKey: "TURSO_TEST_AUTH_TOKEN" }
      : { urlKey: "TURSO_PROD_DATABASE_URL", tokenKey: "TURSO_PROD_AUTH_TOKEN" },
    { urlKey: "TSF_TURSO_DATABASE_URL", tokenKey: "TSF_TURSO_AUTH_TOKEN" },
  ];
  for (const c of candidates) {
    const url = (process.env[c.urlKey] || "").trim();
    const authToken = (process.env[c.tokenKey] || "").trim();
    if (url && authToken) {
      return { url, authToken, usedUrlKey: c.urlKey };
    }
  }
  return { url: "", authToken: "", usedUrlKey: "" };
}

function maskHost(url) {
  try {
    return new URL(url).host;
  } catch {
    return "(invalid-url)";
  }
}

const { url: tursoUrl, authToken: tursoToken, usedUrlKey } = readTursoCreds(target);
if (!tursoUrl || !tursoToken) {
  console.error(
    `缺少 Turso 凭据（target=${target}）。请在 ${envFile} 配置 TURSO_${target.toUpperCase()}_DATABASE_URL / _AUTH_TOKEN（或 TSF_TURSO_*）。`,
  );
  process.exit(1);
}

const turso = createClient({ url: tursoUrl, authToken: tursoToken });

// ---------- Cosmos v4 jobs ----------
const cosmosEndpoint = (process.env.COSMOS_ENDPOINT_V4 || "").trim();
const cosmosKey = (process.env.COSMOS_KEY_V4 || "").trim();
const cosmosDbId = (process.env.COSMOS_TRANSLATION_DATABASE_ID_V4 || "translation").trim();
const cosmosContainerId = (
  process.env.COSMOS_TRANSLATION_V4_JOBS_CONTAINER_V4 || "translation_v4_jobs"
).trim();

let cosmosContainer = null;
if (cosmosEndpoint && cosmosKey) {
  cosmosContainer = new CosmosClient({ endpoint: cosmosEndpoint, key: cosmosKey })
    .database(cosmosDbId)
    .container(cosmosContainerId);
}

// ---------- 执行 ----------
const MODE = write ? "WRITE" : "DRY-RUN";
console.log("===== reset-onboarding =====");
console.log(
  JSON.stringify(
    {
      mode: MODE,
      shop,
      env: envFile,
      tursoTarget: target,
      tursoKey: usedUrlKey,
      tursoHost: maskHost(tursoUrl),
      cosmos: cosmosContainer
        ? `${cosmosDbId}/${cosmosContainerId}`
        : "(未配置 COSMOS_*_V4，跳过任务删除)",
      includeBilling,
    },
    null,
    2,
  ),
);

async function tursoCount(table) {
  try {
    const rs = await turso.execute({
      sql: `SELECT COUNT(*) AS n FROM "${table}" WHERE shop = ?`,
      args: [shop],
    });
    return Number(rs.rows?.[0]?.n ?? 0);
  } catch (err) {
    console.warn(`  [warn] 统计 ${table} 失败：${err?.message || err}`);
    return 0;
  }
}

async function tursoDelete(table) {
  const before = await tursoCount(table);
  if (!write) {
    console.log(`  [dry] Turso ${table}: 将删除 ${before} 行`);
    return;
  }
  try {
    await turso.execute({
      sql: `DELETE FROM "${table}" WHERE shop = ?`,
      args: [shop],
    });
    console.log(`  [ok ] Turso ${table}: 已删除 ${before} 行`);
  } catch (err) {
    console.error(`  [err] Turso ${table} 删除失败：${err?.message || err}`);
  }
}

async function deleteCosmosJobs() {
  if (!cosmosContainer) return;
  let jobs = [];
  try {
    const { resources } = await cosmosContainer.items
      .query({
        query: "SELECT c.id, c.status FROM c WHERE c.shopName = @shop",
        parameters: [{ name: "@shop", value: shop }],
      })
      .fetchAll();
    jobs = resources;
  } catch (err) {
    console.error(`  [err] Cosmos 查询任务失败：${err?.message || err}`);
    return;
  }

  if (!write) {
    console.log(`  [dry] Cosmos v4 jobs: 将删除 ${jobs.length} 个任务`);
    for (const j of jobs.slice(0, 10)) {
      console.log(`        - ${j.id} (${j.status})`);
    }
    if (jobs.length > 10) console.log(`        …以及另外 ${jobs.length - 10} 个`);
    return;
  }

  let done = 0;
  for (const j of jobs) {
    try {
      await cosmosContainer.item(j.id, shop).delete();
      done += 1;
    } catch (err) {
      console.error(`  [err] 删除任务 ${j.id} 失败：${err?.message || err}`);
    }
  }
  console.log(`  [ok ] Cosmos v4 jobs: 已删除 ${done}/${jobs.length} 个任务`);
}

async function main() {
  console.log("\n-- 步骤 1/3：重置 onboarding 状态 --");
  await tursoDelete("ShopOnboarding");

  console.log("\n-- 步骤 2/3：删除该店 v4 任务 --");
  await deleteCosmosJobs();
  await tursoDelete("TranslateV4JobUsage");

  if (includeBilling) {
    console.log("\n-- 步骤 3/3：清空账单（isNew=true / 恢复试用资格）--");
    // 子表 → 主表顺序删除
    await tursoDelete("AccountPeriodUsage");
    await tursoDelete("BillingLog");
    await tursoDelete("AppSubscription");
    await tursoDelete("Account");
  } else {
    console.log(
      "\n-- 步骤 3/3：跳过账单（未加 --billing）。若主 CTA 想显示「开试用」，请加 --billing --",
    );
  }

  console.log(
    `\n===== 完成（${MODE}）=====` +
      (write
        ? "\n下一步：在测试店重新打开 /app（或强制刷新），应重定向到 /app/onboarding。"
        : "\n这是 dry-run，未改动任何数据。确认无误后加 --write 执行。"),
  );
}

main()
  .catch((err) => {
    console.error("脚本异常：", err?.message || err);
    process.exit(1);
  })
  .finally(() => {
    try {
      turso.close?.();
    } catch {
      // ignore
    }
  });
