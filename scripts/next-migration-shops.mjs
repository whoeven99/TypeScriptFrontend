// 从 Spring SQL Server 拉下一批迁移候选店（只读）。
//
// 筛选：Translates.auto_translate=1 + 近期有 auto 任务历史 + Users 仍活跃
// 排除：shop.txt 里出现过的域名（含 # 注释行）
// 排序：avg(used_token) 升序（小店优先）
//
// .env.prod 需配置（Spring 生产库，与 SpringBackend bootstrap.yml prod 一致）：
//   SPRING_DB_SERVER=bogdatechsqlserverprod.database.windows.net
//   SPRING_DB_DATABASE=bogdatech-prod
//   SPRING_DB_USER=bogdatechsqlserverprod@bogdatechsqlserverprod
//   SPRING_DB_PASSWORD=...
// 也支持 SPRING_DB_URL=jdbc:sqlserver://host:1433;database=...;encrypt=true;...
//
// 用法（TypeScriptFrontend 根目录）：
//   node scripts/next-migration-shops.mjs
//   node scripts/next-migration-shops.mjs --limit=20 --min-active-days=7
//   node scripts/next-migration-shops.mjs --lookback-days=30

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import sql from "mssql";

const ROOT = process.cwd();
const ENV_FILE = path.join(ROOT, ".env.prod");
const SHOP_FILE = path.join(ROOT, "shop.txt");

function loadDotEnv(dotenvPath) {
  if (!existsSync(dotenvPath)) return {};
  const result = {};
  for (const rawLine of readFileSync(dotenvPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[line.slice(0, idx).trim()] = value;
  }
  return result;
}

const env = { ...loadDotEnv(ENV_FILE), ...process.env };

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  }),
);

const MIN_ACTIVE_DAYS = Math.max(1, Number(args["min-active-days"]) || 1);
const LOOKBACK_DAYS = Math.max(1, Number(args["lookback-days"]) || 90);
const LIMIT = Math.min(20, Math.max(10, Number(args.limit) || 15));

function normalizeShop(shop) {
  const trimmed = String(shop || "").trim().toLowerCase();
  if (!trimmed) return "";
  if (trimmed.includes(".")) return trimmed;
  return `${trimmed}.myshopify.com`;
}

/** shop.txt 里任意行出现的 myshopify 域名均视为已列入迁移清单（含 # 注释）。 */
function loadExcludedShops() {
  if (!existsSync(SHOP_FILE)) return new Set();
  const excluded = new Set();
  const re = /([a-z0-9][a-z0-9-]*\.myshopify\.com)/gi;
  for (const rawLine of readFileSync(SHOP_FILE, "utf8").split(/\r?\n/)) {
    for (const m of rawLine.matchAll(re)) {
      excluded.add(normalizeShop(m[1]));
    }
  }
  return excluded;
}

function parseJdbcUrl(jdbcUrl) {
  const raw = jdbcUrl.trim();
  const withoutPrefix = raw.replace(/^jdbc:sqlserver:\/\//i, "");
  const [hostPart, ...rest] = withoutPrefix.split(";");
  const [server, portStr] = hostPart.split(":");
  const params = Object.fromEntries(
    rest
      .filter(Boolean)
      .map((p) => p.split("="))
      .filter((kv) => kv.length >= 2)
      .map(([k, ...v]) => [k.trim().toLowerCase(), v.join("=").trim()]),
  );
  return {
    server: server.trim(),
    port: portStr ? Number(portStr) : 1433,
    database: params.database || params["initial catalog"] || "",
  };
}

function resolveSqlConfig() {
  const password = env.SPRING_DB_PASSWORD || env.SPRING_PASSWORD || "";
  const user = env.SPRING_DB_USER || env.SPRING_USERNAME || env.SPRING_DB_USERNAME || "";

  if (env.SPRING_DB_URL || env.SPRING_URL) {
    const parsed = parseJdbcUrl(env.SPRING_DB_URL || env.SPRING_URL);
    if (!parsed.server || !parsed.database || !user || !password) {
      throw new Error("SPRING_DB_URL 已设置，但缺少 SPRING_DB_USER / SPRING_DB_PASSWORD");
    }
    return {
      server: parsed.server,
      port: parsed.port,
      database: parsed.database,
      user,
      password,
      options: {
        encrypt: true,
        trustServerCertificate: false,
      },
    };
  }

  const server = env.SPRING_DB_SERVER || env.SPRING_DB_HOST || "";
  const database = env.SPRING_DB_DATABASE || env.SPRING_DB_NAME || "bogdatech-prod";
  if (!server || !user || !password) {
    throw new Error(
      `缺少 Spring SQL 凭证。请在 ${ENV_FILE} 配置 SPRING_DB_SERVER、SPRING_DB_DATABASE、SPRING_DB_USER、SPRING_DB_PASSWORD`,
    );
  }

  return {
    server,
    port: Number(env.SPRING_DB_PORT) || 1433,
    database,
    user,
    password,
    options: {
      encrypt: true,
      trustServerCertificate: false,
    },
  };
}

const CANDIDATES_SQL = `
WITH active_shops AS (
  SELECT shop_name
  FROM Users
  WHERE login_time IS NOT NULL
    AND (
      uninstall_time IS NULL
      OR login_time > uninstall_time
    )
),
auto_on AS (
  SELECT shop_name
  FROM Translates
  WHERE auto_translate = 1
  GROUP BY shop_name
),
auto_history AS (
  SELECT
    shop_name,
    COUNT(DISTINCT CAST(created_at AS date)) AS auto_active_days,
    MAX(created_at) AS last_auto_at,
    AVG(CAST(used_token AS float)) AS avg_used_token,
    MAX(CAST(used_token AS float)) AS max_used_token,
    COUNT(*) AS auto_task_count
  FROM Initial_Translate_Tasks_V2
  WHERE task_type = 'auto'
    AND is_deleted = 0
    AND created_at >= DATEADD(day, -@lookbackDays, GETUTCDATE())
  GROUP BY shop_name
  HAVING COUNT(DISTINCT CAST(created_at AS date)) >= @minActiveDays
)
SELECT
  ao.shop_name,
  ah.auto_active_days,
  ah.auto_task_count,
  ah.last_auto_at,
  CAST(ROUND(ah.avg_used_token, 0) AS bigint) AS avg_used_token,
  CAST(ah.max_used_token AS bigint) AS max_used_token,
  (
    SELECT COUNT(*)
    FROM Translates t
    WHERE t.shop_name = ao.shop_name AND t.auto_translate = 1
  ) AS auto_target_count
FROM auto_on ao
INNER JOIN active_shops u ON u.shop_name = ao.shop_name
INNER JOIN auto_history ah ON ah.shop_name = ao.shop_name
ORDER BY ah.avg_used_token ASC, ah.last_auto_at DESC;
`;

function pad(str, len) {
  const s = String(str ?? "");
  return s.length >= len ? s : s + " ".repeat(len - s.length);
}

async function main() {
  const excluded = loadExcludedShops();
  const sqlConfig = resolveSqlConfig();

  console.log(
    `连接 Spring SQL: ${sqlConfig.server}/${sqlConfig.database}  lookback=${LOOKBACK_DAYS}d  min_active_days=${MIN_ACTIVE_DAYS}  limit=${LIMIT}`,
  );
  console.log(`shop.txt 已排除 ${excluded.size} 个域名\n`);

  const pool = await sql.connect(sqlConfig);
  try {
    const request = pool.request();
    request.input("lookbackDays", sql.Int, LOOKBACK_DAYS);
    request.input("minActiveDays", sql.Int, MIN_ACTIVE_DAYS);
    const { recordset } = await request.query(CANDIDATES_SQL);

    const remaining = recordset.filter((row) => !excluded.has(normalizeShop(row.shop_name)));
    const batch = remaining.slice(0, LIMIT);

    console.log(`=== 迁移候选批次 ===`);
    console.log(`本批 ${batch.length} 家 | 剩余候选总数 ${remaining.length}（已扣 shop.txt）\n`);

    if (!batch.length) {
      console.log("没有更多候选店。可调低 --min-active-days 或检查 Spring 数据 / shop.txt。");
      return;
    }

    const header =
      `${pad("shop_name", 36)} ${pad("avg_used_token", 14)} ${pad("max_used", 10)} ` +
      `${pad("auto_days", 9)} ${pad("auto_targets", 12)} last_auto_at`;
    console.log(header);
    console.log("-".repeat(header.length));

    for (const row of batch) {
      const lastAt = row.last_auto_at ? new Date(row.last_auto_at).toISOString().slice(0, 19) : "-";
      console.log(
        `${pad(row.shop_name, 36)} ${pad(row.avg_used_token, 14)} ${pad(row.max_used_token, 10)} ` +
          `${pad(row.auto_active_days, 9)} ${pad(row.auto_target_count, 12)} ${lastAt}`,
      );
    }

    console.log(`\n--- 复制到 shop.txt ---`);
    for (const row of batch) {
      console.log(row.shop_name);
    }
  } finally {
    await pool.close();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
