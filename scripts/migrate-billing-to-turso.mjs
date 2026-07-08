/**
 * 把 Spring 主翻译 App 的「额度 + 订阅」灰度迁移到 TSF Turso 新 account 系统。
 *
 * 迁移目标（每个 shop，写 Turso）：
 *   - ShopBillingBinding: billingSystem legacy -> tsf（boundReason=migrated_from_legacy），此后计费全走 tsf
 *   - Account:            三池额度 + 已用（守恒：迁移后 remaining 与 legacy 完全一致）
 *   - AppSubscription:    付费 ACTIVE 订阅（复用同一 Shopify GID，供后续续费 webhook 识别）
 *   - BillingLog:         一条 SUBSCRIPTION_ACTIVATED 审计（付费用户；metadata.source=legacy_migration）
 *
 * 额度映射（最强守恒）：
 *   - 权威 total/used 取自 Spring HTTP /quota/query（Redis 口径，与线上实扣一致）
 *   - purchasedCredits = TranslationCounter.chars（DB，累加购买池）
 *   - subscriptionCredits = max(0, 权威 maxToken - chars)（用权威 total 反推计划基线池）
 *   - trialCredits = 0（tsf 试用由订阅 trialDays / trialEndsAt 承载）
 *   - usedCredits = 权威 usedToken
 *   => tsf total = maxToken，remaining = maxToken - usedToken，与 legacy 恒等
 *   /quota/query 不可用时回退 DB：total = max_translations_month + chars，used = used_chars（标注 fallback）
 *
 * 订阅映射：
 *   - 是否付费 = 存在 status=ACTIVE 且含 AppSubscription 的 CharsOrders（取最新一条的 GID）
 *   - tier 取自 SubscriptionPlans.plan_name / 订单 name（Basic|Pro|Premium）
 *   - interval = fee_type(2=ANNUAL, 否则 MONTHLY)
 *   - planKey = `${tier}-${monthly|annual}`，creditsPerPeriod 取 Turso PlanCatalog.credits（续费标准量）
 *   - currentPeriodStart/End = UserSubscriptions.start_date/end_date
 *   - trialEndsAt = UserTrials.trial_end（未过期且晚于当前）
 *
 * 用法（TypeScriptFrontend 根目录，凭据在 .env.prod）：
 *   node scripts/migrate-billing-to-turso.mjs                       # dry-run，读 shop.txt，对 prod 库对账
 *   node scripts/migrate-billing-to-turso.mjs --shop=demo.myshopify.com
 *   node scripts/migrate-billing-to-turso.mjs --file=shop.txt --target=test
 *   node scripts/migrate-billing-to-turso.mjs --apply                # 实际写入 Turso（幂等：已 tsf 的店跳过）
 *   node scripts/migrate-billing-to-turso.mjs --apply --force        # 已 tsf 也重新覆盖写入
 *   node scripts/migrate-billing-to-turso.mjs --rollback --apply     # 把清单里的店 binding 改回 legacy
 *
 * 依赖 .env.prod：SPRING_DB_URL(或 SPRING_DB_SERVER/DATABASE) + SPRING_DB_USER + SPRING_DB_PASSWORD、
 *   SERVER_URL(Spring /quota)、TURSO_DATABASE_URL / TURSO_AUTH_TOKEN（或 TURSO_PROD_ / TURSO_TEST_ 前缀）。
 *
 * 默认 dry-run（只读、不写库）。加 --apply 才写入。
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import sql from "mssql";
import { createClient } from "@libsql/client/http";

const ROOT = process.cwd();

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

function normalizeShop(shop) {
  let value = String(shop || "").trim().toLowerCase();
  if (!value) return "";
  value = value.replace(/^https?:\/\//, "").split("/")[0].trim();
  value = value.replace(/\.myshopify\.coms$/i, ".myshopify.com");
  if (!value.includes(".")) return `${value}.myshopify.com`;
  return value;
}

/** 从清单文件里提取所有 myshopify 域名（忽略 # 注释，容忍任意排版）。 */
function loadShopsFromFile(filePath) {
  if (!existsSync(filePath)) return [];
  const shops = new Set();
  const re = /([a-z0-9][a-z0-9-]*\.myshopify\.com)/gi;
  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.split("#")[0];
    for (const m of line.matchAll(re)) shops.add(normalizeShop(m[1]));
  }
  return [...shops];
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

function resolveSpringSqlConfig(env) {
  const password = env.SPRING_DB_PASSWORD || env.SPRING_PASSWORD || "";
  const user =
    env.SPRING_DB_USER || env.SPRING_USERNAME || env.SPRING_DB_USERNAME || "";

  if (env.SPRING_DB_URL || env.SPRING_URL) {
    const parsed = parseJdbcUrl(env.SPRING_DB_URL || env.SPRING_URL);
    if (!parsed.server || !parsed.database || !user || !password) {
      throw new Error(
        "SPRING_DB_URL 已设置，但缺少 SPRING_DB_USER / SPRING_DB_PASSWORD",
      );
    }
    return {
      server: parsed.server,
      port: parsed.port,
      database: parsed.database,
      user,
      password,
      options: { encrypt: true, trustServerCertificate: false },
    };
  }

  const server = env.SPRING_DB_SERVER || env.SPRING_DB_HOST || "";
  const database = env.SPRING_DB_DATABASE || env.SPRING_DB_NAME || "bogdatech-prod";
  if (!server || !user || !password) {
    throw new Error(
      "缺少 Spring SQL 凭证，请在 .env.prod 配置 SPRING_DB_SERVER/SPRING_DB_DATABASE/SPRING_DB_USER/SPRING_DB_PASSWORD 或 SPRING_DB_URL",
    );
  }

  return {
    server,
    port: Number(env.SPRING_DB_PORT) || 1433,
    database,
    user,
    password,
    options: { encrypt: true, trustServerCertificate: false },
  };
}

function resolveTursoConfig(env, target) {
  const isProd = target === "prod";
  const url = isProd
    ? env.TURSO_PROD_DATABASE_URL || env.TURSO_DATABASE_URL
    : env.TURSO_TEST_DATABASE_URL || env.TURSO_DATABASE_URL;
  const authToken = isProd
    ? env.TURSO_PROD_AUTH_TOKEN || env.TURSO_AUTH_TOKEN
    : env.TURSO_TEST_AUTH_TOKEN || env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    throw new Error(
      isProd
        ? "缺少 TURSO_PROD_DATABASE_URL / TURSO_PROD_AUTH_TOKEN（或 TURSO_DATABASE_URL / TURSO_AUTH_TOKEN）"
        : "缺少 TURSO_TEST_DATABASE_URL / TURSO_TEST_AUTH_TOKEN（或 TURSO_DATABASE_URL / TURSO_AUTH_TOKEN）",
    );
  }
  if (!String(url).startsWith("libsql://")) {
    throw new Error(`Turso URL 必须是 libsql://，当前=${url}`);
  }
  return { url, authToken };
}

/** JS Date -> SQLite DATETIME 文本（YYYY-MM-DD HH:MM:SS，UTC），与 Prisma/worker datetime('now') 一致。 */
function toSqliteDt(value) {
  if (value === null || value === undefined) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().replace("T", " ").slice(0, 19);
}

function toIntOrZero(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
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

// ---- Spring 侧查询 ----

// 每 shop 的额度/订阅快照（TranslationCounter + UserSubscriptions + SubscriptionPlans + UserTrials）
const SNAPSHOT_SQL = `
SELECT
  tc.shop_name             AS shop_name,
  tc.chars                 AS chars,
  tc.used_chars            AS used_chars,
  tc.open_ai_chars         AS open_ai_chars,
  us.plan_id               AS plan_id,
  us.status                AS sub_status,
  us.fee_type              AS fee_type,
  us.start_date            AS start_date,
  us.end_date              AS end_date,
  sp.plan_name             AS plan_name,
  sp.max_translations_month AS max_translations_month,
  ut.trial_end             AS trial_end,
  ut.is_trial_expired      AS is_trial_expired
FROM TranslationCounter tc
LEFT JOIN UserSubscriptions us ON us.shop_name = tc.shop_name
LEFT JOIN SubscriptionPlans sp ON sp.plan_id = us.plan_id
LEFT JOIN UserTrials ut ON ut.shop_name = tc.shop_name
WHERE tc.shop_name = @shop
`;

// 最新一条 ACTIVE 订阅订单（拿 Shopify AppSubscription GID）
const ACTIVE_SUB_ORDER_SQL = `
SELECT TOP 1 id, name, status, created_at
FROM CharsOrders
WHERE shop_name = @shop
  AND status = 'ACTIVE'
  AND id LIKE '%AppSubscription%'
ORDER BY created_at DESC
`;

async function fetchSpringSnapshot(pool, shop) {
  const snapReq = pool.request();
  snapReq.input("shop", sql.NVarChar, shop);
  const snap = await snapReq.query(SNAPSHOT_SQL);
  const row = snap.recordset[0] || null;

  const orderReq = pool.request();
  orderReq.input("shop", sql.NVarChar, shop);
  const order = await orderReq.query(ACTIVE_SUB_ORDER_SQL);
  const activeOrder = order.recordset[0] || null;

  return { row, activeOrder };
}

/** 调 Spring /quota/query 拿权威 total/used（Redis 口径）。失败返回 null。 */
async function fetchAuthoritativeQuota(base, shop) {
  if (!base) return null;
  try {
    const url = `${base}/quota/query?shopName=${encodeURIComponent(shop)}`;
    const resp = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(10000),
    });
    const data = await resp.json().catch(() => null);
    if (data?.success && data.response) {
      return {
        maxToken: toIntOrZero(data.response.maxToken),
        usedToken: toIntOrZero(data.response.usedToken),
        remaining: toIntOrZero(data.response.remaining),
      };
    }
    return null;
  } catch {
    return null;
  }
}

function resolveTier(planName, orderName) {
  const hay = `${planName ?? ""} ${orderName ?? ""}`.toLowerCase();
  if (hay.includes("premium")) return "premium";
  if (hay.includes("pro")) return "pro";
  if (hay.includes("basic")) return "basic";
  return null;
}

/**
 * 由 Spring 快照 + 权威额度 + PlanCatalog 计算 tsf 迁移计划。
 * planCatalog: Map<planKey, {credits, shopifyPlanName}>
 */
function buildMigrationPlan({ shop, snapshot, quota, planCatalog }) {
  const warnings = [];
  const { row, activeOrder } = snapshot;

  if (!row) {
    return {
      shop,
      skip: true,
      reason: "Spring TranslationCounter 无记录（非主翻译 App 用户？）",
      warnings,
    };
  }

  const chars = toIntOrZero(row.chars);
  const dbUsed = toIntOrZero(row.used_chars);
  const dbMaxPlan = toIntOrZero(row.max_translations_month);

  // 权威额度：优先 /quota/query（Redis），回退 DB 镜像
  let totalAuthoritative;
  let usedAuthoritative;
  let quotaSource;
  if (quota) {
    totalAuthoritative = quota.maxToken;
    usedAuthoritative = quota.usedToken;
    quotaSource = "redis(/quota/query)";
    if (usedAuthoritative !== dbUsed) {
      warnings.push(
        `used 漂移：Redis=${usedAuthoritative} vs DB.used_chars=${dbUsed}（以 Redis 为准）`,
      );
    }
  } else {
    totalAuthoritative = dbMaxPlan + chars;
    usedAuthoritative = dbUsed;
    quotaSource = "db(fallback)";
    warnings.push("/quota/query 不可用，已回退 DB 口径（total=max_plan+chars, used=used_chars）");
  }

  const purchasedCredits = Math.max(0, chars);
  let subscriptionCredits = totalAuthoritative - purchasedCredits;
  if (subscriptionCredits < 0) {
    warnings.push(
      `权威 total(${totalAuthoritative}) < 购买池 chars(${purchasedCredits})，subscriptionCredits clamp 到 0`,
    );
    subscriptionCredits = 0;
  }
  const trialCredits = 0;
  const usedCredits = Math.max(0, usedAuthoritative);
  const totalAfter = subscriptionCredits + purchasedCredits + trialCredits;
  const remainingAfter = Math.max(0, totalAfter - usedCredits);
  const remainingBefore = Math.max(0, totalAuthoritative - usedAuthoritative);

  // 订阅：以「存在 ACTIVE 订阅订单」为付费判据
  const gid = activeOrder ? String(activeOrder.id) : null;
  const tier = resolveTier(row.plan_name, activeOrder?.name);
  const isPaid = Boolean(gid && tier);

  let subscription = null;
  if (gid && !tier) {
    warnings.push(`有 ACTIVE 订阅订单但无法识别档位（plan_name=${row.plan_name}, order=${activeOrder?.name}）→ 暂按无订阅迁移`);
  }
  if (tier && !gid) {
    warnings.push(`plan_name=${row.plan_name} 像付费档但无 ACTIVE 订阅订单 → 按无订阅迁移（可能已取消/过期）`);
  }

  if (isPaid) {
    const interval = toIntOrZero(row.fee_type) === 2 ? "ANNUAL" : "MONTHLY";
    const planKey = `${tier}-${interval === "ANNUAL" ? "annual" : "monthly"}`;
    const catalog = planCatalog.get(planKey);
    if (!catalog) {
      warnings.push(`PlanCatalog 无 planKey=${planKey}，creditsPerPeriod 回退用 subscriptionCredits`);
    }
    const creditsPerPeriod = catalog ? toIntOrZero(catalog.credits) : subscriptionCredits;
    if (catalog && creditsPerPeriod !== subscriptionCredits) {
      warnings.push(
        `计划基线差异：Spring subscriptionCredits=${subscriptionCredits} vs PlanCatalog ${planKey}.credits=${creditsPerPeriod}（当前守恒，续费按目录值发放）`,
      );
    }

    // 试用期：UserTrials.trial_end 未过期且晚于当前
    let trialEndsAt = null;
    const trialEnd = row.trial_end ? new Date(row.trial_end) : null;
    const trialExpired = row.is_trial_expired === true || row.is_trial_expired === 1;
    if (trialEnd && !Number.isNaN(trialEnd.getTime()) && !trialExpired && trialEnd.getTime() > Date.now()) {
      trialEndsAt = trialEnd;
    }

    subscription = {
      planKey,
      shopifySubscriptionId: gid,
      billingInterval: interval,
      creditsPerPeriod,
      trialEndsAt,
      currentPeriodStart: row.start_date ? new Date(row.start_date) : null,
      currentPeriodEnd: row.end_date ? new Date(row.end_date) : null,
      rawPayload: {
        source: "legacy_migration",
        springPlanId: toIntOrZero(row.plan_id),
        springPlanName: row.plan_name ?? null,
        feeType: toIntOrZero(row.fee_type),
        orderName: activeOrder?.name ?? null,
      },
    };
  }

  return {
    shop,
    skip: false,
    quotaSource,
    account: { subscriptionCredits, purchasedCredits, trialCredits, usedCredits },
    totalAfter,
    remainingAfter,
    remainingBefore,
    totalAuthoritative,
    usedAuthoritative,
    isPaid,
    subscription,
    warnings,
  };
}

// ---- Turso 侧读写 ----

async function loadPlanCatalog(turso) {
  const rs = await turso.execute(
    `SELECT planKey, credits, shopifyPlanName FROM PlanCatalog WHERE kind = 'SUBSCRIPTION'`,
  );
  const map = new Map();
  for (const r of rs.rows) {
    map.set(String(r.planKey), {
      credits: Number(r.credits ?? 0),
      shopifyPlanName: r.shopifyPlanName != null ? String(r.shopifyPlanName) : null,
    });
  }
  return map;
}

async function getBinding(turso, shop) {
  const rs = await turso.execute({
    sql: "SELECT billingSystem, boundReason FROM ShopBillingBinding WHERE shop = ? LIMIT 1",
    args: [shop],
  });
  const r = rs.rows[0];
  return r ? { billingSystem: String(r.billingSystem), boundReason: r.boundReason ? String(r.boundReason) : null } : null;
}

function buildApplyStatements(plan) {
  const { shop, account, subscription } = plan;
  const stmts = [];

  // 1) binding: legacy/无 -> tsf
  stmts.push({
    sql: `INSERT INTO "ShopBillingBinding" ("shop","billingSystem","boundReason","createdAt","updatedAt")
          VALUES (?, 'tsf', 'migrated_from_legacy', datetime('now'), datetime('now'))
          ON CONFLICT("shop") DO UPDATE SET
            "billingSystem" = 'tsf',
            "boundReason" = 'migrated_from_legacy',
            "updatedAt" = datetime('now')`,
    args: [shop],
  });

  // 2) Account 三池 + 已用
  stmts.push({
    sql: `INSERT INTO "Account" ("shop","subscriptionCredits","purchasedCredits","trialCredits","usedCredits","createdAt","updatedAt")
          VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
          ON CONFLICT("shop") DO UPDATE SET
            "subscriptionCredits" = excluded."subscriptionCredits",
            "purchasedCredits" = excluded."purchasedCredits",
            "trialCredits" = excluded."trialCredits",
            "usedCredits" = excluded."usedCredits",
            "updatedAt" = datetime('now')`,
    args: [
      shop,
      account.subscriptionCredits,
      account.purchasedCredits,
      account.trialCredits,
      account.usedCredits,
    ],
  });

  // 3) 付费订阅
  if (subscription) {
    stmts.push({
      sql: `INSERT INTO "AppSubscription"
              ("shop","planKey","shopifySubscriptionId","billingInterval","status","creditsPerPeriod",
               "trialEndsAt","currentPeriodStart","currentPeriodEnd","rawPayload","createdAt","updatedAt")
            VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            ON CONFLICT("shop") DO UPDATE SET
              "planKey" = excluded."planKey",
              "shopifySubscriptionId" = excluded."shopifySubscriptionId",
              "billingInterval" = excluded."billingInterval",
              "status" = 'ACTIVE',
              "creditsPerPeriod" = excluded."creditsPerPeriod",
              "trialEndsAt" = excluded."trialEndsAt",
              "currentPeriodStart" = excluded."currentPeriodStart",
              "currentPeriodEnd" = excluded."currentPeriodEnd",
              "cancelledAt" = NULL,
              "rawPayload" = excluded."rawPayload",
              "updatedAt" = datetime('now')`,
      args: [
        shop,
        subscription.planKey,
        subscription.shopifySubscriptionId,
        subscription.billingInterval,
        subscription.creditsPerPeriod,
        toSqliteDt(subscription.trialEndsAt),
        toSqliteDt(subscription.currentPeriodStart),
        toSqliteDt(subscription.currentPeriodEnd),
        JSON.stringify(subscription.rawPayload),
      ],
    });

    // 4) 审计流水（referenceId=GID；作为续费/幂等锚点）
    stmts.push({
      sql: `INSERT INTO "BillingLog" ("id","shop","eventType","planKey","referenceId","creditsDelta","usedCredits","metadata","createdAt")
            VALUES (?, ?, 'SUBSCRIPTION_ACTIVATED', ?, ?, ?, ?, ?, datetime('now'))`,
      args: [
        crypto.randomUUID(),
        shop,
        subscription.planKey,
        subscription.shopifySubscriptionId,
        subscription.creditsPerPeriod,
        account.usedCredits,
        JSON.stringify({ source: "legacy_migration" }),
      ],
    });
  }

  return stmts;
}

async function verifyTursoAccount(turso, shop) {
  const rs = await turso.execute({
    sql: "SELECT subscriptionCredits, purchasedCredits, trialCredits, usedCredits FROM Account WHERE shop = ? LIMIT 1",
    args: [shop],
  });
  const r = rs.rows[0];
  if (!r) return null;
  const total =
    Number(r.subscriptionCredits ?? 0) +
    Number(r.purchasedCredits ?? 0) +
    Number(r.trialCredits ?? 0);
  const used = Number(r.usedCredits ?? 0);
  // 与 getRemainingCredits 及 remainingBefore 口径一致：下限 0
  return { total, used, remaining: Math.max(0, total - used) };
}

function pad(str, len) {
  const s = String(str ?? "");
  return s.length >= len ? s : s + " ".repeat(len - s.length);
}

// ---- 主流程 ----

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

  const apply = Boolean(args.apply);
  const rollback = Boolean(args.rollback);
  const force = Boolean(args.force);
  const concurrency = Math.max(1, Number(args.concurrency) || 6);
  const springBase = (env.SERVER_URL || "").trim().replace(/\/+$/, "");

  // 迁移清单：--shop 单店优先，否则读 --file（默认 shop.txt）
  let shops;
  if (typeof args.shop === "string" && args.shop.trim()) {
    shops = [normalizeShop(args.shop)];
  } else {
    const file = typeof args.file === "string" ? args.file : "shop.txt";
    const filePath = path.isAbsolute(file) ? file : path.join(ROOT, file);
    shops = loadShopsFromFile(filePath);
    if (!shops.length) {
      throw new Error(`清单为空：${filePath}。请用 next-migration-shops 生成，或用 --shop 指定单店。`);
    }
  }
  shops = [...new Set(shops.filter(Boolean))];

  const springConfig = resolveSpringSqlConfig(env);
  const tursoConfig = resolveTursoConfig(env, target);

  const mode = rollback ? "ROLLBACK" : "MIGRATE";
  console.log(`[billing:migrate] mode=${mode} target=${target} apply=${apply ? "yes" : "no(dry-run)"} force=${force ? "yes" : "no"}`);
  console.log(`[billing:migrate] spring=${springConfig.server}/${springConfig.database}`);
  console.log(`[billing:migrate] quotaBase=${springBase || "(未配置 SERVER_URL，将回退 DB 口径)"}`);
  console.log(`[billing:migrate] turso=${new URL(tursoConfig.url).host}`);
  console.log(`[billing:migrate] shops=${shops.length}\n`);

  const springPool = await sql.connect(springConfig);
  const turso = createClient(tursoConfig);

  try {
    // ---- ROLLBACK：仅把 binding 改回 legacy（保留 Account/AppSubscription，便于再次前滚）----
    if (rollback) {
      let done = 0;
      for (const shop of shops) {
        const binding = await getBinding(turso, shop);
        if (!binding) {
          console.log(`${pad(shop, 38)} 无 binding，跳过`);
          continue;
        }
        if (binding.billingSystem !== "tsf") {
          console.log(`${pad(shop, 38)} 当前=${binding.billingSystem}，非 tsf，跳过`);
          continue;
        }
        if (!apply) {
          console.log(`${pad(shop, 38)} [dry-run] 将回退 tsf -> legacy`);
          continue;
        }
        await turso.execute({
          sql: `UPDATE "ShopBillingBinding" SET "billingSystem"='legacy', "boundReason"='rolled_back_from_tsf', "updatedAt"=datetime('now') WHERE "shop"=?`,
          args: [shop],
        });
        done += 1;
        console.log(`${pad(shop, 38)} 已回退 -> legacy`);
      }
      console.log(`\n[billing:migrate] rollback 完成，${apply ? `已回退 ${done} 家` : "dry-run 未写入"}`);
      console.log("提醒：回退后 tsf 账本仍保留；期间 tsf 产生的用量不会回写 Spring。请重启 worker 清理 binding 缓存。");
      return;
    }

    // ---- MIGRATE ----
    const planCatalog = await loadPlanCatalog(turso);
    if (!planCatalog.size) {
      console.warn("[billing:migrate] 警告：Turso PlanCatalog 无 SUBSCRIPTION 记录，creditsPerPeriod 将回退。请确认已跑 turso:migrate。\n");
    }

    const plans = await runPool(shops, concurrency, async (shop) => {
      try {
        const snapshot = await fetchSpringSnapshot(springPool, shop);
        const quota = await fetchAuthoritativeQuota(springBase, shop);
        const binding = await getBinding(turso, shop);
        const plan = buildMigrationPlan({ shop, snapshot, quota, planCatalog });
        plan.existingBinding = binding;
        return plan;
      } catch (err) {
        return { shop, error: err instanceof Error ? err.message : String(err), warnings: [] };
      }
    });

    // 打印对账表
    const header =
      `${pad("shop", 38)} ${pad("plan", 16)} ${pad("sub", 11)} ${pad("purchased", 11)} ${pad("used", 11)} ${pad("remain", 11)} ${pad("binding", 10)} src`;
    console.log(header);
    console.log("-".repeat(header.length));

    let migratable = 0;
    let paidCount = 0;
    let freeCount = 0;
    let skipCount = 0;
    let alreadyTsf = 0;
    const warnBucket = [];

    for (const plan of plans) {
      if (plan.error) {
        console.log(`${pad(plan.shop, 38)} ERROR: ${plan.error}`);
        skipCount += 1;
        continue;
      }
      if (plan.skip) {
        console.log(`${pad(plan.shop, 38)} SKIP: ${plan.reason}`);
        skipCount += 1;
        continue;
      }

      const bindingState = plan.existingBinding?.billingSystem ?? "(none)";
      const isAlready = bindingState === "tsf";
      if (isAlready) alreadyTsf += 1;

      const planLabel = plan.isPaid ? plan.subscription.planKey : "free/none";
      console.log(
        `${pad(plan.shop, 38)} ${pad(planLabel, 16)} ${pad(plan.account.subscriptionCredits, 11)} ${pad(plan.account.purchasedCredits, 11)} ${pad(plan.account.usedCredits, 11)} ${pad(plan.remainingAfter, 11)} ${pad(bindingState, 10)} ${plan.quotaSource}`,
      );

      if (plan.remainingAfter !== plan.remainingBefore) {
        plan.warnings.push(`remaining 不一致：before=${plan.remainingBefore} after=${plan.remainingAfter}`);
      }
      if (plan.warnings.length) {
        warnBucket.push({ shop: plan.shop, warnings: plan.warnings });
      }

      if (isAlready && !force) continue; // 幂等：已 tsf 跳过
      migratable += 1;
      if (plan.isPaid) paidCount += 1;
      else freeCount += 1;
    }

    if (warnBucket.length) {
      console.log("\n=== 警告（需人工确认）===");
      for (const { shop, warnings } of warnBucket) {
        for (const w of warnings) console.log(`  ${pad(shop, 38)} ${w}`);
      }
    }

    console.log("\n=== 汇总 ===");
    console.log(`清单店铺:        ${shops.length}`);
    console.log(`已是 tsf:        ${alreadyTsf}${force ? "（--force 将覆盖重写）" : "（幂等跳过）"}`);
    console.log(`待迁移:          ${migratable}（付费 ${paidCount} / 免费 ${freeCount}）`);
    console.log(`跳过/异常:       ${skipCount}`);

    if (!apply) {
      console.log("\n[billing:migrate] dry-run 完成，未写入。确认无误后加 --apply 执行。");
      return;
    }

    // ---- 写入 ----
    let written = 0;
    let mismatch = 0;
    for (const plan of plans) {
      if (plan.error || plan.skip) continue;
      const isAlready = plan.existingBinding?.billingSystem === "tsf";
      if (isAlready && !force) continue;

      const stmts = buildApplyStatements(plan);
      await turso.batch(stmts, "write");
      written += 1;

      const after = await verifyTursoAccount(turso, plan.shop);
      const ok = after && after.remaining === plan.remainingBefore;
      if (!ok) {
        mismatch += 1;
        console.log(
          `  [verify] ${plan.shop} 校验不一致 before=${plan.remainingBefore} turso=${after ? after.remaining : "null"}`,
        );
      }
    }

    console.log(`\n[billing:migrate] 写入完成：${written} 家；校验不一致 ${mismatch} 家。`);
    console.log("下一步：重启 worker（清理 binding 内存缓存），并抽查 /api/app-bootstrap 与 /api/translate-v4/quota 显示是否正常。");
  } finally {
    await springPool.close();
    await turso.close();
  }
}

main().catch((err) => {
  console.error("[billing:migrate] 失败:", err instanceof Error ? err.message : err);
  process.exit(1);
});
