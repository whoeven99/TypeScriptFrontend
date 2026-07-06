import fs from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client/http";

const SHOP = process.argv[2]?.trim() || "51c7c6.myshopify.com";

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

const root = path.resolve(import.meta.dirname, "../..");
const env = { ...loadDotEnv(path.join(root, ".env")), ...process.env };
const url = env.TURSO_PROD_DATABASE_URL?.trim();
const authToken = env.TURSO_PROD_AUTH_TOKEN?.trim();
if (!url?.startsWith("libsql://") || !authToken) {
  console.error("缺少 TURSO_PROD_* 凭证");
  process.exit(1);
}

const client = createClient({ url, authToken });

function row(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) out[k] = v;
  return out;
}

const binding = await client.execute({
  sql: "SELECT * FROM ShopBillingBinding WHERE shop = ?",
  args: [SHOP],
});
const account = await client.execute({
  sql: "SELECT * FROM Account WHERE shop = ?",
  args: [SHOP],
});
const sub = await client.execute({
  sql: `SELECT shop, planKey, shopifySubscriptionId, billingInterval, status,
    creditsPerPeriod, trialEndsAt, currentPeriodStart, currentPeriodEnd,
    cancelledAt, createdAt, updatedAt FROM AppSubscription WHERE shop = ?`,
  args: [SHOP],
});
const logs = await client.execute({
  sql: `SELECT id, eventType, planKey, referenceId, creditsDelta, usedCredits, metadata, createdAt
    FROM BillingLog WHERE shop = ? ORDER BY createdAt ASC`,
  args: [SHOP],
});
const periodUsage = await client.execute({
  sql: "SELECT * FROM AccountPeriodUsage WHERE shop = ? ORDER BY archivedAt ASC",
  args: [SHOP],
});

const a = account.rows[0];
const total = a
  ? Number(a.subscriptionCredits) +
    Number(a.purchasedCredits) +
    Number(a.trialCredits)
  : 0;

console.log(
  JSON.stringify(
    {
      shop: SHOP,
      binding: binding.rows[0] ? row(binding.rows[0]) : null,
      account: a
        ? {
            subscriptionCredits: a.subscriptionCredits,
            purchasedCredits: a.purchasedCredits,
            trialCredits: a.trialCredits,
            usedCredits: a.usedCredits,
            totalCredits: total,
            remainingCredits: total - Number(a.usedCredits),
          }
        : null,
      subscription: sub.rows[0] ? row(sub.rows[0]) : null,
      billingLogs: logs.rows.map(row),
      periodUsage: periodUsage.rows.map(row),
      summary: {
        hasSubscriptionRow: sub.rows.length > 0,
        subscriptionStatus: sub.rows[0]?.status ?? null,
        activatedLogs: logs.rows.filter((r) => r.eventType === "SUBSCRIPTION_ACTIVATED").length,
        renewedLogs: logs.rows.filter((r) => r.eventType === "SUBSCRIPTION_RENEWED").length,
        cancelledLogs: logs.rows.filter((r) => r.eventType === "SUBSCRIPTION_CANCELLED").length,
        trialGrantedLogs: logs.rows.filter((r) => r.eventType === "TRIAL_GRANTED").length,
      },
    },
    null,
    2,
  ),
);
