/** 最近 N 天手动翻译任务统计（Spring + TSF Cosmos） */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import sql from "mssql";
import { CosmosClient } from "@azure/cosmos";

const ROOT = process.cwd();
const TSF_ENV = path.join(ROOT, ".env.prod");
const SPARK_ENV = path.join(ROOT, "..", "Spark", ".env.prod");

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

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  }),
);
const DAYS = Math.max(1, Number(args.days) || 3);

function resolveSqlConfig(env) {
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
    server: env.SPRING_DB_SERVER || "",
    port: Number(env.SPRING_DB_PORT) || 1433,
    database: env.SPRING_DB_DATABASE || "bogdatech-prod",
    user,
    password,
    options: { encrypt: true, trustServerCertificate: false },
  };
}

function normalizeShop(shop) {
  const trimmed = String(shop || "").trim().toLowerCase();
  if (!trimmed) return "";
  if (trimmed.includes(".")) return trimmed;
  return `${trimmed}.myshopify.com`;
}

const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);
const sinceIso = since.toISOString();

console.log(`统计窗口：最近 ${DAYS} 天（自 ${sinceIso} UTC 起）\n`);

let springTaskCount = 0;
let springShopCount = 0;
let springShopNames = [];

// ── Spring SQL ─────────────────────────────────────────────────────────────
const tsfEnv = loadDotEnv(TSF_ENV);
const pool = await sql.connect(resolveSqlConfig(tsfEnv));
try {
  const spring = await pool.request().query(`
    SELECT
      shop_name,
      COUNT(*) AS task_count
    FROM Initial_Translate_Tasks_V2
    WHERE task_type = 'manual'
      AND created_at >= DATEADD(day, -${DAYS}, GETUTCDATE())
    GROUP BY shop_name
    ORDER BY task_count DESC, shop_name
  `);

  const springTotal = await pool.request().query(`
    SELECT COUNT(*) AS total
    FROM Initial_Translate_Tasks_V2
    WHERE task_type = 'manual'
      AND created_at >= DATEADD(day, -${DAYS}, GETUTCDATE())
  `);

  const springDeleted = await pool.request().query(`
    SELECT
      SUM(CASE WHEN is_deleted = 0 THEN 1 ELSE 0 END) AS alive,
      SUM(CASE WHEN is_deleted = 1 THEN 1 ELSE 0 END) AS deleted
    FROM Initial_Translate_Tasks_V2
    WHERE task_type = 'manual'
      AND created_at >= DATEADD(day, -${DAYS}, GETUTCDATE())
  `);

  const springRows = spring.recordset;
  springTaskCount = springTotal.recordset[0]?.total ?? 0;
  springShopCount = springRows.length;
  springShopNames = springRows.map((r) => normalizeShop(r.shop_name));

  console.log("=== Spring（Initial_Translate_Tasks_V2 · task_type=manual）===");
  console.log(`任务总数:     ${springTaskCount}`);
  console.log(`商店数:       ${springShopCount}`);
  console.log(
    `  未软删: ${springDeleted.recordset[0]?.alive ?? 0}  已软删: ${springDeleted.recordset[0]?.deleted ?? 0}`,
  );
  if (springRows.length > 0 && springRows.length <= 30) {
    console.log("\n按店明细:");
    for (const row of springRows) {
      console.log(`  ${row.shop_name}  ${row.task_count}`);
    }
  } else if (springRows.length > 30) {
    console.log("\n按店明细（前 15）:");
    for (const row of springRows.slice(0, 15)) {
      console.log(`  ${row.shop_name}  ${row.task_count}`);
    }
    console.log(`  … 另有 ${springRows.length - 15} 家店`);
  }
} finally {
  await pool.close();
}

// ── TSF Cosmos（TsFrontend 手动，非 Auto）──────────────────────────────────
const sparkEnv = loadDotEnv(SPARK_ENV);
const endpoint = sparkEnv.COSMOS_ENDPOINT?.trim();
const key = sparkEnv.COSMOS_KEY?.trim();
const db = sparkEnv.COSMOS_TRANSLATION_DATABASE_ID?.trim() || "translation";
const containerId =
  sparkEnv.COSMOS_TRANSLATION_V4_JOBS_CONTAINER?.trim() || "translation_v4_jobs";

if (!endpoint || !key) {
  console.log("\n=== TSF Cosmos ===\n跳过（未找到 Spark .env.prod Cosmos 凭证）");
} else {
  const client = new CosmosClient({ endpoint, key });
  const container = client.database(db).container(containerId);

  const { resources: manualJobs } = await container.items
    .query({
      query: `
        SELECT c.id, c.shopName, c.taskSource, c.status, c.createdAt
        FROM c
        WHERE c.createdAt >= @since
          AND (c.taskSource = @manual OR (IS_DEFINED(c.taskSource) = false))
          AND (c.taskSource != @auto OR NOT IS_DEFINED(c.taskSource))
      `,
      parameters: [
        { name: "@since", value: sinceIso },
        { name: "@manual", value: "TsFrontend" },
        { name: "@auto", value: "TsFrontend-Auto" },
      ],
    })
    .fetchAll();

  // 更精确：手动 = TsFrontend 或 taskSource 缺失且 createdBy 不是 auto
  const { resources: allRecent } = await container.items
    .query({
      query: `
        SELECT c.id, c.shopName, c.taskSource, c.createdBy, c.status, c.createdAt
        FROM c
        WHERE c.createdAt >= @since
      `,
      parameters: [{ name: "@since", value: sinceIso }],
    })
    .fetchAll();

  const tsfManual = allRecent.filter((j) => {
    const src = j.taskSource ?? null;
    if (src === "TsFrontend-Auto") return false;
    if (src === "TsFrontend") return true;
    if (j.createdBy === "auto") return false;
    // 其它来源（Ciwi 等）也算手动链路里的非自动
    return src !== "TsFrontend-Auto";
  });

  const byShop = new Map();
  for (const j of tsfManual) {
    const shop = normalizeShop(j.shopName);
    byShop.set(shop, (byShop.get(shop) || 0) + 1);
  }
  const sorted = [...byShop.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  console.log("\n=== TSF Cosmos（translation_v4_jobs · 非 TsFrontend-Auto）===");
  console.log(`任务总数:     ${tsfManual.length}`);
  console.log(`商店数:       ${sorted.length}`);

  const bySource = new Map();
  for (const j of tsfManual) {
    const src = j.taskSource ?? "(null)";
    bySource.set(src, (bySource.get(src) || 0) + 1);
  }
  console.log("按 taskSource:");
  for (const [src, cnt] of [...bySource.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${src}: ${cnt}`);
  }

  if (sorted.length > 0 && sorted.length <= 30) {
    console.log("\n按店明细:");
    for (const [shop, cnt] of sorted) {
      console.log(`  ${shop}  ${cnt}`);
    }
  } else if (sorted.length > 30) {
    console.log("\n按店明细（前 15）:");
    for (const [shop, cnt] of sorted.slice(0, 15)) {
      console.log(`  ${shop}  ${cnt}`);
    }
    console.log(`  … 另有 ${sorted.length - 15} 家店`);
  }

  // 合计（去重店名）
  const allShops = new Set([...springShopNames, ...sorted.map(([s]) => s)]);

  console.log("\n=== 合计（Spring + TSF，店名去重）===");
  console.log(`任务总数:     ${springTaskCount + tsfManual.length}`);
  console.log(`商店数（去重）: ${allShops.size}`);
}
