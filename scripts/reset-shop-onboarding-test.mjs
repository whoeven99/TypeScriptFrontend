/**
 * 测试环境：把指定店重置为「新人」，方便走试译 → 开拓引导。
 *
 * 仅读取 `.env` + `.env.test` 的 **TURSO_TEST_*** / 测试 Cosmos；
 * 拒绝 TURSO_PROD_*，默认 dry-run，必须加 `--apply` 才写入。
 *
 * Turso 清理（影响 isNew / 开拓成功态）：
 *   BillingLog、AppSubscription、AccountPeriodUsage、Account、
 *   ShopTargetLocale、ShopBillingBinding
 *
 * Cosmos 清理：
 *   taskSource = TsFrontend-Trial（试用）
 *   taskSource = TsFrontend-Expand（开拓，避免旧任务挡住引导）
 *
 * Shopify（默认开启）：用 Session.accessToken 对非主语言执行
 *   shopLocaleDisable，清掉「已发布/未发布」残留，更像真新人。
 *   无 Session（已卸载）时跳过并提示。可用 --skip-shopify-locales 关闭。
 *
 * 不做 Redis 清理（不影响 isNew / 试译恢复）。
 *
 * 用法：
 *   node scripts/reset-shop-onboarding-test.mjs
 *   node scripts/reset-shop-onboarding-test.mjs --apply
 *   node scripts/reset-shop-onboarding-test.mjs --shop other.myshopify.com --apply
 *   node scripts/reset-shop-onboarding-test.mjs --apply --skip-shopify-locales
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client/http";
import { CosmosClient } from "@azure/cosmos";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const DEFAULT_SHOP = "ciwishop.myshopify.com";
const TRIAL_SOURCE = "TsFrontend-Trial";
const EXPAND_SOURCE = "TsFrontend-Expand";
/** 与 app/lib/shopifyAdminApiVersion.ts、worker 同值；升级时三处一起改。 */
const SHOPIFY_API_VERSION = "2026-07";

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const out = {};
  for (const raw of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i <= 0) continue;
    let v = line.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[line.slice(0, i).trim()] = v;
  }
  return out;
}

function parseArgs(argv) {
  let shop = DEFAULT_SHOP;
  let apply = false;
  let skipShopifyLocales = false;
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--apply") apply = true;
    else if (a === "--skip-shopify-locales") skipShopifyLocales = true;
    else if (a === "--shop") {
      shop = String(argv[i + 1] || "").trim();
      i += 1;
    } else if (a.startsWith("--shop=")) {
      shop = a.slice("--shop=".length).trim();
    } else if (a === "--help" || a === "-h") {
      console.log(`Usage:
  node scripts/reset-shop-onboarding-test.mjs [--shop ${DEFAULT_SHOP}] [--apply] [--skip-shopify-locales]

Default is dry-run. Pass --apply to delete/reset.
Only uses TURSO_TEST_* + Cosmos from .env.test (never prod Turso).
By default also disables non-primary Shopify shop locales (needs Session).`);
      process.exit(0);
    }
  }
  return { shop, apply, skipShopifyLocales };
}

function tursoHost(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "(invalid-url)";
  }
}

async function countRows(client, sql, args) {
  const res = await client.execute({ sql, args });
  return Number(res.rows[0]?.n ?? 0);
}

async function deleteRows(client, sql, args, apply) {
  if (!apply) return { changes: 0 };
  const res = await client.execute({ sql, args });
  return { changes: Number(res.rowsAffected ?? 0) };
}

async function shopifyGraphql(shop, accessToken, query, variables) {
  const res = await fetch(
    `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ query, variables }),
    },
  );
  if (!res.ok) {
    throw new Error(`Shopify HTTP ${res.status}`);
  }
  return res.json();
}

/** 禁用店铺内所有非主语言，让试译下拉里回到「店铺没有」。 */
async function resetShopifyLocales({ shop, accessToken, apply }) {
  console.log("\n=== Shopify shop locales ===");
  const listJson = await shopifyGraphql(
    shop,
    accessToken,
    `#graphql
      query ResetOnboardingShopLocales {
        shopLocales {
          locale
          name
          primary
          published
        }
      }
    `,
  );
  const locales = listJson?.data?.shopLocales ?? [];
  if (listJson?.errors?.length) {
    console.error("  list errors:", JSON.stringify(listJson.errors));
  }
  const primary = locales.find((l) => l.primary);
  const removable = locales.filter((l) => !l.primary);
  console.log(
    `  primary=${primary ? `${primary.name} (${primary.locale})` : "(none)"}`,
  );
  console.log(`  non-primary=${removable.length}`);
  for (const l of removable) {
    console.log(
      `    - ${l.name} (${l.locale}) published=${Boolean(l.published)}`,
    );
  }

  if (!apply) {
    console.log("  (dry-run, not disabled)");
    return;
  }

  let ok = 0;
  let fail = 0;
  for (const l of removable) {
    const json = await shopifyGraphql(
      shop,
      accessToken,
      `#graphql
        mutation ResetOnboardingDisableLocale($locale: String!) {
          shopLocaleDisable(locale: $locale) {
            locale
            userErrors { field message }
          }
        }
      `,
      { locale: l.locale },
    );
    const errors = json?.data?.shopLocaleDisable?.userErrors ?? [];
    if (errors.length || json?.errors?.length) {
      fail += 1;
      console.warn(
        `    fail ${l.locale}:`,
        JSON.stringify(errors.length ? errors : json.errors),
      );
    } else {
      ok += 1;
      console.log(`    disabled ${l.locale}`);
    }
  }
  console.log(`  disabled ok=${ok} fail=${fail}`);
}

async function main() {
  const { shop, apply, skipShopifyLocales } = parseArgs(process.argv.slice(2));
  if (!shop || !shop.endsWith(".myshopify.com")) {
    console.error(`Invalid shop: ${shop || "(empty)"} (expect *.myshopify.com)`);
    process.exit(1);
  }

  const env = {
    ...loadEnvFile(resolve(root, ".env")),
    ...loadEnvFile(resolve(root, ".env.test")),
  };

  const tursoUrl = (env.TURSO_TEST_DATABASE_URL || "").trim();
  const tursoToken = (env.TURSO_TEST_AUTH_TOKEN || "").trim();
  if (
    !tursoUrl.startsWith("libsql://") ||
    !tursoToken ||
    tursoToken === "REPLACE_ME"
  ) {
    console.error(
      "Missing TURSO_TEST_DATABASE_URL / TURSO_TEST_AUTH_TOKEN in .env.test",
    );
    process.exit(1);
  }
  if ((env.TURSO_PROD_DATABASE_URL || "").trim() === tursoUrl) {
    console.error(
      "Refusing: TURSO_TEST_DATABASE_URL equals TURSO_PROD_DATABASE_URL",
    );
    process.exit(1);
  }

  const cosmosEndpoint = (
    env.COSMOS_ENDPOINT_V4 ||
    env.COSMOS_ENDPOINT ||
    ""
  ).trim();
  const cosmosKey = (env.COSMOS_KEY_V4 || env.COSMOS_KEY || "").trim();
  const cosmosDb = (
    env.COSMOS_TRANSLATION_DATABASE_ID_V4 ||
    env.COSMOS_TRANSLATION_DATABASE_ID ||
    "translation"
  ).trim();
  const cosmosTranslationContainer = (
    env.COSMOS_TRANSLATION_V4_JOBS_CONTAINER_V4 ||
    env.COSMOS_TRANSLATION_V4_JOBS_CONTAINER ||
    "translation_v4_jobs"
  ).trim();
  const cosmosShopScanContainer = (
    env.COSMOS_SHOP_SCAN_CONTAINER_V4 ||
    env.COSMOS_SHOP_SCAN_CONTAINER ||
    "shop_scan_jobs"
  ).trim();
  if (!cosmosEndpoint || !cosmosKey) {
    console.error("Missing COSMOS_ENDPOINT(_V4) / COSMOS_KEY(_V4) in .env.test");
    process.exit(1);
  }

  const mode = apply ? "APPLY" : "DRY-RUN";
  console.log(`[reset-onboarding] mode=${mode}`);
  console.log(`[reset-onboarding] shop=${shop}`);
  console.log(
    `[reset-onboarding] turso host=${tursoHost(tursoUrl)} (TEST only)`,
  );
  console.log(
    `[reset-onboarding] cosmos db=${cosmosDb} translation=${cosmosTranslationContainer} shopScan=${cosmosShopScanContainer}`,
  );
  console.log(
    `[reset-onboarding] shopify locales=${skipShopifyLocales ? "skip" : "disable non-primary"}`,
  );

  const turso = createClient({ url: tursoUrl, authToken: tursoToken });

  const tableTargets = [
    {
      table: "BillingLog",
      column: "shop",
    },
    {
      table: "AccountPeriodUsage",
      column: "shop",
    },
    {
      table: "AppSubscription",
      column: "shop",
    },
    {
      table: "Account",
      column: "shop",
    },
    {
      table: "ShopTargetLocale",
      column: "shop",
    },
    {
      table: "ShopBillingBinding",
      column: "shop",
    },
  ];

  console.log("\n=== Turso (test) ===");
  console.log(`  table-targets=${tableTargets.length}`);
  for (const t of tableTargets) {
    const countSql = `SELECT COUNT(*) AS n FROM ${t.table} WHERE ${t.column} = ?`;
    const deleteSql = `DELETE FROM ${t.table} WHERE ${t.column} = ?`;
    const before = await countRows(turso, countSql, [shop]);
    const { changes } = await deleteRows(turso, deleteSql, [shop], apply);
    const after = apply ? await countRows(turso, countSql, [shop]) : before;
    console.log(
      `  ${t.table}.${t.column}: before=${before}` +
        (apply ? ` deleted≈${changes} after=${after}` : " (dry-run)"),
    );
  }

  console.log("\n=== Cosmos docs (translation + shop-scan) ===");
  const cosmos = new CosmosClient({ endpoint: cosmosEndpoint, key: cosmosKey });
  const containers = [
    { label: "translation", name: cosmosTranslationContainer },
    { label: "shop-scan", name: cosmosShopScanContainer },
  ];

  for (const c of containers) {
    const container = cosmos.database(cosmosDb).container(c.name);
    const { resources: docs } = await container.items
      .query({
        query: `SELECT c.id, c.shopName, c.taskSource, c.status, c.blobPrefix
                FROM c
                WHERE c.shopName = @shop`,
        parameters: [{ name: "@shop", value: shop }],
      })
      .fetchAll();
    console.log(`  ${c.label} (${c.name}): found=${docs.length}`);
    for (const d of docs.slice(0, 20)) {
      const source = d.taskSource ? ` ${d.taskSource}` : "";
      const status = d.status ? ` ${d.status}` : "";
      console.log(`    - ${d.id}${source}${status}`);
    }
    if (docs.length > 20) console.log(`    … +${docs.length - 20} more`);

    if (apply) {
      let deletedCount = 0;
      for (const d of docs) {
        await container.item(d.id, shop).delete();
        deletedCount += 1;
      }
      console.log(`    deleted=${deletedCount}`);
    } else {
      console.log("    (dry-run, not deleted)");
    }
  }

  if (!skipShopifyLocales) {
    const sessionRes = await turso.execute({
      sql: `SELECT accessToken FROM Session
            WHERE shop = ? AND accessToken IS NOT NULL AND length(accessToken) > 0
            ORDER BY isOnline ASC
            LIMIT 1`,
      args: [shop],
    });
    const accessToken = String(sessionRes.rows[0]?.accessToken || "").trim();
    if (!accessToken) {
      console.log("\n=== Shopify shop locales ===");
      console.log(
        "  skip: no Session.accessToken (app uninstalled?). Reinstall once, then re-run --apply.",
      );
    } else {
      try {
        await resetShopifyLocales({ shop, accessToken, apply });
      } catch (err) {
        console.warn(
          `  shopify locales failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  } else {
    console.log(
      "\n=== Shopify shop locales ===\n  skipped (--skip-shopify-locales)",
    );
  }

  console.log("\n=== Next ===");
  if (!apply) {
    console.log("  Re-run with --apply to execute.");
  } else {
    console.log(
      "  Purge completed for test env Turso/Cosmos/Blob + Shopify locales best-effort.",
    );
    console.log(
      "  If languages still show published, ensure Session existed and shopify disable succeeded.",
    );
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("[reset-onboarding] failed:", err);
  process.exit(1);
});
