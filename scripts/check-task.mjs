import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Redis from "ioredis";

const root = resolve(import.meta.dirname, "..");
for (const raw of readFileSync(resolve(root, ".env"), "utf8").split(/\r?\n/)) {
  const line = raw.trim();
  if (!line || line.startsWith("#")) continue;
  const eq = line.indexOf("=");
  if (eq <= 0) continue;
  const key = line.slice(0, eq).trim();
  let value = line.slice(eq + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  if (!process.env[key]) process.env[key] = value;
}

const taskId = process.argv[2];
const shop = process.argv[3] || "ciwishop.myshopify.com";
const { getV4Job } = await import("../app/server/translateV4/cosmos.server.ts");

const job = await getV4Job(shop, taskId);
const redis = new Redis(process.env.REDIS_URL_V4);
const [progress, control] = await Promise.all([
  redis.hgetall(`translate:v4:progress:${taskId}`),
  redis.get(`translate:v4:control:${taskId}`),
]);
await redis.quit();

console.log(JSON.stringify({ job: job ? {
  id: job.id,
  status: job.status,
  source: job.source,
  target: job.target,
  aiModel: job.aiModel,
  metrics: job.metrics,
  errorMessage: job.errorMessage,
  updatedAt: job.updatedAt,
  stageTimings: job.stageTimings,
} : null, progress, control }, null, 2));
