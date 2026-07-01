/**
 * 第二步：读取店铺 JSON 文件，逐店验证 Shopify offline token 是否有效。
 *
 * Token 探测口径（与 force-migrate.mjs 一致）：
 *   1. JSON 输入里的 token（Users 表快照）
 *   2. Spring Users.access_token（实时查，兜底）
 *   3. Java Translates.accessToken（GET /getTable，兜底）
 * 对候选逐个调 Shopify `{ shop { name } }`，首个有效者计入「有效」。
 *
 * 输入：scripts/out/shops-with-content.json（由第一步生成）
 * 输出：终端打印有效店铺列表 + 可复制的 shop.txt 格式
 *
 * 用法：
 *   node scripts/validate-shop-tokens.mjs
 *   node scripts/validate-shop-tokens.mjs --concurrency=10
 *   node scripts/validate-shop-tokens.mjs --input=scripts/out/custom.json
 */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import sql from "mssql";

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

const CONCURRENCY = Math.max(1, Number(args.concurrency) || 8);
const API_VERSION = env.SHOPIFY_API_VERSION || "2024-10";
const SERVER = (env.SERVER_URL || "").replace(/\/+$/, "");
const DEFAULT_INPUT = path.join(ROOT, "scripts", "out", "shops-with-content.json");
const INPUT_FILE = args.input ? path.resolve(ROOT, String(args.input)) : DEFAULT_INPUT;

// ── 工具 ─────────────────────────────────────────────────────────────────────

function normalizeShop(shop) {
  const trimmed = String(shop || "").trim().toLowerCase();
  if (!trimmed) return "";
  if (trimmed.includes(".")) return trimmed;
  return `${trimmed}.myshopify.com`;
}

function isLikelyShopifyAccessToken(token) {
  const t = String(token || "").trim();
  return (
    t.length >= 32 &&
    (t.startsWith("shpat_") || t.startsWith("shpua_") || t.startsWith("shpca_"))
  );
}

const asArr = (v) => (Array.isArray(v) ? v : v ? [v] : []);

async function jGet(apiPath) {
  const r = await fetch(`${SERVER}${apiPath}`);
  return r.json().catch(() => ({}));
}

// ── SQL Server ─────────────────────────────────────────────────────────────

function resolveSqlConfig() {
  const password = env.SPRING_DB_PASSWORD || env.SPRING_PASSWORD || "";
  const user =
    env.SPRING_DB_USER || env.SPRING_USERNAME || env.SPRING_DB_USERNAME || "";
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

let springSqlPool = null;

async function getSpringSqlPool() {
  const cfg = resolveSqlConfig();
  if (!cfg.server || !cfg.user || !cfg.password) return null;
  if (!springSqlPool) springSqlPool = await sql.connect(cfg);
  return springSqlPool;
}

/** 实时查 Spring Users 表获取最新 token（兜底） */
async function fetchSpringUsersToken(shop) {
  const pool = await getSpringSqlPool();
  if (!pool) return null;
  const normalized = normalizeShop(shop);
  const result = await pool
    .request()
    .input("shopName", sql.NVarChar, normalized)
    .query(`
      SELECT TOP 1 access_token
      FROM Users
      WHERE shop_name = @shopName
        AND access_token IS NOT NULL
        AND LEN(LTRIM(RTRIM(access_token))) >= 32
    `);
  const token = String(result.recordset[0]?.access_token ?? "").trim();
  return isLikelyShopifyAccessToken(token) ? token : null;
}

/** 实时查 Java Translates 表获取 token（兜底） */
async function fetchJavaTranslatesToken(shop) {
  try {
    const data = await jGet(
      `/getTable?shopName=${encodeURIComponent(normalizeShop(shop))}`,
    );
    const rows = asArr(data?.Translates);
    for (const row of rows) {
      const token = String(row?.accessToken ?? "").trim();
      if (isLikelyShopifyAccessToken(token)) return token;
    }
  } catch {
    // ignore
  }
  return null;
}

// ── 验证 ───────────────────────────────────────────────────────────────────

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
    if (r.ok && j?.data?.shop?.name) return { ok: true, token };
    const msg =
      j?.errors?.[0]?.message ||
      (r.status === 401 ? "401 Unauthorized" : `HTTP ${r.status}`);
    return { ok: false, error: msg };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** 多源尝试：JSON token → Spring Users 实时 → Java Translates 实时 */
async function validateWithFallback(row) {
  // 1. JSON 中的 token（Users 表快照）
  if (isLikelyShopifyAccessToken(row.token)) {
    const r = await validateToken(row.shop, row.token);
    if (r.ok) return { ...row, ...r, tokenSource: "json(users_snapshot)" };
  }

  // 2. Spring Users 实时查
  const springToken = await fetchSpringUsersToken(row.shop);
  if (springToken && springToken !== row.token) {
    const r = await validateToken(row.shop, springToken);
    if (r.ok) return { ...row, ...r, token: springToken, tokenSource: "spring_users(real-time)" };
  }

  // 3. Java Translates 实时查
  const javaToken = await fetchJavaTranslatesToken(row.shop);
  if (javaToken && javaToken !== row.token && javaToken !== springToken) {
    const r = await validateToken(row.shop, javaToken);
    if (r.ok) return { ...row, ...r, token: javaToken, tokenSource: "java_translates(real-time)" };
  }

  // 全部失败：用 JSON token 的第一次错误
  if (isLikelyShopifyAccessToken(row.token)) {
    const r = await validateToken(row.shop, row.token);
    return { ...row, ...r, tokenSource: "json(users_snapshot)" };
  }

  return { ...row, ok: false, error: "no valid token found (all sources exhausted)", tokenSource: null };
}

// ── 并发池 ─────────────────────────────────────────────────────────────────

async function mapPool(items, limit, fn) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );
  return results;
}

// ── 主流程 ─────────────────────────────────────────────────────────────────

async function main() {
  if (!existsSync(INPUT_FILE)) {
    console.error(`输入文件不存在: ${INPUT_FILE}`);
    console.error("输入文件不存在，请通过 --input= 指定店铺 JSON");
    process.exit(1);
  }

  /** @type {Array<{shop: string, token: string, glossaryCount: number, liquidCount: number, autoTranslate: boolean, loginTime: string}>} */
  const records = JSON.parse(readFileSync(INPUT_FILE, "utf8"));
  console.log(`读取 ${records.length} 条记录（${INPUT_FILE}）\n`);

  if (records.length === 0) {
    console.log("文件为空，退出。");
    return;
  }

  console.log(
    `正在向 Shopify 验证 ${records.length} 个 token（并发 ${CONCURRENCY}）…\n`,
  );

  const validated = await mapPool(records, CONCURRENCY, async (row) => {
    const result = await validateWithFallback(row);
    return result;
  });

  const valid = validated.filter((r) => r.ok);
  const invalid = validated.filter((r) => !r.ok);

  // 终端摘要
  console.log("=".repeat(60));
  console.log(`总数:       ${records.length}`);
  console.log(`有效 token: ${valid.length}`);
  console.log(`无效 token: ${invalid.length}`);
  console.log("=".repeat(60));

  // 无效原因分布
  if (invalid.length > 0) {
    const byError = new Map();
    for (const row of invalid) {
      const key = String(row.error || "unknown")
        .replace(/\[.*?\]/g, "")
        .trim()
        .slice(0, 50);
      byError.set(key, (byError.get(key) || 0) + 1);
    }
    console.log("\n无效 token 原因分布:");
    for (const [reason, count] of [...byError.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)) {
      console.log(`  ${String(count).padStart(4)}  ${reason}`);
    }
  }

  // 有效店铺列表
  if (valid.length > 0) {
    console.log("\n=== 有效店铺（可迁移）===");
    console.log(
      "shop_name".padEnd(38) +
        "glossary".padStart(10) +
        "liquid".padStart(8) +
        "  auto" +
        "  token_from",
    );
    console.log("-".repeat(78));
    for (const row of valid) {
      console.log(
        row.shop.padEnd(38) +
          String(row.glossaryCount ?? 0).padStart(10) +
          String(row.liquidCount ?? 0).padStart(8) +
          (row.autoTranslate ? "    ✓" : "     ") +
          `  ${row.tokenSource || "?"}`,
      );
    }

    console.log("\n--- 复制到 shop.txt ---");
    for (const row of valid) {
      console.log(row.shop);
    }
  } else {
    console.log("\n没有有效 token 的店铺。");
  }

  // 无效店铺列表（供排查）
  if (invalid.length > 0 && invalid.length <= 30) {
    console.log("\n=== 无效店铺 ===");
    for (const row of invalid) {
      console.log(`  ${row.shop.padEnd(38)} ${row.error}`);
    }
  } else if (invalid.length > 30) {
    console.log(`\n=== 无效店铺（共 ${invalid.length} 家，仅列前 15）===`);
    for (const row of invalid.slice(0, 15)) {
      console.log(`  ${row.shop.padEnd(38)} ${row.error}`);
    }
  }

  // 清理
  if (springSqlPool) await springSqlPool.close();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
