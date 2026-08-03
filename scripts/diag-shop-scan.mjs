import { readFileSync } from "node:fs";
import { CosmosClient } from "@azure/cosmos";
import { BlobServiceClient } from "@azure/storage-blob";

function loadEnvFile(path) {
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    const k = line.slice(0, i);
    let v = line.slice(i + 1).trim();
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

const env = {
  ...loadEnvFile(".env"),
  ...loadEnvFile(".env.test"),
};

const shop = process.argv[2] || null;

const cosmosEndpoint = env.COSMOS_ENDPOINT_V4?.trim();
const cosmosKey = env.COSMOS_KEY_V4?.trim();
if (!cosmosEndpoint || !cosmosKey) {
  console.error("Missing COSMOS_ENDPOINT_V4 / COSMOS_KEY_V4");
  process.exit(1);
}

const client = new CosmosClient({ endpoint: cosmosEndpoint, key: cosmosKey });
const container = client.database("translation").container("shop_scan_jobs");

const query = shop
  ? {
      query:
        "SELECT TOP 3 c.shopName, c.id, c.status, c.stages, c.blobPrefix, c.updatedAt, c.summary FROM c WHERE c.shopName = @shop ORDER BY c.updatedAt DESC",
      parameters: [{ name: "@shop", value: shop }],
    }
  : {
      query:
        "SELECT TOP 5 c.shopName, c.id, c.status, c.stages, c.blobPrefix, c.updatedAt, c.summary FROM c ORDER BY c.updatedAt DESC",
    };

const { resources: scans } = await container.items.query(query).fetchAll();
console.log("=== Recent scans ===");
console.log(JSON.stringify(scans, null, 2));

const latest = scans[0];
if (!latest?.blobPrefix) {
  console.log("\nNo blobPrefix on latest scan.");
  process.exit(0);
}

const blobConn = env.AZURE_BLOB_CONNECTION_STRING?.trim();
if (!blobConn) {
  console.log("\n=== Blob ===");
  console.log("AZURE_BLOB_CONNECTION_STRING not set in .env / .env.test — app cannot read profile-facts.json");
  process.exit(0);
}

const containerName =
  env.AZURE_BLOB_TRANSLATION_CONTAINER?.trim() || "translation-content";
const blobContainer = BlobServiceClient.fromConnectionString(blobConn).getContainerClient(
  containerName,
);
const prefix = latest.blobPrefix.endsWith("/")
  ? latest.blobPrefix
  : `${latest.blobPrefix}/`;

async function readJson(name) {
  const client = blobContainer.getBlockBlobClient(`${prefix}${name}`);
  if (!(await client.exists())) return { exists: false, data: null };
  const buf = await client.downloadToBuffer();
  return { exists: true, data: JSON.parse(buf.toString("utf8")) };
}

const profileFacts = await readJson("profile-facts.json");
const glossaryRaw = await readJson("glossary-raw.json");

console.log("\n=== profile-facts.json ===");
if (!profileFacts.exists) {
  console.log("NOT FOUND");
} else {
  const d = profileFacts.data;
  console.log("keys:", Object.keys(d ?? {}));
  console.log("has induction:", Boolean(d?.induction));
  console.log("has old ai:", Boolean(d?.ai));
  console.log("understanding industry:", d?.induction?.understanding?.industry ?? null);
  const s = d?.induction?.strategy;
  console.log("strategy:", s
    ? {
        brandTerms: s.brandTerms?.length ?? 0,
        doNotTranslateTerms: s.doNotTranslateTerms?.length ?? 0,
        preferredTerms: s.preferredTerms?.length ?? 0,
        seoTerms: s.seoTerms?.length ?? 0,
        moduleHints: s.moduleHints?.length ?? 0,
      }
    : null);
  if (d?.induction?.ai?.step2) {
    console.log("step2 raw preview:", String(d.induction.ai.step2.raw).slice(0, 500));
  }
}

console.log("\n=== glossary-raw.json ===");
if (!glossaryRaw.exists) {
  console.log("NOT FOUND");
} else {
  const d = glossaryRaw.data;
  console.log("totalSuggested:", d?.totalSuggested ?? d?.totalInserted ?? null);
  console.log(
    "perLocale terms:",
    (d?.perLocale ?? []).map((r) => ({
      locale: r.locale,
      terms: r.terms?.length ?? 0,
      inserted: r.inserted ?? null,
    })),
  );
}
