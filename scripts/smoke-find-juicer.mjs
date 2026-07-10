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

const byFilename = await c.execute({
  sql: `SELECT shop, languageCode, isDelete,
               CASE WHEN imageAfterUrl IS NOT NULL AND length(imageAfterUrl) > 0 THEN 1 ELSE 0 END AS hasAfter,
               substr(imageBeforeUrl, 1, 140) AS beforeP
        FROM UserPicture
        WHERE imageBeforeUrl LIKE ?
        LIMIT 30`,
  args: ["%1615028849319%"],
});

const bigShops = await c.execute(`
  SELECT shop,
         COUNT(*) AS total,
         SUM(CASE WHEN imageAfterUrl IS NOT NULL AND length(imageAfterUrl) > 0 THEN 1 ELSE 0 END) AS withAfter
  FROM UserPicture
  WHERE isDelete = 0
    AND shop IN (
      '888ab7.myshopify.com',
      'p66fh3-cz.myshopify.com',
      'b97e0a-c2.myshopify.com',
      'kingart-us.myshopify.com',
      'j94z2z-dw.myshopify.com'
    )
  GROUP BY shop
`);

console.log(
  JSON.stringify(
    {
      byFilename: byFilename.rows,
      bigShops: bigShops.rows,
    },
    null,
    2,
  ),
);
