/**
 * 打印 Turso 连接目标、迁移记录与关键表是否存在（排错「连错库 / 漂移」）。
 *
 * 用法：npm run turso:status:test | npm run turso:status:prod
 */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@libsql/client/http");

const KEY_TABLES = [
  "Session",
  "ShopTranslationSettings",
  "ShopTargetLocale",
  "Glossary",
  "LiquidRule",
  "SwitcherConfiguration",
  "IpRedirection",
];

function loadDotEnv(dotenvPath) {
  if (!fs.existsSync(dotenvPath)) return {};
  const result = {};
  for (const rawLine of fs.readFileSync(dotenvPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    result[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return result;
}

function listMigrations(migrationsDir) {
  if (!fs.existsSync(migrationsDir)) return [];
  return fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

async function executeWithRetry(client, sql, args, maxAttempts = 4) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return args ? await client.execute({ sql, args }) : await client.execute(sql);
    } catch (error) {
      lastError = error;
      const msg = String(error.message || error);
      const retryable =
        /fetch failed|Connect Timeout|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN/i.test(msg) ||
        /UND_ERR_CONNECT_TIMEOUT/i.test(String(error.cause?.code || ""));
      if (!retryable || attempt >= maxAttempts) break;
      const waitMs = attempt * 1500;
      console.warn(`[turso:status] 网络重试 ${attempt}/${maxAttempts - 1}，${waitMs}ms 后重试…`);
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
  throw lastError;
}

function formatFetchError(error, host) {
  const cause = error.cause ? String(error.cause.message || error.cause) : "";
  return [
    `无法连接 Turso（host=${host}）: ${error.message || error}`,
    cause ? `原因: ${cause}` : "",
    "常见处理：",
    "  1. 直接重试命令（多为跨境网络瞬时超时）",
    "  2. 检查本机代理/VPN 是否拦截 *.turso.io",
    "  3. 在 Turso Dashboard 确认数据库未休眠、token 未过期",
  ]
    .filter(Boolean)
    .join("\n");
}

async function tableExists(client, table) {
  try {
    await executeWithRetry(client, `SELECT 1 FROM "${table}" LIMIT 1`);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const root = process.cwd();
  const env = loadDotEnv(path.join(root, ".env"));
  const target = (process.argv[2] || "test").trim().toLowerCase();
  const urlKey = target === "prod" ? "TURSO_PROD_DATABASE_URL" : "TURSO_TEST_DATABASE_URL";
  const tokenKey = target === "prod" ? "TURSO_PROD_AUTH_TOKEN" : "TURSO_TEST_AUTH_TOKEN";
  const url = process.env[urlKey] || env[urlKey];
  const authToken = process.env[tokenKey] || env[tokenKey];

  if (!url?.startsWith("libsql://")) throw new Error(`无效 ${urlKey}`);
  if (!authToken || authToken === "REPLACE_ME") throw new Error(`无效 ${tokenKey}`);

  const host = new URL(url).hostname;
  console.log(`[turso:status:${target}] host=${host}`);

  const client = createClient({ url, authToken });
  const local = listMigrations(path.join(root, "prisma", "migrations"));

  const applied = await executeWithRetry(
    client,
    'SELECT migration_name FROM "_prisma_migrations" WHERE rolled_back_at IS NULL ORDER BY finished_at',
  );
  const appliedSet = new Set(applied.rows.map((r) => String(r.migration_name)));

  console.log(`\n本地 migration (${local.length}):`);
  for (const name of local) {
    const mark = appliedSet.has(name) ? "applied" : "PENDING";
    console.log(`  [${mark}] ${name}`);
  }

  console.log("\n关键表:");
  for (const table of KEY_TABLES) {
    console.log(`  ${table}: ${(await tableExists(client, table)) ? "OK" : "MISSING"}`);
  }

  const switcher = "20260629100000_add_switcher_configuration_ip_redirection";
  const switcherApplied = appliedSet.has(switcher);
  const switcherTable = await tableExists(client, "SwitcherConfiguration");
  if (switcherApplied && !switcherTable) {
    console.log(
      `\n⚠ 漂移：${switcher} 已标记 applied 但 SwitcherConfiguration 不存在。` +
        ` 请运行: npm run turso:migrate:${target}`,
    );
  }

  try {
    const cols = await executeWithRetry(client, 'PRAGMA table_info("Glossary")');
    console.log("\nGlossary 列:", cols.rows.map((r) => r.name).join(", "));
  } catch {
    console.log("\nGlossary: 无表");
  }

  const tables = await executeWithRetry(
    client,
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
  );
  console.log(`\n全部表数量: ${tables.rows.length}`);
}

main().catch((e) => {
  const host = (() => {
    try {
      const env = loadDotEnv(path.join(process.cwd(), ".env"));
      const target = (process.argv[2] || "test").trim().toLowerCase();
      const urlKey = target === "prod" ? "TURSO_PROD_DATABASE_URL" : "TURSO_TEST_DATABASE_URL";
      return new URL(process.env[urlKey] || env[urlKey]).hostname;
    } catch {
      return "(unknown)";
    }
  })();
  const msg = /fetch failed|Connect Timeout|UND_ERR/i.test(String(e.message || e))
    ? formatFetchError(e, host)
    : e.message || e;
  console.error("[turso:status] 失败:", msg);
  process.exit(1);
});
