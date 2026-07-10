import { readFileSync } from "node:fs";
import { createClient } from "@libsql/client/http";

function load(p) {
  const r = {};
  for (const raw of readFileSync(p, "utf8").split(/\r?\n/)) {
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
    r[line.slice(0, i).trim()] = v;
  }
  return r;
}

const env = load(".env.prod");
const c = createClient({
  url: env.TURSO_DATABASE_URL,
  authToken: env.TURSO_AUTH_TOKEN,
});

const shops = [
  "musiclily.myshopify.com",
  "www-princesspinky-com.myshopify.com",
  "e00ftb-8b.myshopify.com",
  "838c59.myshopify.com",
  "ciwishop.myshopify.com",
  "p66fh3-cz.myshopify.com",
  "888ab7.myshopify.com",
];

const out = [];
for (const shop of shops) {
  const row = await c.execute({
    sql: `SELECT COUNT(*) AS total,
                 SUM(CASE WHEN isDelete = 0 THEN 1 ELSE 0 END) AS active,
                 SUM(CASE WHEN isDelete = 0 AND imageAfterUrl IS NOT NULL AND length(imageAfterUrl) > 0 THEN 1 ELSE 0 END) AS withAfter
          FROM UserPicture WHERE shop = ?`,
    args: [shop],
  });
  out.push({ shop, ...row.rows[0] });
}

console.log(JSON.stringify(out, null, 2));
