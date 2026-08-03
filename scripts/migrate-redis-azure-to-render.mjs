/**
 * Azure Redis → Render Key Value 按前缀回填。
 *
 * 源: REDIS_URL_V4 / REDIS_URL（.env 文件）
 * 目标: RENDER_KV（兼容旧名 RENDER_KEY_VALUE）
 *
 * Usage:
 *   node scripts/migrate-redis-azure-to-render.mjs --env=.env.test --prefixes=all --write
 *   node scripts/migrate-redis-azure-to-render.mjs --env=.env.test --prefixes=tm --use-keys --write
 *
 * 默认 dry-run。
 * --use-keys：仅允许测试环境（.env.test / sparkredistest 等）；正式环境一律拒绝 KEYS。
 * 不用 DUMP/RESTORE（Azure↔Valkey RDB 不兼容），按 TYPE 读写拷贝。
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

const PROD_HOST_MARKERS = [
  "redis.azure.net",
  ".prod.",
  "production",
];
const TEST_HOST_MARKERS = [
  "sparkredistest",
  "redis-test",
  "-test.",
  "oregon-keyvalue.render.com",
];

function loadEnvFile(file) {
  const p = path.resolve(file);
  if (!fs.existsSync(p)) throw new Error(`env file missing: ${p}`);
  const out = {};
  let raw = fs.readFileSync(p, "utf8");
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    let k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (k.charCodeAt(0) === 0xfeff) k = k.slice(1);
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
  let useKeys = false;
  let concurrency = 20;
  for (const a of argv) {
    if (a.startsWith("--env=")) envFile = a.slice("--env=".length);
    else if (a.startsWith("--prefixes="))
      prefixesArg = a.slice("--prefixes=".length);
    else if (a === "--write") write = true;
    else if (a === "--use-keys") useKeys = true;
    else if (a.startsWith("--concurrency=")) {
      concurrency = Math.max(1, Number(a.slice("--concurrency=".length)) || 20);
    }
  }
  return { envFile, prefixesArg, write, useKeys, concurrency };
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

function maskUrl(u) {
  try {
    const x = new URL(u);
    const auth = x.username ? `${x.username}:***@` : "";
    return `${x.protocol}//${auth}${x.hostname}${x.port ? `:${x.port}` : ""}${x.pathname}`;
  } catch {
    return "(unparseable)";
  }
}

function hostOf(u) {
  try {
    return new URL(u).hostname.toLowerCase();
  } catch {
    return "";
  }
}

/** 仅测试环境允许 KEYS；.env.prod / 非 test 主机名一律拒绝。 */
function assertKeysAllowed(envFile, srcUrl, wantKeys) {
  if (!wantKeys) return false;
  const base = path.basename(envFile).toLowerCase();
  const host = hostOf(srcUrl);
  const looksProdFile = base.includes("prod") && !base.includes("test");
  const looksTestFile = base.includes("test") || base === ".env";
  const looksTestHost = TEST_HOST_MARKERS.some((m) => host.includes(m));
  const looksProdHost =
    PROD_HOST_MARKERS.some((m) => host.includes(m)) && !looksTestHost;

  if (looksProdFile || looksProdHost) {
    throw new Error(
      "REFUSED: --use-keys is forbidden for production (.env.prod / prod Redis host). Use SCAN-only or another export tool.",
    );
  }
  if (!looksTestFile && !looksTestHost) {
    throw new Error(
      "REFUSED: --use-keys only allowed for test env files (e.g. .env.test) or known test hosts.",
    );
  }
  return true;
}

async function listKeysForPrefix(redis, prefix, useKeys) {
  const match = `${prefix}*`;
  if (useKeys) {
    const keys = await redis.keys(match);
    return {
      keys: Array.isArray(keys) ? keys : [],
      method: "keys",
      rounds: 1,
    };
  }

  const keys = [];
  let cursor = "0";
  let rounds = 0;
  do {
    const res = await redis.scan(cursor, "MATCH", match, "COUNT", 500);
    const next = Array.isArray(res) ? res[0] : res?.[0];
    const batch = Array.isArray(res) ? res[1] : res?.[1];
    cursor = String(next ?? "0");
    if (Array.isArray(batch)) keys.push(...batch);
    rounds += 1;
    if (rounds > 100_000) break;
  } while (cursor !== "0");
  return { keys, method: "scan", rounds };
}

/**
 * 不用 DUMP/RESTORE：Azure Redis 与 Render Valkey 的 RDB payload 互不兼容。
 */
async function copyKey(src, dst, key, write) {
  const type = await src.type(key);
  if (type === "none") return { key, skipped: true, reason: "missing" };
  const ttl = await src.pttl(key);
  if (ttl === -2) return { key, skipped: true, reason: "expired" };
  if (!write) return { key, dryRun: true, type, ttl };

  await dst.del(key);

  switch (type) {
    case "string": {
      const v = await src.get(key);
      if (v == null) return { key, skipped: true, reason: "missing" };
      if (ttl > 0) await dst.set(key, v, "PX", ttl);
      else await dst.set(key, v);
      break;
    }
    case "hash": {
      const all = await src.hgetall(key);
      if (Object.keys(all).length === 0) {
        return { key, skipped: true, reason: "empty-hash" };
      }
      await dst.hset(key, all);
      if (ttl > 0) await dst.pexpire(key, ttl);
      break;
    }
    case "list": {
      const items = await src.lrange(key, 0, -1);
      if (!items.length) return { key, skipped: true, reason: "empty-list" };
      await dst.rpush(key, ...items);
      if (ttl > 0) await dst.pexpire(key, ttl);
      break;
    }
    case "set": {
      const members = await src.smembers(key);
      if (!members.length) return { key, skipped: true, reason: "empty-set" };
      await dst.sadd(key, ...members);
      if (ttl > 0) await dst.pexpire(key, ttl);
      break;
    }
    case "zset": {
      const rows = await src.zrange(key, 0, -1, "WITHSCORES");
      if (!rows.length) return { key, skipped: true, reason: "empty-zset" };
      const args = [];
      for (let i = 0; i < rows.length; i += 2) {
        args.push(rows[i + 1], rows[i]);
      }
      await dst.zadd(key, ...args);
      if (ttl > 0) await dst.pexpire(key, ttl);
      break;
    }
    default:
      return { key, skipped: true, reason: `unsupported-type:${type}` };
  }

  return { key, copied: true, type, ttl };
}

async function mapPool(items, concurrency, fn) {
  let idx = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, items.length || 1) },
    async () => {
      while (idx < items.length) {
        const i = idx++;
        await fn(items[i], i);
      }
    },
  );
  await Promise.all(workers);
}

async function main() {
  const { envFile, prefixesArg, write, useKeys, concurrency } = parseArgs(
    process.argv.slice(2),
  );
  const resolvedEnv = path.resolve(envFile);
  const env = loadEnvFile(envFile);

  const srcUrl =
    env.REDIS_URL_V4?.trim() ||
    env.REDIS_URL?.trim() ||
    process.env.REDIS_URL_V4?.trim() ||
    process.env.REDIS_URL?.trim();
  const dstUrl =
    env.RENDER_KV?.trim() ||
    process.env.RENDER_KV?.trim() ||
    env.RENDER_KEY_VALUE?.trim() ||
    process.env.RENDER_KEY_VALUE?.trim();
  if (!srcUrl) throw new Error("missing source REDIS_URL / REDIS_URL_V4");
  if (!dstUrl) throw new Error("missing RENDER_KV");
  if (srcUrl === dstUrl) {
    throw new Error("source and RENDER_KV are the same URL — abort");
  }

  // 测试环境默认开 KEYS（Azure test SCAN 经常空）；正式必须显式且会被 assert 拒绝
  const autoKeys =
    useKeys ||
    path.basename(envFile).toLowerCase().includes("test") ||
    TEST_HOST_MARKERS.some((m) => hostOf(srcUrl).includes(m));
  const keysEnabled = assertKeysAllowed(envFile, srcUrl, autoKeys);

  const prefixes = resolvePrefixes(prefixesArg);
  console.log(
    JSON.stringify({
      envFile: resolvedEnv,
      write,
      prefixes,
      mode: write ? "WRITE" : "DRY-RUN",
      useKeys: keysEnabled,
      concurrency,
      srcHost: maskUrl(srcUrl),
      dstHost: maskUrl(dstUrl),
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
    const srcDbsize = await src.dbsize();
    const dstDbsizeBefore = await dst.dbsize();
    console.log(JSON.stringify({ srcDbsize, dstDbsizeBefore }));

    if (srcDbsize === 0) {
      throw new Error(
        "source dbsize=0 — 连到了空库。请确认 .env 里 REDIS_URL_V4 是 Azure（有数据的），不是 Render KV",
      );
    }

    let total = 0;
    let copied = 0;
    let errors = 0;
    let anyMatched = false;

    for (const prefix of prefixes) {
      const listed = await listKeysForPrefix(src, prefix, keysEnabled);
      const keys = listed.keys;
      if (keys.length) anyMatched = true;
      console.log(
        JSON.stringify({
          prefix,
          matched: keys.length,
          method: listed.method,
          scanRounds: listed.rounds,
        }),
      );

      await mapPool(keys, concurrency, async (key) => {
        total += 1;
        const n = total;
        try {
          const r = await copyKey(src, dst, key, write);
          if (r.copied || r.dryRun) copied += 1;
          if (n <= 5 || n % 500 === 0) {
            console.log(JSON.stringify({ ...r, n }));
          }
        } catch (e) {
          errors += 1;
          if (errors <= 20) {
            console.log(
              JSON.stringify({
                key,
                error: e instanceof Error ? e.message : String(e),
              }),
            );
          }
        }
      });
    }

    const dstDbsizeAfter = await dst.dbsize();
    if (!anyMatched && srcDbsize > 0) {
      console.log(
        JSON.stringify({
          warn: "matched 0 keys but srcDbsize>0 — for test re-run with --use-keys; never use KEYS on prod",
        }),
      );
    }
    console.log(
      JSON.stringify({
        done: true,
        total,
        considered: copied,
        errors,
        write,
        useKeys: keysEnabled,
        dstDbsizeAfter,
      }),
    );
  } finally {
    src.disconnect();
    dst.disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
