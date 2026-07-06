import fs from "node:fs";
import { CosmosClient } from "@azure/cosmos";
import Redis from "ioredis";

const taskPrefix = process.argv[2]?.trim();
const shop = process.argv[3]?.trim() || "51c7c6.myshopify.com";
if (!taskPrefix) {
  console.error("用法: node scripts/tmp/probe-prod-task.mjs <taskIdPrefix> [shop]");
  process.exit(1);
}

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

const env = { ...loadDotEnv(".env"), ...process.env };

// prod overrides from Render (if not in .env)
const COSMOS_ENDPOINT =
  process.env.COSMOS_ENDPOINT_V4 ||
  "https://sparkcosmosprod.documents.azure.com:443/";
const COSMOS_KEY = process.env.COSMOS_KEY_V4;
const REDIS_URL =
  process.env.REDIS_URL_V4 ||
  "rediss://:jE-McZr4lkr7N7CMA9a0ymMT8hXxGDNbTAZCAFVit_w=@sparkredisprod.westus2.redis.azure.net:10000/0";
const DB = env.COSMOS_TRANSLATION_DATABASE_ID_V4 || "translation";
const CONTAINER =
  env.COSMOS_TRANSLATION_V4_JOBS_CONTAINER_V4 || "translation_v4_jobs";

const client = new CosmosClient({ endpoint: COSMOS_ENDPOINT, key: COSMOS_KEY });
const container = client.database(DB).container(CONTAINER);

const byPrefix = await container.items
  .query({
    query: "SELECT * FROM c WHERE CONTAINS(c.id, @prefix)",
    parameters: [{ name: "@prefix", value: taskPrefix }],
  })
  .fetchAll();

const byShop = await container.items
  .query({
    query:
      "SELECT TOP 10 c.id, c.shopName, c.status, c.errorStage, c.errorMessage, c.metrics, c.updatedAt, c.createdAt FROM c WHERE c.shopName = @shop ORDER BY c.createdAt DESC",
    parameters: [{ name: "@shop", value: shop }],
  })
  .fetchAll();

console.log(`\n=== Cosmos prefix ${taskPrefix} (${byPrefix.resources.length}) ===`);
for (const r of byPrefix.resources) {
  console.log(
    JSON.stringify(
      {
        id: r.id,
        shop: r.shopName,
        status: r.status,
        errorStage: r.errorStage,
        errorMessage: r.errorMessage,
        source: r.source,
        target: r.target,
        metrics: r.metrics,
        stageTimings: r.stageTimings,
        updatedAt: r.updatedAt,
        createdAt: r.createdAt,
      },
      null,
      2,
    ),
  );
}

console.log(`\n=== Cosmos recent shop ${shop} (${byShop.resources.length}) ===`);
for (const r of byShop.resources) {
  console.log(JSON.stringify(r, null, 2));
}

const redis = new Redis(REDIS_URL);
const taskIds = [
  ...new Set([
    ...byPrefix.resources.map((r) => r.id),
    ...byShop.resources.map((r) => r.id),
  ]),
];

for (const id of taskIds) {
  const [progress, control, initQueue] = await Promise.all([
    redis.hgetall(`translate:v4:progress:${id}`),
    redis.get(`translate:v4:control:${id}`),
    redis.lrange(`translate:v4:init:queue:${shop}`, 0, 20),
  ]);
  console.log(`\n=== Redis task ${id} ===`);
  console.log("progress:", progress);
  console.log("control:", control);
  if (Object.keys(progress).length || control) continue;
}

const shopKeys = await redis.keys(`*${taskPrefix}*`);
console.log(`\n=== Redis keys matching *${taskPrefix}* (${shopKeys.length}) ===`);
for (const k of shopKeys.slice(0, 30)) {
  const type = await redis.type(k);
  let val;
  if (type === "hash") val = await redis.hgetall(k);
  else if (type === "string") val = await redis.get(k);
  else if (type === "list") val = await redis.lrange(k, 0, 10);
  else val = type;
  console.log(k, "=>", JSON.stringify(val));
}

await redis.quit();
