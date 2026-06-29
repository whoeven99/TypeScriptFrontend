/**
 * 单独从 Java 同步 SwitcherConfiguration + IpRedirection 到 Turso。
 *
 * 用法：
 *   node scripts/sync-switcher-from-java.mjs <shop> [javaBaseUrl]
 *
 * 环境变量（.env）：
 *   SERVER_URL              — Java 基址（未传 javaBaseUrl 时使用）
 *   TURSO_TARGET            — test | prod，默认 test
 *   TURSO_TEST_DATABASE_URL / TURSO_TEST_AUTH_TOKEN
 *   TURSO_PROD_DATABASE_URL / TURSO_PROD_AUTH_TOKEN
 *
 * 示例：
 *   node scripts/sync-switcher-from-java.mjs ciwishop.myshopify.com
 *   node scripts/sync-switcher-from-java.mjs ciwishop.myshopify.com https://springbackendservice-e3hgbjgqafb9cpdh.canadacentral-01.azurewebsites.net
 */
import fs from "node:fs";
import path from "node:path";
import axios from "axios";
import { createClient } from "@libsql/client/http";

function loadDotEnv(dotenvPath) {
  if (!fs.existsSync(dotenvPath)) return {};
  const result = {};
  for (const rawLine of fs.readFileSync(dotenvPath, "utf8").split(/\r?\n/)) {
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

const env = { ...process.env, ...loadDotEnv(path.join(process.cwd(), ".env")) };
const shop = process.argv[2]?.trim();
const javaBase = (process.argv[3] || env.SERVER_URL || "").trim().replace(/\/+$/, "");

if (!shop) {
  console.error("用法: node scripts/sync-switcher-from-java.mjs <shop> [javaBaseUrl]");
  process.exit(1);
}
if (!javaBase) {
  console.error("缺少 Java 基址：传第二个参数或设置 SERVER_URL");
  process.exit(1);
}

const target = (env.TURSO_TARGET || "test").trim().toLowerCase();
const urlKey = target === "prod" ? "TURSO_PROD_DATABASE_URL" : "TURSO_TEST_DATABASE_URL";
const tokenKey = target === "prod" ? "TURSO_PROD_AUTH_TOKEN" : "TURSO_TEST_AUTH_TOKEN";
const tursoUrl = env[urlKey];
const tursoToken = env[tokenKey];

if (!tursoUrl?.startsWith("libsql://") || !tursoToken || tursoToken === "REPLACE_ME") {
  console.error(`缺少有效的 ${urlKey} / ${tokenKey}`);
  process.exit(1);
}

const client = createClient({ url: tursoUrl, authToken: tursoToken });
const now = new Date().toISOString().replace("T", " ").replace("Z", "");

function str(value, fallback = "") {
  return value == null ? fallback : String(value);
}

function bool(value, fallback) {
  return typeof value === "boolean" ? value : fallback;
}

async function fetchFromJava() {
  const res = await axios.post(
    `${javaBase}/widgetConfigurations/getData`,
    { shopName: shop },
    { timeout: 15_000 },
  );
  const data = res.data;
  if (!data?.success || !data.response) {
    throw new Error(data?.errorMsg || "Java getData 无数据");
  }
  return data.response;
}

async function upsertSwitcher(row) {
  await client.execute({
    sql: `INSERT INTO SwitcherConfiguration (
      shop, languageSelector, currencySelector, ipOpen, includedFlag,
      fontColor, backgroundColor, buttonColor, buttonBackgroundColor,
      optionBorderColor, selectorPosition, positionData, isTransparent,
      createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(shop) DO UPDATE SET
      languageSelector = excluded.languageSelector,
      currencySelector = excluded.currencySelector,
      ipOpen = excluded.ipOpen,
      includedFlag = excluded.includedFlag,
      fontColor = excluded.fontColor,
      backgroundColor = excluded.backgroundColor,
      buttonColor = excluded.buttonColor,
      buttonBackgroundColor = excluded.buttonBackgroundColor,
      optionBorderColor = excluded.optionBorderColor,
      selectorPosition = excluded.selectorPosition,
      positionData = excluded.positionData,
      isTransparent = excluded.isTransparent,
      updatedAt = excluded.updatedAt`,
    args: [
      shop,
      bool(row.languageSelector, true) ? 1 : 0,
      bool(row.currencySelector, true) ? 1 : 0,
      bool(row.ipOpen, false) ? 1 : 0,
      bool(row.includedFlag, true) ? 1 : 0,
      str(row.fontColor, "#000000"),
      str(row.backgroundColor, "#ffffff"),
      str(row.buttonColor, "#ffffff"),
      str(row.buttonBackgroundColor, "#000000"),
      str(row.optionBorderColor, "#ccc"),
      str(row.selectorPosition, "bottom_left"),
      str(row.positionData, "10"),
      bool(row.isTransparent, false) ? 1 : 0,
      now,
      now,
    ],
  });
}

async function replaceIpRedirections(rows) {
  await client.execute({
    sql: "DELETE FROM IpRedirection WHERE shop = ?",
    args: [shop],
  });
  for (const row of rows) {
    if (row?.id == null || row.isDeleted) continue;
    await client.execute({
      sql: `INSERT INTO IpRedirection (
        id, shop, region, languageCode, currencyCode, isDeleted, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
      args: [
        Number(row.id),
        shop,
        str(row.region),
        str(row.languageCode),
        str(row.currencyCode),
        now,
        now,
      ],
    });
  }
}

async function verify() {
  const config = await client.execute({
    sql: "SELECT shop, ipOpen, selectorPosition FROM SwitcherConfiguration WHERE shop = ?",
    args: [shop],
  });
  const ipCount = await client.execute({
    sql: "SELECT COUNT(*) AS c FROM IpRedirection WHERE shop = ? AND isDeleted = 0",
    args: [shop],
  });
  return { config: config.rows[0], ipCount: ipCount.rows[0]?.c ?? 0 };
}

async function main() {
  console.log(`[sync-switcher] shop=${shop} java=${javaBase} turso=${target}`);

  const row = await fetchFromJava();
  const redirections = Array.isArray(row.ipRedirections) ? row.ipRedirections : [];

  await upsertSwitcher(row);
  await replaceIpRedirections(redirections);

  const { config, ipCount } = await verify();
  console.log("[sync-switcher] 完成:");
  console.log(JSON.stringify({ shop, switcher: config, ipRedirectionCount: ipCount }, null, 2));

  await client.close();
}

main().catch((err) => {
  console.error("[sync-switcher] 失败:", err.message || err);
  process.exit(1);
});
