/**
 * 按 worker 自动翻译分槽 hash，列出「下一轮整点扫描会尝试建任务」的 TSF 店。
 *
 * 与 worker/src/services/autoTranslate.ts + autoScanSchedule.ts 口径一致：
 *   - 数据源：Turso（migratedToTsf=1 + ShopTargetLocale.autoTranslate=1）
 *   - 分槽：shopSlotIndex(shop) === currentSlotIndex(下一轮扫描时刻)
 *   - 可选 --check-cooldown：Cosmos 查最近 TsFrontend-Auto 批次，排除仍在冷却的店
 *   - 可选 --require-token：要求 Session 有 offline accessToken
 *   - 可选 --billing=legacy|tsf|any：按 ShopBillingBinding 过滤（计费灰度用）
 *
 * 用法（TypeScriptFrontend 根目录，凭据 .env.prod）：
 *   npm run migration:next-auto-slot
 *   node scripts/next-auto-slot-shops.mjs --check-cooldown --billing=legacy
 *   node scripts/next-auto-slot-shops.mjs --scan-at=2026-07-07T08:00:00.000Z   # 指定某次扫描时刻试算
 *   node scripts/next-auto-slot-shops.mjs --slots=14,15,16   # 下午 2/3/4 点槽位（slotsPerDay=24）
 *
 * 典型灰度：13:00 跑本脚本（含 14–16 槽）→ 复制输出到 shop.txt → migration:billing --apply → 重启 worker → 14:00 起看自动任务与额度。
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client/http";
import { CosmosClient } from "@azure/cosmos";
import {
  currentSlotIndex,
  describeSlotHour,
  formatInTz,
  getAutoTranslateScheduleMinute,
  getAutoTranslateScheduleTimezone,
  getAutoTranslateShardCooldownMs,
  getAutoTranslateShopCooldownMs,
  getAutoTranslateSlotsPerDay,
  isAutoTranslateShardingEnabled,
  isShopAutoCooldownElapsed,
  resolveNextClockAlignedScanAt,
  resolveScanAtForSlotIndex,
  shopSlotIndex,
} from "./lib/autoScanSchedule.mjs";

const ROOT = process.cwd();
const SHOP_FILE = path.join(ROOT, "shop.txt");
const TSF_AUTO_TASK_SOURCE = "TsFrontend-Auto";

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

function parseArgs(argv) {
  return Object.fromEntries(
    argv.map((item) => {
      const [k, v] = item.replace(/^--/, "").split("=");
      return [k, v ?? true];
    }),
  );
}

/** 解析 --slots=14,15,16 或 --hours=14-16；无效项忽略。 */
function parseSlotList(raw, slotsPerDay) {
  const max = Math.max(1, Math.min(1440, Math.floor(slotsPerDay)));
  const slots = new Set();
  for (const part of String(raw || "")
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean)) {
    if (part.includes("-")) {
      const [a, b] = part.split("-").map((s) => Number(s.trim()));
      if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      for (let i = lo; i <= hi; i++) {
        if (i >= 0 && i < max) slots.add(i);
      }
      continue;
    }
    const n = Number(part);
    if (Number.isFinite(n) && n >= 0 && n < max) slots.add(Math.floor(n));
  }
  return [...slots].sort((a, b) => a - b);
}

function normalizeShop(shop) {
  let value = String(shop || "").trim().toLowerCase();
  if (!value) return "";
  value = value.replace(/^https?:\/\//, "").split("/")[0].trim();
  if (!value.includes(".")) return `${value}.myshopify.com`;
  return value;
}

function loadExcludedShops() {
  if (!existsSync(SHOP_FILE)) return new Set();
  const excluded = new Set();
  const re = /([a-z0-9][a-z0-9-]*\.myshopify\.com)/gi;
  for (const rawLine of readFileSync(SHOP_FILE, "utf8").split(/\r?\n/)) {
    for (const m of rawLine.matchAll(re)) excluded.add(normalizeShop(m[1]));
  }
  return excluded;
}

function resolveTursoConfig(env, target) {
  const isProd = target === "prod";
  const url = isProd
    ? env.TURSO_PROD_DATABASE_URL || env.TURSO_DATABASE_URL
    : env.TURSO_TEST_DATABASE_URL || env.TURSO_DATABASE_URL;
  const authToken = isProd
    ? env.TURSO_PROD_AUTH_TOKEN || env.TURSO_AUTH_TOKEN
    : env.TURSO_TEST_AUTH_TOKEN || env.TURSO_AUTH_TOKEN;
  if (!url?.startsWith("libsql://") || !authToken) {
    throw new Error("缺少 Turso URL / AUTH_TOKEN（见 .env.prod）");
  }
  return { url, authToken };
}

function resolveCosmosConfig(env) {
  const endpoint = (env.COSMOS_ENDPOINT || env.COSMOS_ENDPOINT_V4 || "").trim();
  const key = (env.COSMOS_KEY || env.COSMOS_KEY_V4 || "").trim();
  const db = (env.COSMOS_TRANSLATION_DATABASE_ID || "translation").trim();
  const containerId = (
    env.COSMOS_TRANSLATION_V4_JOBS_CONTAINER || "translation_v4_jobs"
  ).trim();
  if (!endpoint || !key) return null;
  return { endpoint, key, db, containerId };
}

function pad(str, len) {
  const s = String(str ?? "");
  return s.length >= len ? s : s + " ".repeat(len - s.length);
}

async function runPool(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function runner() {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => runner()),
  );
  return results;
}

/** 与 worker tsfDb.listAutoTranslateShops 相同 SQL 口径。 */
async function listAutoTranslateShopsFromTurso(turso) {
  const rs = await turso.execute(`
    SELECT s.shop AS shop, s.primaryLocale AS primaryLocale, t.locale AS target
    FROM ShopTranslationSettings s
    JOIN ShopTargetLocale t ON t.shop = s.shop
    WHERE s.migratedToTsf = 1 AND t.autoTranslate = 1 AND t.status = 1
  `);
  const byShop = new Map();
  for (const r of rs.rows) {
    const shop = normalizeShop(String(r.shop));
    const primaryLocale = String(r.primaryLocale ?? "");
    const target = String(r.target ?? "");
    const entry = byShop.get(shop) ?? { shop, primaryLocale, targets: [] };
    entry.targets.push(target);
    byShop.set(shop, entry);
  }
  return [...byShop.values()];
}

async function loadBindings(turso, shops) {
  if (!shops.length) return new Map();
  const map = new Map();
  const chunk = 200;
  for (let i = 0; i < shops.length; i += chunk) {
    const slice = shops.slice(i, i + chunk);
    const placeholders = slice.map(() => "?").join(",");
    const rs = await turso.execute({
      sql: `SELECT shop, billingSystem FROM ShopBillingBinding WHERE shop IN (${placeholders})`,
      args: slice,
    });
    for (const r of rs.rows) {
      map.set(normalizeShop(String(r.shop)), String(r.billingSystem));
    }
  }
  return map;
}

async function loadOfflineTokens(turso, shops) {
  const set = new Set();
  const chunk = 200;
  for (let i = 0; i < shops.length; i += chunk) {
    const slice = shops.slice(i, i + chunk);
    const placeholders = slice.map(() => "?").join(",");
    const rs = await turso.execute({
      sql: `SELECT DISTINCT shop FROM Session
            WHERE shop IN (${placeholders}) AND isOnline = 0 AND accessToken IS NOT NULL AND length(accessToken) >= 32`,
      args: slice,
    });
    for (const r of rs.rows) set.add(normalizeShop(String(r.shop)));
  }
  return set;
}

async function enrichWithCooldown(candidates, cosmos, cooldownMs, scanAtMs, concurrency) {
  const client = new CosmosClient({ endpoint: cosmos.endpoint, key: cosmos.key });
  const container = client.database(cosmos.db).container(cosmos.containerId);

  return runPool(candidates, concurrency, async (row) => {
    try {
      const { resources } = await container.items
        .query(
          {
            query:
              "SELECT TOP 1 c.createdAt FROM c WHERE c.shopName = @shopName AND c.taskSource = @src AND c.status != @failed ORDER BY c.createdAt DESC",
            parameters: [
              { name: "@shopName", value: row.shop },
              { name: "@src", value: TSF_AUTO_TASK_SOURCE },
              { name: "@failed", value: "FAILED" },
            ],
          },
          { partitionKey: row.shop },
        )
        .fetchAll();
      const iso = resources[0]?.createdAt?.trim();
      const lastAt = iso ? new Date(iso) : null;
      const validLast = lastAt && !Number.isNaN(lastAt.getTime()) ? lastAt : null;
      const atMs = row.scanAtMs ?? scanAtMs;
      const ok = isShopAutoCooldownElapsed(validLast, cooldownMs, atMs);
      return { ...row, lastAutoAt: validLast, cooldownOk: ok };
    } catch {
      return { ...row, lastAutoAt: null, cooldownOk: true };
    }
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const target = String(args.target || "prod").toLowerCase();
  if (!["prod", "test"].includes(target)) {
    throw new Error("--target 仅支持 prod 或 test");
  }

  const envFileArg = typeof args["env-file"] === "string" ? args["env-file"] : "";
  const envFile = envFileArg
    ? path.isAbsolute(envFileArg)
      ? envFileArg
      : path.join(ROOT, envFileArg)
    : path.join(ROOT, ".env.prod");
  const env = {
    ...loadDotEnv(path.join(ROOT, ".env")),
    ...loadDotEnv(envFile),
    ...process.env,
  };

  // schedule 辅助函数默认读 process.env；把 .env.prod 里的 AUTO_TRANSLATE_* 同步进去
  for (const key of [
    "AUTO_TRANSLATE_INTERVAL_MS",
    "AUTO_TRANSLATE_SHARDING",
    "AUTO_TRANSLATE_SLOTS_PER_DAY",
    "AUTO_TRANSLATE_SHOP_COOLDOWN_MS",
    "AUTO_TRANSLATE_SHARD_COOLDOWN_MS",
    "AUTO_TRANSLATE_SCHEDULE_TZ",
    "AUTO_TRANSLATE_SCHEDULE_MINUTE",
  ]) {
    if (env[key] != null && process.env[key] == null) {
      process.env[key] = String(env[key]);
    }
  }

  const checkCooldown = Boolean(args["check-cooldown"]);
  const requireToken = args["require-token"] !== false && args["require-token"] !== "false";
  const excludeShopTxt = args["include-shop-txt"] !== true && args["include-shop-txt"] !== "true";
  const billingFilter = String(args.billing || "any").toLowerCase();
  const concurrency = Math.max(1, Number(args.concurrency) || 8);

  const tz = getAutoTranslateScheduleTimezone(env);
  const slotsPerDay = getAutoTranslateSlotsPerDay(env);
  const sharding = isAutoTranslateShardingEnabled(env);
  const cooldownMs = sharding
    ? getAutoTranslateShardCooldownMs(env)
    : getAutoTranslateShopCooldownMs(env);

  const scheduleMinute = getAutoTranslateScheduleMinute(env);
  const now = new Date();
  const explicitScanAt =
    typeof args["scan-at"] === "string" && args["scan-at"].trim()
      ? new Date(args["scan-at"].trim())
      : null;
  if (explicitScanAt && Number.isNaN(explicitScanAt.getTime())) {
    throw new Error("--scan-at 无效");
  }

  const slotsArg =
    typeof args.slots === "string"
      ? args.slots
      : typeof args.hours === "string"
        ? args.hours
        : "";
  const targetSlots = sharding
    ? slotsArg
      ? parseSlotList(slotsArg, slotsPerDay)
      : [currentSlotIndex(
          explicitScanAt ?? resolveNextClockAlignedScanAt(now, undefined, tz, scheduleMinute),
          slotsPerDay,
          tz,
        )]
    : null;
  if (sharding && slotsArg && !targetSlots.length) {
    throw new Error(`--slots/--hours 无有效槽位（0..${slotsPerDay - 1}）`);
  }

  const nextScanAt =
    explicitScanAt ??
    (sharding && targetSlots?.length
      ? resolveScanAtForSlotIndex(targetSlots[0], now, slotsPerDay, tz, scheduleMinute)
      : resolveNextClockAlignedScanAt(now, undefined, tz, scheduleMinute));

  const turso = createClient(resolveTursoConfig(env, target));
  const excluded = excludeShopTxt ? loadExcludedShops() : new Set();

  try {
    const allShops = await listAutoTranslateShopsFromTurso(turso);
    const shopNames = allShops.map((s) => s.shop);
    const [bindings, tokenShops] = await Promise.all([
      loadBindings(turso, shopNames),
      requireToken ? loadOfflineTokens(turso, shopNames) : Promise.resolve(null),
    ]);

    let candidates = allShops.filter((row) => {
      if (excluded.has(row.shop)) return false;
      if (!row.primaryLocale?.trim() || !row.targets?.length) return false;
      if (sharding && !targetSlots.includes(shopSlotIndex(row.shop, slotsPerDay))) {
        return false;
      }
      if (requireToken && !tokenShops.has(row.shop)) return false;

      const billing = bindings.get(row.shop) ?? null;
      if (billingFilter === "legacy") {
        return billing === "legacy" || billing === null;
      }
      if (billingFilter === "tsf") {
        return billing === "tsf";
      }
      return true;
    });

    if (checkCooldown) {
      const cosmos = resolveCosmosConfig(env);
      if (!cosmos) {
        throw new Error("--check-cooldown 需要 COSMOS_ENDPOINT(_V4) 与 COSMOS_KEY(_V4)");
      }
      const withScanAt = candidates.map((row) => {
        const slot = shopSlotIndex(row.shop, slotsPerDay);
        const scanAt = sharding
          ? resolveScanAtForSlotIndex(slot, now, slotsPerDay, tz, scheduleMinute)
          : nextScanAt;
        return { ...row, scanAtMs: scanAt.getTime() };
      });
      const enriched = await enrichWithCooldown(
        withScanAt,
        cosmos,
        cooldownMs,
        null,
        concurrency,
      );
      candidates = enriched
        .filter((r) => r.cooldownOk)
        .map(({ scanAtMs: _scanAtMs, cooldownOk: _ok, ...row }) => row);
    }

    candidates.sort((a, b) => a.shop.localeCompare(b.shop));

    const msUntil = nextScanAt.getTime() - now.getTime();
    const minutesUntil = Math.max(0, Math.round(msUntil / 60_000));

    const title =
      sharding && targetSlots.length > 1
        ? "=== auto 扫描 · 多槽位店铺 ==="
        : "=== 下一轮 auto 扫描 · 本槽位店铺 ===";
    console.log(title);
    console.log(`Turso:           ${new URL(resolveTursoConfig(env, target).url).host} (${target})`);
    console.log(`调度时区:        ${tz}`);
    if (sharding && targetSlots.length > 1) {
      const slotDesc = targetSlots
        .map((s) => `${s}（${describeSlotHour(s, slotsPerDay)}）`)
        .join("、");
      console.log(`目标槽位:        ${slotDesc}`);
    } else {
      console.log(`下一轮扫描:      ${formatInTz(nextScanAt, tz)} (${nextScanAt.toISOString()})`);
      console.log(`距现在:          约 ${minutesUntil} 分钟`);
    }
    console.log(`分槽:            ${sharding ? `开 (${slotsPerDay} 槽/天)` : "关（每轮扫全部店）"}`);
    if (sharding && targetSlots.length === 1) {
      console.log(
        `目标槽位:        ${targetSlots[0]}（本地时段 ${describeSlotHour(targetSlots[0], slotsPerDay)}）`,
      );
    }
    console.log(`店冷却:          ${(cooldownMs / 3_600_000).toFixed(1)}h${checkCooldown ? "（已过滤未过冷却）" : "（未查 Cosmos，可能仍被跳过）"}`);
    console.log(`billing 过滤:    ${billingFilter}`);
    console.log(`要求 offline token: ${requireToken ? "是" : "否"}`);
    if (excludeShopTxt) console.log(`已排除 shop.txt: ${excluded.size} 家`);
    console.log(`候选店:          ${candidates.length} / ${allShops.length}（TSF 已迁移且开了 auto）\n`);

    if (!candidates.length) {
      console.log("本槽位无候选店。可尝试：");
      console.log("  - 去掉 --billing=legacy 或 --check-cooldown");
      console.log("  - 确认已有店 migratedToTsf=1 且 ShopTargetLocale.autoTranslate=1");
      console.log("  - 等下一个小时槽位再跑（分槽下每店每天约 1 批）");
      return;
    }

    const header = `${pad("shop", 38)} ${pad("slot", 5)} ${pad("billing", 8)} ${pad("targets", 8)} last_auto`;
    console.log(header);
    console.log("-".repeat(header.length));

    for (const row of candidates) {
      const slot = shopSlotIndex(row.shop, slotsPerDay);
      const billing = bindings.get(row.shop) ?? "(none)";
      const last =
        row.lastAutoAt instanceof Date
          ? row.lastAutoAt.toISOString().slice(0, 19)
          : "-";
      console.log(
        `${pad(row.shop, 38)} ${pad(slot, 5)} ${pad(billing, 8)} ${pad(row.targets.length, 8)} ${last}`,
      );
    }

    console.log("\n--- 复制到 shop.txt（计费灰度）---");
    for (const row of candidates) {
      console.log(row.shop);
    }
  } finally {
    await turso.close();
  }
}

main().catch((err) => {
  console.error("[next-auto-slot] 失败:", err instanceof Error ? err.message : err);
  process.exit(1);
});
