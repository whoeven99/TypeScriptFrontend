/**
 * 为已有表结构、但 _prisma_migrations 无记录的 Turso 库做 baseline。
 * 只写入 migration 记录，不执行 SQL。
 *
 * 用法：
 *   node scripts/turso-baseline.cjs test
 *   node scripts/turso-baseline.cjs test --through 20260622144316_add_shop_target_locale_glossary_int_id
 *   node scripts/turso-baseline.cjs test --auto   # 按表存在情况推断
 *
 * baseline 完成后执行：
 *   npm run turso:migrate:test
 */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { createClient } = require("@libsql/client/http");

const PRISMA_MIGRATIONS_DDL = `
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id"                    TEXT PRIMARY KEY NOT NULL,
    "checksum"              TEXT NOT NULL,
    "finished_at"           DATETIME,
    "migration_name"        TEXT NOT NULL,
    "logs"                  TEXT,
    "rolled_back_at"        DATETIME,
    "started_at"            DATETIME NOT NULL,
    "applied_steps_count"   INTEGER NOT NULL DEFAULT 0
);
`;

/** migration 名 → 该 migration 执行后应存在的代表性表（用于 --auto） */
const MIGRATION_MARKERS = [
  { name: "20250526051132_init", table: "Session" },
  { name: "20250619000000_add_session_refresh_token", table: "Session" },
  { name: "20260622111403_add_shop_translation_glossary_liquid", table: "ShopTranslationSettings" },
  { name: "20260622144316_add_shop_target_locale_glossary_int_id", table: "ShopTargetLocale" },
  { name: "20260629100000_add_switcher_configuration_ip_redirection", table: "SwitcherConfiguration" },
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
    .sort()
    .map((name) => ({
      name,
      sqlPath: path.join(migrationsDir, name, "migration.sql"),
    }))
    .filter((m) => fs.existsSync(m.sqlPath));
}

function checksumSql(sql) {
  return crypto.createHash("sha256").update(sql, "utf8").digest("hex");
}

async function tableExists(client, table) {
  try {
    await client.execute(`SELECT 1 FROM "${table}" LIMIT 1`);
    return true;
  } catch {
    return false;
  }
}

async function getAppliedNames(client) {
  const res = await client.execute(
    'SELECT migration_name FROM "_prisma_migrations" WHERE rolled_back_at IS NULL',
  );
  return new Set(res.rows.map((row) => String(row.migration_name)));
}

async function markApplied(client, migrationName, sql) {
  const now = new Date().toISOString().replace("T", " ").replace("Z", "");
  const id = crypto.randomUUID();
  const checksum = checksumSql(sql);
  await client.execute({
    sql: `INSERT INTO "_prisma_migrations"
      (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
      VALUES (?, ?, ?, ?, NULL, NULL, ?, 1)`,
    args: [id, checksum, now, migrationName, now],
  });
}

async function detectThroughName(client) {
  let lastApplied = null;
  for (const marker of MIGRATION_MARKERS) {
    if (await tableExists(client, marker.table)) {
      lastApplied = marker.name;
    }
  }
  return lastApplied;
}

async function main() {
  const root = process.cwd();
  const envFromFile = loadDotEnv(path.join(root, ".env"));
  const args = process.argv.slice(2);
  const target = (args.find((a) => a === "test" || a === "prod") || "test").trim();

  const throughIdx = args.indexOf("--through");
  const autoMode = args.includes("--auto");
  const throughArg = throughIdx >= 0 ? args[throughIdx + 1] : null;

  const urlKey = target === "prod" ? "TURSO_PROD_DATABASE_URL" : "TURSO_TEST_DATABASE_URL";
  const tokenKey = target === "prod" ? "TURSO_PROD_AUTH_TOKEN" : "TURSO_TEST_AUTH_TOKEN";
  const url = process.env[urlKey] || envFromFile[urlKey];
  const authToken = process.env[tokenKey] || envFromFile[tokenKey];

  if (!url?.startsWith("libsql://")) throw new Error(`无效 ${urlKey}`);
  if (!authToken || authToken === "REPLACE_ME") throw new Error(`无效 ${tokenKey}`);

  const client = createClient({ url, authToken });
  const migrations = listMigrations(path.join(root, "prisma", "migrations"));

  await client.execute(PRISMA_MIGRATIONS_DDL.trim());
  const applied = await getAppliedNames(client);

  let throughName = throughArg;
  if (autoMode) {
    throughName = await detectThroughName(client);
    if (!throughName) {
      console.log("[turso:baseline] --auto 未检测到已知表，跳过");
      return;
    }
    console.log(`[turso:baseline] --auto 检测到已应用到: ${throughName}`);
  }

  if (!throughName) {
    throw new Error("请指定 --through <migration_name> 或 --auto");
  }

  const throughIndex = migrations.findIndex((m) => m.name === throughName);
  if (throughIndex < 0) {
    throw new Error(`未找到 migration: ${throughName}`);
  }

  let marked = 0;
  for (let i = 0; i <= throughIndex; i += 1) {
    const migration = migrations[i];
    if (applied.has(migration.name)) {
      console.log(`[turso:baseline] 已存在，跳过: ${migration.name}`);
      continue;
    }
    const marker = MIGRATION_MARKERS.find((m) => m.name === migration.name);
    if (marker && !(await tableExists(client, marker.table))) {
      throw new Error(
        `[turso:baseline] 无法标记 ${migration.name}：表 ${marker.table} 不存在。` +
          " 请先 npm run turso:migrate:" +
          target +
          " 执行 SQL，勿仅用 --through 跳过建表。",
      );
    }
    const sql = fs.readFileSync(migration.sqlPath, "utf8");
    await markApplied(client, migration.name, sql);
    console.log(`[turso:baseline] 已标记: ${migration.name}`);
    marked += 1;
  }

  const pending = migrations.slice(throughIndex + 1).map((m) => m.name);
  console.log(`[turso:baseline] 本次标记 ${marked} 条`);
  if (pending.length) {
    console.log(`[turso:baseline] 待执行: ${pending.join(", ")}`);
    console.log(`[turso:baseline] 接下来运行: npm run turso:migrate:${target}`);
  } else {
    console.log("[turso:baseline] 无待执行 migration");
  }
}

main().catch((error) => {
  console.error("[turso:baseline] 失败:", error.message || error);
  process.exit(1);
});
