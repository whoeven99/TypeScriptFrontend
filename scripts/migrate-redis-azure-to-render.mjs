/**
 * Azure Redis → Render Key Value 按前缀回填。
 *
 * 源: REDIS_URL / REDIS_URL_V4（或 .env.test / .env.prod）
 * 目标: RENDER_KEY_VALUE
 *
 * Usage:
 *   node scripts/migrate-redis-azure-to-render.mjs --env=.env.test --prefixes=tm,items_count
 *   node scripts/migrate-redis-azure-to-render.mjs --env=.env.test --prefixes=tm --write
 *
 * 默认 dry-run。禁止 KEYS *，使用 SCAN。
 */
import fs from "fs";
import path from "path";
import Redis from "ioredis";

const CUTOVER_TOKEN_PREFIXES = {
  tm: ["tm:v5:"],
  items_count: ["tsf:items_count:"],
  progress: ["translate:v4:progress:"],
  control: ["translate:v4:control:"],
  auto_scan: ["translate:v4:auto_scan:"],
  hints: ["translate:v4:hint:"],
  shop_scan: ["tsf:shop_scan:"],
  keystat: ["translate:v4:keystat:", "translate:v4:keystatlog:"],
};

function loadEnvFile(file) {
  const p = path.resolve(file);
  if (!fs.existsSync(p)) throw new Error(`env file missing: ${file}`);
  const out = {};
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    let k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

function parseArgs(argv) {
  let envFile = ".env.test";
  let prefixesArg = "";
  let write = false;
  for (const a of argv) {
    if (a.startsWith("--env=")) envFile = a.slice("--env=".length);
    else if (a.startsWith("--prefixes=")) prefixesArg = a.slice("--prefixes=".length);
    else if (a === "--write") write = true;
  }
  return { envFile, prefixesArg, write };
}

function resolvePrefixes(prefixesArg) {
  const tokens = prefixesArg
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  if (tokens.length === 0) {
    throw new Error(
      "必填 --prefixes=tm,items_count,... 或 --prefixes=all（token 同 REDIS_CUTOVER）",
    );
  }
  if (tokens.some((t) => t === "*" || t === "all")) {
    return Object.values(CUTOVER_TOKEN_PREFIXES).flat();
  }
  const out = [];
  for (const t of tokens) {
    const mapped = CUTOVER_TOKEN_PREFIXES[t];
    if (!mapped) throw new Error(`unknown token: ${t}`);
    out.push(...mapped);
  }
  return out;
}

async function scanKeys(redis, match) {
  const keys = [];
  let cursor = "0";
  do {
    const [next, batch] = await redis.scan(
      cursor,
      "MATCH",
      match,
      "COUNT",
      200,
    );
    cursor = next;
    keys.push(...batch);
  } while (cursor !== "0");
  return keys;
}

async function copyKey(src, dst, key, write) {
  const ttl = await src.pttl(key);
  const dump = await src.dump(key);
  if (dump == null) return { key, skipped: true, reason: "missing" };
  if (!write) return { key, dryRun: true, ttl };
  // REPLACE + 保留 PTTL；-1 无过期用 0 表示 keep no expire in RESTORE? 
  // Redis RESTORE: if ttl is 0, key has no expiry. If -1 from PTTL means no expiry → use 0.
  // PTTL -2 means key gone.
  if (ttl === -2) return { key, skipped: true, reason: "expired" };
  const restoreTtl = ttl < 0 ? 0 : ttl;
  await dst.restore(key, restoreTtl, dump, "REPLACE");
  return { key, copied: true, ttl };
}

async function main() {
  const { envFile, prefixesArg, write } = parseArgs(process.argv.slice(2));
  const env = loadEnvFile(envFile);
  const srcUrl =
    env.REDIS_URL_V4?.trim() ||
    env.REDIS_URL?.trim() ||
    process.env.REDIS_URL_V4?.trim() ||
    process.env.REDIS_URL?.trim();
  const dstUrl =
    env.RENDER_KEY_VALUE?.trim() || process.env.RENDER_KEY_VALUE?.trim();
  if (!srcUrl) throw new Error("missing source REDIS_URL / REDIS_URL_V4");
  if (!dstUrl) throw new Error("missing RENDER_KEY_VALUE");

  const prefixes = resolvePrefixes(prefixesArg);
  console.log(
    JSON.stringify({
      envFile,
      write,
      prefixes,
      mode: write ? "WRITE" : "DRY-RUN",
    }),
  );

  const src = new Redis(srcUrl, {
    maxRetriesPerRequest: 2,
    connectTimeout: 15_000,
  });
  const dst = new Redis(dstUrl, {
    maxRetriesPerRequest: 2,
    connectTimeout: 15_000,
  });

  try {
    await src.ping();
    await dst.ping();
    let total = 0;
    let copied = 0;
    for (const prefix of prefixes) {
      const match = `${prefix}*`;
      const keys = await scanKeys(src, match);
      console.log(JSON.stringify({ prefix, matched: keys.length }));
      for (const key of keys) {
        total += 1;
        const r = await copyKey(src, dst, key, write);
        if (r.copied || r.dryRun) copied += 1;
        if (total <= 5 || total % 500 === 0) {
          console.log(JSON.stringify(r));
        }
      }
    }
    console.log(JSON.stringify({ done: true, total, considered: copied, write }));
  } finally {
    src.disconnect();
    dst.disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
