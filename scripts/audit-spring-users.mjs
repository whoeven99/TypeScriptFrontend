/**
 * Spring 用户总量 / 未迁移 TSF / offline token 是否有效（调 Shopify 验证）
 * 用法：node scripts/audit-spring-users.mjs
 * 可选：--validate-limit=50  只抽样验证前 N 个有 token 的店（默认全量）
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import sql from "mssql";
import { createClient } from "@libsql/client/http";

const ROOT = process.cwd();
const ENV_FILE = path.join(ROOT, ".env.prod");

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
const VALIDATE_LIMIT = args["validate-limit"]
  ? Number(args["validate-limit"])
  : Infinity;
const API_VERSION = env.SHOPIFY_API_VERSION || "2024-10";
const CONCURRENCY = Math.max(1, Number(args.concurrency) || 8);

function normalizeShop(shop) {
  const trimmed = String(shop || "").trim().toLowerCase();
  if (!trimmed) return "";
  if (trimmed.includes(".")) return trimmed;
  return `${trimmed}.myshopify.com`;
}

function isLikelyShopifyAccessToken(token) {
  const t = String(token || "").trim();
  return t.length >= 32 && (t.startsWith("shpat_") || t.startsWith("shpua_") || t.startsWith("shpca_"));
}

function resolveSqlConfig() {
  const password = env.SPRING_DB_PASSWORD || env.SPRING_PASSWORD || "";
  const user = env.SPRING_DB_USER || env.SPRING_USERNAME || env.SPRING_DB_USERNAME || "";
  if (env.SPRING_DB_URL || env.SPRING_URL) {
    const raw = (env.SPRING_DB_URL || env.SPRING_URL).trim();
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
      user,
      password,
      options: { encrypt: true, trustServerCertificate: false },
    };
  }
  return {
    server: env.SPRING_DB_SERVER || env.SPRING_DB_HOST || "",
    port: Number(env.SPRING_DB_PORT) || 1433,
    database: env.SPRING_DB_DATABASE || env.SPRING_DB_NAME || "bogdatech-prod",
    user,
    password,
    options: { encrypt: true, trustServerCertificate: false },
  };
}

async function validateToken(shop, token) {
  try {
    const r = await fetch(
      `https://${normalizeShop(shop)}/admin/api/${API_VERSION}/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": token,
        },
        body: JSON.stringify({ query: `{ shop { name } }` }),
        signal: AbortSignal.timeout(15000),
      },
    );
    const j = await r.json().catch(() => ({}));
    if (r.ok && j?.data?.shop?.name) return { ok: true };
    const msg =
      j?.errors?.[0]?.message ||
      (r.status === 401 ? "401 Unauthorized" : `HTTP ${r.status}`);
    return { ok: false, error: msg };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function mapPool(items, limit, fn) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

const tursoUrl = env.TURSO_PROD_DATABASE_URL || env.TURSO_DATABASE_URL;
const tursoToken = env.TURSO_PROD_AUTH_TOKEN || env.TURSO_AUTH_TOKEN;

const pool = await sql.connect(resolveSqlConfig());
try {
  const totals = await pool.request().query(`
    SELECT
      COUNT(*) AS total_users,
      SUM(CASE WHEN login_time IS NOT NULL THEN 1 ELSE 0 END) AS ever_logged_in,
      SUM(CASE
        WHEN login_time IS NOT NULL AND (uninstall_time IS NULL OR login_time > uninstall_time)
        THEN 1 ELSE 0 END) AS active_users,
      SUM(CASE
        WHEN uninstall_time IS NOT NULL AND (login_time IS NULL OR uninstall_time >= login_time)
        THEN 1 ELSE 0 END) AS uninstalled_users
    FROM Users
  `);

  const users = await pool.request().query(`
    SELECT
      u.shop_name,
      u.access_token AS user_token,
      u.login_time,
      u.uninstall_time,
      (
        SELECT TOP 1 t.access_token
        FROM Translates t
        WHERE t.shop_name = u.shop_name
          AND t.access_token IS NOT NULL
          AND LEN(LTRIM(RTRIM(t.access_token))) >= 32
        ORDER BY t.update_at DESC
      ) AS translate_token
    FROM Users u
    WHERE u.login_time IS NOT NULL
      AND (u.uninstall_time IS NULL OR u.login_time > u.uninstall_time)
    ORDER BY u.shop_name
  `);

  let migratedSet = new Set();
  if (tursoUrl && tursoToken) {
    const client = createClient({ url: tursoUrl, authToken: tursoToken });
    const migrated = await client.execute(
      "SELECT shop FROM ShopTranslationSettings WHERE migratedToTsf = 1",
    );
    migratedSet = new Set(migrated.rows.map((r) => normalizeShop(String(r.shop))));
    await client.close();
  } else {
    console.warn("未配置 Turso，无法读取 migratedToTsf 列表");
  }

  const activeRows = users.recordset.map((row) => {
    const shop = normalizeShop(row.shop_name);
    const userToken = String(row.user_token ?? "").trim();
    const translateToken = String(row.translate_token ?? "").trim();
    const token = isLikelyShopifyAccessToken(userToken)
      ? userToken
      : isLikelyShopifyAccessToken(translateToken)
        ? translateToken
        : null;
    const tokenFrom = isLikelyShopifyAccessToken(userToken)
      ? "Users"
      : isLikelyShopifyAccessToken(translateToken)
        ? "Translates"
        : null;
    return {
      shop,
      migrated: migratedSet.has(shop),
      token,
      tokenFrom,
    };
  });

  const notMigrated = activeRows.filter((r) => !r.migrated);
  const notMigratedWithToken = notMigrated.filter((r) => r.token);
  const notMigratedNoToken = notMigrated.filter((r) => !r.token);

  const toValidate = notMigratedWithToken.slice(0, VALIDATE_LIMIT);
  console.log(`正在向 Shopify 验证 ${toValidate.length} 个 token（并发 ${CONCURRENCY}）…\n`);

  const validated = await mapPool(toValidate, CONCURRENCY, async (row) => {
    const result = await validateToken(row.shop, row.token);
    return { ...row, ...result };
  });

  const valid = validated.filter((r) => r.ok);
  const invalid = validated.filter((r) => !r.ok);

  const t = totals.recordset[0];
  console.log("=== Spring Users 概览 ===");
  console.log(`Users 表总记录:        ${t.total_users}`);
  console.log(`曾登录过:              ${t.ever_logged_in}`);
  console.log(`当前活跃（未卸载）:    ${t.active_users}`);
  console.log(`已卸载:                ${t.uninstalled_users}`);
  console.log("");
  console.log("=== TSF 迁移（Turso migratedToTsf=1）===");
  console.log(`已迁移:                ${migratedSet.size}`);
  console.log(`活跃且未迁移:          ${notMigrated.length}`);
  console.log(`  └ 有 offline token:  ${notMigratedWithToken.length}`);
  console.log(`  └ 无 token:          ${notMigratedNoToken.length}`);
  console.log("");
  console.log("=== Token 有效性（Shopify shop 查询）===");
  console.log(`已验证:                ${validated.length}`);
  console.log(`  └ 有效:              ${valid.length}`);
  console.log(`  └ 无效/过期:         ${invalid.length}`);
  if (invalid.length > 0) {
    const byError = new Map();
    for (const row of invalid) {
      const key = String(row.error || "unknown")
        .replace(/\[.*?\]/g, "")
        .trim()
        .slice(0, 40);
      byError.set(key, (byError.get(key) || 0) + 1);
    }
    console.log("\n无效 token 原因分布:");
    for (const [reason, count] of [...byError.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${count.toString().padStart(4)}  ${reason}`);
    }
  }
  if (notMigratedWithToken.length > validated.length) {
    console.log(
      `  （另有 ${notMigratedWithToken.length - validated.length} 家有 token 未验证，可加 --validate-limit 提高）`,
    );
  }

  if (invalid.length > 0 && invalid.length <= 20) {
    console.log("\n无效 token 样例:");
    for (const row of invalid.slice(0, 20)) {
      console.log(`  ${row.shop}  [${row.tokenFrom}]  ${row.error}`);
    }
  } else if (invalid.length > 20) {
    console.log(`\n无效 token ${invalid.length} 家（仅列前 10）:`);
    for (const row of invalid.slice(0, 10)) {
      console.log(`  ${row.shop}  [${row.tokenFrom}]  ${row.error}`);
    }
  }
} finally {
  await pool.close();
}
