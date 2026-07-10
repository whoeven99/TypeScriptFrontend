/**
 * Read-only prod Turso UserPicture smoke check.
 * Usage: node scripts/smoke-user-picture-read.mjs --env=.env.prod
 */
import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@libsql/client/http";

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
  process.argv.slice(2).map((item) => {
    const [k, v] = item.replace(/^--/, "").split("=");
    return [k, v ?? true];
  }),
);
const envPath = args.env || ".env.prod";
const env = loadDotEnv(envPath);
const url = env.TURSO_DATABASE_URL;
const authToken = env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error("missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in", envPath);
  process.exit(1);
}

const client = createClient({ url, authToken });

const table = await client.execute(
  "SELECT name FROM sqlite_master WHERE type='table' AND name='UserPicture'",
);
if (!table.rows.length) {
  console.log(JSON.stringify({ ok: false, error: "UserPicture table missing" }, null, 2));
  process.exit(1);
}

const [total, active, withAfter, cosRows, cdnRows, byLang, byShop, sample] =
  await Promise.all([
    client.execute("SELECT COUNT(*) AS c FROM UserPicture"),
    client.execute("SELECT COUNT(*) AS c FROM UserPicture WHERE isDelete = 0"),
    client.execute(
      "SELECT COUNT(*) AS c FROM UserPicture WHERE isDelete = 0 AND imageAfterUrl IS NOT NULL AND length(imageAfterUrl) > 0",
    ),
    client.execute(
      "SELECT COUNT(*) AS c FROM UserPicture WHERE isDelete = 0 AND imageAfterUrl LIKE '%ciwi-us-1327177217.cos%'",
    ),
    client.execute(
      "SELECT COUNT(*) AS c FROM UserPicture WHERE isDelete = 0 AND imageAfterUrl LIKE '%img.bogdatech.com%'",
    ),
    client.execute(
      "SELECT languageCode, COUNT(*) AS c FROM UserPicture WHERE isDelete = 0 GROUP BY languageCode ORDER BY c DESC LIMIT 15",
    ),
    client.execute(
      "SELECT shop, COUNT(*) AS c FROM UserPicture WHERE isDelete = 0 GROUP BY shop ORDER BY c DESC LIMIT 10",
    ),
    client.execute(
      "SELECT shop, imageId, languageCode, substr(imageBeforeUrl, 1, 100) AS beforePrefix, substr(imageAfterUrl, 1, 100) AS afterPrefix FROM UserPicture WHERE isDelete = 0 AND imageAfterUrl IS NOT NULL AND length(imageAfterUrl) > 0 LIMIT 5",
    ),
  ]);

const samples = [];
for (const row of sample.rows) {
  const after = String(row.afterPrefix || "");
  let httpStatus = null;
  let finalUrl = null;
  if (after) {
    // API 读出时会 COS→CDN；这里对 CDN 形态做 HEAD/GET 探测
    const cdnUrl = after.replace(
      "https://ciwi-us-1327177217.cos.na-ashburn.myqcloud.com",
      "https://img.bogdatech.com",
    );
    finalUrl = cdnUrl;
    try {
      const res = await fetch(cdnUrl, { method: "HEAD", redirect: "follow" });
      httpStatus = res.status;
      if (httpStatus === 405 || httpStatus === 403) {
        const getRes = await fetch(cdnUrl, {
          method: "GET",
          headers: { Range: "bytes=0-0" },
          redirect: "follow",
        });
        httpStatus = getRes.status;
      }
    } catch (err) {
      httpStatus = `error:${err instanceof Error ? err.message : String(err)}`;
    }
  }
  samples.push({
    shop: row.shop,
    imageId: row.imageId,
    languageCode: row.languageCode,
    beforePrefix: row.beforePrefix,
    afterPrefix: row.afterPrefix,
    probeUrlPrefix: finalUrl ? finalUrl.slice(0, 100) : null,
    probeHttpStatus: httpStatus,
  });
}

console.log(
  JSON.stringify(
    {
      ok: true,
      envPath,
      total: Number(total.rows[0].c),
      active: Number(active.rows[0].c),
      withImageAfterUrl: Number(withAfter.rows[0].c),
      cosUrlRows: Number(cosRows.rows[0].c),
      alreadyCdnRows: Number(cdnRows.rows[0].c),
      topLanguages: byLang.rows.map((r) => ({
        languageCode: r.languageCode,
        c: Number(r.c),
      })),
      topShops: byShop.rows.map((r) => ({ shop: r.shop, c: Number(r.c) })),
      samples,
    },
    null,
    2,
  ),
);
