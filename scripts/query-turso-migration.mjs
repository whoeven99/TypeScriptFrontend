/**
 * 查询 Turso 测试库中的翻译迁移数据
 * 用法：node scripts/query-turso-migration.mjs [shop]
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client/http";

function loadDotEnv(dotenvPath) {
  if (!fs.existsSync(dotenvPath)) return {};
  const result = {};
  for (const rawLine of fs.readFileSync(dotenvPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    result[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return result;
}

const env = { ...process.env, ...loadDotEnv(path.join(process.cwd(), ".env")) };
const url = env.TURSO_TEST_DATABASE_URL;
const authToken = env.TURSO_TEST_AUTH_TOKEN;
if (!url || !authToken) {
  console.error("缺少 TURSO_TEST_DATABASE_URL / TURSO_TEST_AUTH_TOKEN");
  process.exit(1);
}

const shop = process.argv[2] || "ciwishop.myshopify.com";
const client = createClient({ url, authToken });

async function main() {
  const tables = ["ShopTranslationSettings", "Glossary", "LiquidRule", "Session"];
  console.log(`=== Turso test · shop=${shop} ===\n`);

  for (const table of tables) {
    try {
      const count = await client.execute({
        sql: `SELECT COUNT(*) AS c FROM ${table}`,
      });
      console.log(`${table.padEnd(28)} ${count.rows[0].c} 行（全库）`);
    } catch (e) {
      console.log(`${table.padEnd(28)} ❌ ${e.message}`);
    }
  }

  const settings = await client.execute({
    sql: `SELECT shop, primaryLocale, targets, autoTranslate, migratedToTsf, migratedAt
          FROM ShopTranslationSettings WHERE shop = ?`,
    args: [shop],
  });

  const glossaryCount = await client.execute({
    sql: "SELECT COUNT(*) AS c FROM Glossary WHERE shop = ?",
    args: [shop],
  });

  const liquidCount = await client.execute({
    sql: "SELECT COUNT(*) AS c FROM LiquidRule WHERE shop = ?",
    args: [shop],
  });

  console.log("\n--- 本店迁移摘要 ---");
  if (!settings.rows.length) {
    console.log("ShopTranslationSettings: 无记录");
  } else {
    const row = settings.rows[0];
    let targets = row.targets;
    if (typeof targets === "string") {
      try {
        targets = JSON.parse(targets);
      } catch {
        /* keep string */
      }
    }
    console.log(JSON.stringify({ ...row, targets }, null, 2));
  }
  console.log(`Glossary: ${glossaryCount.rows[0].c} 条`);
  console.log(`LiquidRule: ${liquidCount.rows[0].c} 条`);

  const glossaryRows = await client.execute({
    sql: `SELECT sourceText, targetText, rangeCode, caseSensitive
          FROM Glossary WHERE shop = ? ORDER BY rowid`,
    args: [shop],
  });
  console.log("\n--- Glossary 全量 ---");
  console.log(JSON.stringify(glossaryRows.rows, null, 2));

  const liquidRows = await client.execute({
    sql: `SELECT beforeTranslation, afterTranslation, languageCode, replacementMethod
          FROM LiquidRule WHERE shop = ? ORDER BY rowid`,
    args: [shop],
  });
  console.log("\n--- LiquidRule 全量 ---");
  console.log(JSON.stringify(liquidRows.rows, null, 2));

  await client.close();
}

main().catch((e) => {
  console.error("查询失败:", e);
  process.exit(1);
});
