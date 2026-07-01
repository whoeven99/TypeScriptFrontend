/**
 * 扫描 Spring Users 表，找出在以下三表中任一个有数据且 token 有效的店铺：
 *   - WidgetConfigurations
 *   - User_IP_Redirection
 *   - User_Page_Fly
 *
 * 输出：scripts/out/widget-pagefly-redirect-shops.txt（纯 shop 列表，每行一个）
 *
 * 用法：
 *   node scripts/find-pagefly-weglot-shops.mjs
 *   node scripts/find-pagefly-weglot-shops.mjs --concurrency=10
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import sql from "mssql";

const ROOT = process.cwd();
const ENV_FILE = path.join(ROOT, ".env.prod");
const OUT_DIR = path.join(ROOT, "scripts", "out");
const OUT_FILE = path.join(OUT_DIR, "widget-pagefly-redirect-shops.txt");

// ── 工具 ───────────────────────────────────────────────────────────────────

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
    ) { value = value.slice(1, -1); }
    result[line.slice(0, idx).trim()] = value;
  }
  return result;
}

const env = { ...loadDotEnv(ENV_FILE), ...process.env };
const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, "").split("=");
  return [k, v ?? true];
}));
const CONCURRENCY = Math.max(1, Number(args.concurrency) || 8);
const API_VERSION = env.SHOPIFY_API_VERSION || "2024-10";

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

// ── SQL Server ─────────────────────────────────────────────────────────────

function resolveSqlConfig() {
  const password = env.SPRING_DB_PASSWORD || env.SPRING_PASSWORD || "";
  const user = env.SPRING_DB_USER || env.SPRING_USERNAME || env.SPRING_DB_USERNAME || "";
  if (env.SPRING_DB_URL || env.SPRING_URL) {
    const raw = (env.SPRING_DB_URL || env.SPRING_URL).trim();
    const withoutPrefix = raw.replace(/^jdbc:sqlserver:\/\//i, "");
    const [hostPart, ...rest] = withoutPrefix.split(";");
    const [server, portStr] = hostPart.split(":");
    const params = Object.fromEntries(rest.filter(Boolean).map((p) => p.split("=")).filter((kv) => kv.length >= 2).map(([k, ...v]) => [k.trim().toLowerCase(), v.join("=").trim()]));
    return { server: server.trim(), port: portStr ? Number(portStr) : 1433, database: params.database || params["initial catalog"] || "", user, password, options: { encrypt: true, trustServerCertificate: false } };
  }
  return { server: env.SPRING_DB_SERVER || env.SPRING_DB_HOST || "", port: Number(env.SPRING_DB_PORT) || 1433, database: env.SPRING_DB_DATABASE || env.SPRING_DB_NAME || "bogdatech-prod", user, password, options: { encrypt: true, trustServerCertificate: false } };
}

// ── Token 验证 ─────────────────────────────────────────────────────────────

async function validateToken(shop, token) {
  try {
    const r = await fetch(`https://${normalizeShop(shop)}/admin/api/${API_VERSION}/graphql.json`, {
      method: "POST", headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
      body: JSON.stringify({ query: `{ shop { name } }` }), signal: AbortSignal.timeout(15000),
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j?.data?.shop?.name) return { ok: true };
    const msg = j?.errors?.[0]?.message || (r.status === 401 ? "401 Unauthorized" : `HTTP ${r.status}`);
    return { ok: false, error: msg };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function mapPool(items, limit, fn) {
  const results = [];
  let i = 0;
  async function worker() { while (i < items.length) { const idx = i++; results[idx] = await fn(items[idx], idx); } }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

async function getShopsFromTable(pool, tableName) {
  try {
    const { recordset } = await pool.request().query(`SELECT DISTINCT shop_name FROM ${tableName} WHERE shop_name IS NOT NULL`);
    return recordset.map((r) => normalizeShop(String(r.shop_name ?? ""))).filter(Boolean);
  } catch (err) {
    console.warn(`  ⚠ ${tableName}: ${err.message || err}`);
    return [];
  }
}

// ── 主流程 ─────────────────────────────────────────────────────────────────

async function main() {
  const pool = await sql.connect(resolveSqlConfig());
  try {
    // 1. 扫描三表
    const TABLES = ["WidgetConfigurations", "User_IP_Redirection", "User_Page_Fly"];
    const tableShops = new Map();
    const allShops = new Set();

    console.log("扫描目标表:");
    for (const t of TABLES) {
      console.log(`  ${t} …`);
      const shops = await getShopsFromTable(pool, t);
      console.log(`    → ${shops.length} 家`);
      tableShops.set(t, new Set(shops));
      for (const s of shops) allShops.add(s);
    }
    console.log(`\n合计（去重）: ${allShops.size} 家`);

    if (allShops.size === 0) { console.log("三表均无数据。"); return; }

    // 2. 从 Users 查 token
    console.log("\n从 Users 匹配 token …");
    const shopList = [...allShops];
    const userMap = new Map();
    for (let i = 0; i < shopList.length; i += 500) {
      const batch = shopList.slice(i, i + 500);
      const { recordset } = await pool.request().query(`
        SELECT shop_name, access_token, login_time FROM Users
        WHERE shop_name IN (${batch.map((s) => `'${s}'`).join(",")})
          AND login_time IS NOT NULL AND (uninstall_time IS NULL OR login_time > uninstall_time)
      `);
      for (const r of recordset) userMap.set(normalizeShop(r.shop_name), { token: String(r.access_token ?? "").trim(), loginTime: r.login_time });
    }
    console.log(`Users 匹配: ${userMap.size} 家\n`);

    // 3. 过滤有 token 的
    const candidates = [];
    for (const shop of allShops) {
      const u = userMap.get(shop);
      if (u && isLikelyShopifyAccessToken(u.token)) {
        candidates.push({
          shop, token: u.token,
          hasWidget: tableShops.get("WidgetConfigurations")?.has(shop) ?? false,
          hasIp: tableShops.get("User_IP_Redirection")?.has(shop) ?? false,
          hasPageFly: tableShops.get("User_Page_Fly")?.has(shop) ?? false,
          loginTime: u.loginTime,
        });
      }
    }
    console.log(`有 token: ${candidates.length}`);

    if (!candidates.length) { console.log("无候选店铺。"); return; }

    // 4. 验证 token
    console.log(`\n验证 token（并发 ${CONCURRENCY}）…\n`);
    const validated = await mapPool(candidates, CONCURRENCY, async (r) => {
      const res = await validateToken(r.shop, r.token);
      return { ...r, ...res };
    });
    const valid = validated.filter((r) => r.ok);
    const invalid = validated.filter((r) => !r.ok);

    // 5. 输出
    mkdirSync(OUT_DIR, { recursive: true });
    const names = valid.map((r) => r.shop).sort();
    writeFileSync(OUT_FILE, names.join("\n") + "\n", "utf8");

    console.log("=".repeat(60));
    console.log(`三表店铺: ${allShops.size}  有 token: ${candidates.length}  有效: ${valid.length}  → ${OUT_FILE}`);
    console.log("=".repeat(60));

    if (valid.length > 0) {
      console.log("\n=== 有效店铺 ===");
      console.log("shop_name".padEnd(38) + "Widget".padStart(8) + "IP_Redir".padStart(9) + "PageFly".padStart(8));
      console.log("-".repeat(65));
      for (const r of valid) {
        console.log(r.shop.padEnd(38) + (r.hasWidget ? "   ✓".padStart(8) : "".padStart(8)) + (r.hasIp ? "   ✓".padStart(9) : "".padStart(9)) + (r.hasPageFly ? "   ✓".padStart(8) : "".padStart(8)));
      }
    }

    if (invalid.length > 0) {
      const byErr = new Map();
      for (const r of invalid) byErr.set(String(r.error).slice(0, 50), (byErr.get(String(r.error).slice(0, 50)) || 0) + 1);
      console.log("\n无效 token:");
      for (const [e, c] of [...byErr].sort((a, b) => b[1] - a[1])) console.log(`  ${String(c).padStart(4)}  ${e}`);
    }
  } finally {
    await pool.close();
  }
}

main().catch((err) => { console.error(err instanceof Error ? err.message : err); process.exit(1); });
