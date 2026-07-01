/**
 * 批量迁移脚本：把 shop.txt 中的店铺完整迁到 TSF。
 *
 * 两阶段迁移：
 *   A. 基础迁移（仅未迁移店）：token → Session → 语言配置 → 标记 migratedToTsf
 *   B. 三表迁移（全部已迁移店）：WidgetConfigurations / User_IP_Redirection / User_Page_Fly → TSF 对应表
 *
 * 用法：
 *   node scripts/force-migrate.mjs           # dry-run
 *   node scripts/force-migrate.mjs --apply   # 写入
 *   node scripts/force-migrate.mjs --shops=a.myshopify.com,b.myshopify.com
 */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import sql from "mssql";
import { PrismaClient } from "../../app/generated/prisma/index.js";
import { PrismaLibSQL } from "@prisma/adapter-libsql/web";

const ROOT = process.cwd();
const ENV_FILE = path.join(ROOT, ".env.prod");
const DEFAULT_SHOP_FILE = path.join(ROOT, "shop.txt");

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
const APPLY = Boolean(args.apply);
const CONCURRENCY = Math.max(1, Number(args.concurrency) || 3);
const SERVER = (env.SERVER_URL || "").replace(/\/+$/, "");
const SCOPES = env.SCOPES || "";
const API_VERSION = env.SHOPIFY_API_VERSION || "2024-10";

function normalizeShop(shop) { const t = String(shop || "").trim().toLowerCase(); if (!t) return ""; return t.includes(".") ? t : `${t}.myshopify.com`; }
function localeKey(l) { return String(l || "").trim().replace(/_/g, "-").toLowerCase(); }
function isLikelyToken(t) { const s = String(t || "").trim(); return s.length >= 32 && (s.startsWith("shpat_") || s.startsWith("shpua_") || s.startsWith("shpca_")); }
const asArr = (v) => (Array.isArray(v) ? v : v ? [v] : []);
function toCamelCase(s) { return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase()); }
function mapRow(row, cols) { const o = {}; for (const c of cols) { const v = row[c]; o[toCamelCase(c)] = v != null ? v : undefined; } return o; }

function loadShops() {
  if (args.shops) return String(args.shops).split(",").map((s) => s.trim()).filter(Boolean);
  const fp = args.file ? path.resolve(ROOT, String(args.file)) : DEFAULT_SHOP_FILE;
  if (!existsSync(fp)) { console.error(`文件不存在: ${fp}`); process.exit(1); }
  return readFileSync(fp, "utf8").split(/\r?\n/).map((s) => s.trim()).filter((s) => s && !s.startsWith("#"));
}

// ── SQL Server ─────────────────────────────────────────────────────────────

function resolveSqlConfig() {
  const pw = env.SPRING_DB_PASSWORD || env.SPRING_PASSWORD || "";
  const u = env.SPRING_DB_USER || env.SPRING_USERNAME || env.SPRING_DB_USERNAME || "";
  if (env.SPRING_DB_URL || env.SPRING_URL) {
    const raw = (env.SPRING_DB_URL || env.SPRING_URL).trim().replace(/^jdbc:sqlserver:\/\//i, "");
    const [hp, ...r] = raw.split(";"); const [s, p] = hp.split(":");
    const pm = Object.fromEntries(r.filter(Boolean).map((x) => x.split("=")).filter((kv) => kv.length >= 2).map(([k, ...v]) => [k.trim().toLowerCase(), v.join("=").trim()]));
    return { server: s.trim(), port: p ? Number(p) : 1433, database: pm.database || pm["initial catalog"] || "", user: u, password: pw, options: { encrypt: true, trustServerCertificate: false } };
  }
  return { server: env.SPRING_DB_SERVER || env.SPRING_DB_HOST || "", port: Number(env.SPRING_DB_PORT) || 1433, database: env.SPRING_DB_DATABASE || env.SPRING_DB_NAME || "bogdatech-prod", user: u, password: pw, options: { encrypt: true, trustServerCertificate: false } };
}

let springPool = null;
async function getSpringPool() { if (!springPool) springPool = await sql.connect(resolveSqlConfig()); return springPool; }

// ── Java API ───────────────────────────────────────────────────────────────
async function jPost(path, body) { const r = await fetch(`${SERVER}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }); return r.json().catch(() => ({})); }
async function jGet(path) { const r = await fetch(`${SERVER}${path}`); return r.json().catch(() => ({})); }

async function readAllJavaTranslateRows(shop) { const d = await jGet(`/getTable?shopName=${encodeURIComponent(normalizeShop(shop))}`); return asArr(d?.Translates); }
async function readJavaTranslateRows(shop, source) { const rows = await readAllJavaTranslateRows(shop); if (!source) return rows; const sk = localeKey(source); return rows.filter((r) => localeKey(String(r?.source ?? "")) === sk); }

// ── Token ──────────────────────────────────────────────────────────────────

async function fetchJavaUsersToken(shop) {
  const pool = await getSpringPool();
  const r = await pool.request().input("shopName", sql.NVarChar, normalizeShop(shop)).query(`SELECT TOP 1 access_token FROM Users WHERE shop_name = @shopName AND access_token IS NOT NULL AND LEN(LTRIM(RTRIM(access_token))) >= 32`);
  const t = String(r.recordset[0]?.access_token ?? "").trim();
  return isLikelyToken(t) ? t : null;
}

async function collectJavaTranslateTokens(shop) {
  const rows = await readAllJavaTranslateRows(shop);
  const sorted = [...rows].sort((a, b) => new Date(b?.updateAt ?? b?.update_at ?? 0).getTime() - new Date(a?.updateAt ?? a?.update_at ?? 0).getTime());
  const seen = new Set(), res = [];
  for (const row of sorted) { const t = String(row?.accessToken ?? "").trim(); if (!isLikelyToken(t) || seen.has(t)) continue; seen.add(t); res.push({ token: t, from: `java:translates:${row?.source ?? "?"}` }); }
  return res;
}

async function probeShopifyToken(shop, token) {
  const r = await fetch(`https://${normalizeShop(shop)}/admin/api/${API_VERSION}/graphql.json`, { method: "POST", headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token }, body: JSON.stringify({ query: `{ shop { name } }` }), signal: AbortSignal.timeout(15000) });
  const text = await r.text(); let j = {};
  try { j = JSON.parse(text); } catch { throw new Error(`HTTP ${r.status}: non-JSON`); }
  if (!r.ok || j?.errors) { const errs = j?.errors; const msg = Array.isArray(errs) ? errs.map((e) => e?.message || String(e)).join("; ") : (typeof errs === "string" ? errs : `HTTP ${r.status}`); throw new Error(msg); }
  if (!j?.data?.shop?.name) throw new Error("empty shop");
}

function formatShopifyError(json, code) { const e = json?.errors; if (Array.isArray(e)) return e.map((x) => x?.message || String(x)).join("; "); if (typeof e === "string" && e.trim()) return e.trim(); if (code === 401) return "401 Unauthorized"; if (code && code >= 400) return `HTTP ${code}`; return "graphql error"; }

async function resolveShopToken(shop) {
  const candidates = [];
  const ut = await fetchJavaUsersToken(shop); if (ut) candidates.push({ token: ut, from: "java:users" });
  candidates.push(...(await collectJavaTranslateTokens(shop)));
  const sess = await prisma.session.findFirst({ where: { shop, isOnline: false } });
  const st = String(sess?.accessToken ?? "").trim(); if (isLikelyToken(st)) candidates.push({ token: st, from: "tsf:session" });
  const seen = new Set(); let lastErr = "";
  for (const { token, from } of candidates) { if (seen.has(token)) continue; seen.add(token); try { await probeShopifyToken(shop, token); return { token, tokenFrom: from }; } catch (err) { lastErr = err instanceof Error ? err.message : String(err); } }
  return lastErr ? { token: null, tokenFrom: null, lastError: lastErr } : { token: null, tokenFrom: null };
}

// ── 基础迁移（阶段 A）──────────────────────────────────────────────────────

async function fetchShopLocaleRows(shop, token) {
  const r = await fetch(`https://${normalizeShop(shop)}/admin/api/${API_VERSION}/graphql.json`, { method: "POST", headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token }, body: JSON.stringify({ query: `{ shopLocales { locale primary published } }` }) });
  const text = await r.text(); let j = {};
  try { j = JSON.parse(text); } catch { throw new Error(`HTTP ${r.status}: non-JSON`); }
  if (!r.ok || j?.errors) throw new Error(formatShopifyError(j, r.status));
  return { primaryLocale: (j?.data?.shopLocales ?? []).find((x) => x.primary)?.locale || "en", rows: j?.data?.shopLocales ?? [] };
}

function mergeTargets(primary, shopifyRows, javaRows) {
  const m = new Map(); const pk = localeKey(primary);
  for (const r of shopifyRows) { const l = String(r?.locale ?? "").trim(); if (!l || r?.primary || localeKey(l) === pk) continue; m.set(localeKey(l), l); }
  for (const r of javaRows) { const t = String(r?.target ?? "").trim(); if (!t || localeKey(t) === pk) continue; if (!m.has(localeKey(t))) m.set(localeKey(t), t); }
  return [...m.values()].sort();
}

function buildAutoMap(javaRows) { const m = new Map(); for (const r of javaRows) { if (r?.target) m.set(String(r.target), Boolean(r?.autoTranslate)); } return m; }
function autoFor(locale, autoMap) { for (const [l, v] of autoMap) { if (localeKey(l) === localeKey(locale)) return v; } return false; }

async function writeTargetLocales(shop, targets, autoMap) {
  for (const loc of targets) { await prisma.shopTargetLocale.upsert({ where: { shop_locale: { shop, locale: loc } }, create: { shop, locale: loc, autoTranslate: autoFor(loc, autoMap) }, update: { autoTranslate: autoFor(loc, autoMap) } }); }
  const exist = await prisma.shopTargetLocale.findMany({ where: { shop } });
  const keep = new Set(targets.map(localeKey));
  for (const r of exist) { if (!keep.has(localeKey(r.locale))) await prisma.shopTargetLocale.delete({ where: { shop_locale: { shop, locale: r.locale } } }); }
}

/** 阶段 A：首次迁移 token + 语言 → 标记 migratedToTsf */
async function migrateBase(shop) {
  // 1) token
  const { token, tokenFrom, lastError } = await resolveShopToken(shop);
  if (!token) return { ok: false, reason: `no valid token${lastError ? ` (${lastError})` : ""}` };

  // 2) locales
  let primary = "en", shopifyRows = [];
  try { ({ primaryLocale: primary, rows: shopifyRows } = await fetchShopLocaleRows(shop, token)); }
  catch (err) { return { ok: false, reason: `invalid token: ${err.message}` }; }

  // 3) Java 旧语言配置
  const javaRows = await readJavaTranslateRows(shop, primary);
  const autoMap = buildAutoMap(javaRows);
  const targets = mergeTargets(primary, shopifyRows, javaRows);
  const anyAuto = [...autoMap.values()].some(Boolean);

  const summary = `token=${tokenFrom} targets=${targets.length} auto=${anyAuto}`;
  if (!APPLY) return { ok: true, summary, migrated: false };

  await prisma.session.upsert({ where: { id: `offline_${shop}` }, create: { id: `offline_${shop}`, shop, state: "", isOnline: false, accessToken: token, scope: SCOPES || null }, update: { accessToken: token, shop, isOnline: false, ...(SCOPES ? { scope: SCOPES } : {}) } });
  await prisma.$transaction([
    prisma.shopTranslationSettings.upsert({ where: { shop }, create: { shop, primaryLocale: primary, targets, autoTranslate: anyAuto, migratedToTsf: true, migratedAt: new Date() }, update: { primaryLocale: primary, targets, autoTranslate: anyAuto, migratedToTsf: true, migratedAt: new Date() } }),
  ]);
  await writeTargetLocales(shop, targets, autoMap);
  await jPost(`/translate/markShopMigratedToTsf?shopName=${encodeURIComponent(shop)}`);
  return { ok: true, summary, migrated: true };
}

// ── 三表迁移（阶段 B）──────────────────────────────────────────────────────

async function getColumns(pool, table) {
  const { recordset } = await pool.request().query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${table}' ORDER BY ORDINAL_POSITION`);
  return recordset.map((r) => r.COLUMN_NAME);
}

async function readSpringTable(pool, table, shop) {
  try {
    const cols = await getColumns(pool, table);
    if (!cols.includes("shop_name")) { console.warn(`  ⚠ ${table} 无 shop_name`); return []; }
    const { recordset } = await pool.request().input("shop", sql.NVarChar, shop).query(`SELECT ${cols.join(", ")} FROM ${table} WHERE shop_name = @shop`);
    return recordset.map((r) => mapRow(r, cols));
  } catch (err) { console.warn(`  ⚠ ${table}: ${err.message || err}`); return []; }
}

const TABLE_MIGRATIONS = [
  { spring: "WidgetConfigurations", tsf: "switcherConfiguration", label: "Switcher", exclude: ["id", "shopName"] },
  { spring: "User_IP_Redirection",  tsf: "ipRedirection",         label: "IpRedir", exclude: ["shopName"] },
  { spring: "User_Page_Fly",        tsf: "pageFlyTranslation",    label: "PageFly", exclude: ["shopName"] },
];

async function migrateTables(shop) {
  const counts = {};
  for (const { spring, tsf, label, exclude } of TABLE_MIGRATIONS) {
    let rows = await readSpringTable(pool, spring, shop);
    if (exclude) rows = rows.map((r) => { const c = { ...r }; for (const k of exclude) delete c[k]; return c; });
    counts[label] = rows.length;
    if (APPLY && rows.length > 0) {
      if (tsf === "switcherConfiguration") {
        for (const row of rows) { await prisma.switcherConfiguration.upsert({ where: { shop }, create: { shop, ...row }, update: { ...row } }); }
      } else {
        await prisma[tsf].deleteMany({ where: { shop } });
        await prisma[tsf].createMany({ data: rows.map((r) => ({ shop, ...r })) });
      }
    }
  }
  return counts;
}

// ── 主流程 ─────────────────────────────────────────────────────────────────

let pool, prisma;

async function main() {
  const rawShops = loadShops();
  if (!rawShops.length) { console.error("shop.txt 为空"); process.exit(1); }
  const shops = [...new Set(rawShops.map(normalizeShop))].filter(Boolean);
  console.log(`模式：${APPLY ? "APPLY(写入)" : "DRY-RUN(只读)"}  shops=${shops.length} 并发=${CONCURRENCY}\n`);

  if (!SERVER) { console.error("缺少 SERVER_URL"); process.exit(1); }
  const TURSO_URL = (env.TURSO_DATABASE_URL || env.TURSO_PROD_DATABASE_URL || "").trim();
  const TURSO_TOKEN = (env.TURSO_AUTH_TOKEN || env.TURSO_PROD_AUTH_TOKEN || "").trim();
  if (!TURSO_URL?.startsWith("libsql://") || !TURSO_TOKEN) { console.error("缺少 Turso 凭证"); process.exit(1); }
  prisma = new PrismaClient({ adapter: new PrismaLibSQL({ url: TURSO_URL, authToken: TURSO_TOKEN }) });
  pool = await sql.connect(resolveSqlConfig());

  try {
    const migratedRows = await prisma.shopTranslationSettings.findMany({ where: { shop: { in: shops }, migratedToTsf: true }, select: { shop: true } });
    const migratedSet = new Set(migratedRows.map((r) => r.shop));
    const notMigrated = shops.filter((s) => !migratedSet.has(s));

    console.log(`已迁移: ${migratedSet.size}  待迁移: ${notMigrated.length}\n`);

    const results = [];

    // ── 逐店处理 ──
    for (let i = 0; i < shops.length; i += CONCURRENCY) {
      const batch = shops.slice(i, i + CONCURRENCY);
      const tasks = batch.map(async (shop) => {
        const isNew = !migratedSet.has(shop);
        let baseOk = true, baseSummary = "";

        // 阶段 A：未迁移店先做基础迁移
        if (isNew) {
          const r = await migrateBase(shop);
          if (!r.ok) {
            results.push({ shop, status: `SKIP(${r.reason})` });
            console.log(`✗ ${shop}: SKIP(${r.reason})`);
            return;
          }
          baseSummary = r.summary;
          if (r.migrated) migratedSet.add(shop);
          console.log(`✓ ${shop}: ${APPLY ? "BASE_APPLIED" : "BASE_DRY-RUN"} (${baseSummary})`);
        }

        // 阶段 B：所有已迁移店做三表迁移
        const counts = await migrateTables(shop);
        const tableLine = TABLE_MIGRATIONS.map(({ label }) => `${label}=${counts[label]}`).join(" ");

        if (isNew) {
          console.log(`  └─ ${APPLY ? "TABLES_APPLIED" : "TABLES_DRY-RUN"} (${tableLine})`);
        } else {
          console.log(`✓ ${shop}: ${APPLY ? "TABLES_APPLIED" : "TABLES_DRY-RUN"} (${tableLine})`);
        }
        results.push({ shop, status: `${isNew ? "FULL" : "TABLES"}_${APPLY ? "APPLIED" : "DRY_RUN"} (${isNew ? baseSummary + " | " : ""}${tableLine})` });
      });
      await Promise.allSettled(tasks);
    }

    // 汇总
    console.log(`\n完成：共 ${shops.length} 家`);
  } finally {
    await pool.close();
    await prisma.$disconnect();
  }
}

main().catch(async (err) => { console.error(err instanceof Error ? err.message : err); if (pool) await pool.close(); if (prisma) await prisma.$disconnect(); process.exit(1); });
