import { getTsfDb, hasTsfDbCredentials } from "./tsfDb.js";

export type TsfAccountQuota = {
  shopName: string;
  maxToken: number;
  usedToken: number;
  remaining: number;
};

type AccountRow = {
  subscriptionTokens: number;
  purchasedTokens: number;
  trialTokens: number;
  usedTokens: number;
};

function rowToQuota(shop: string, row: AccountRow): TsfAccountQuota {
  const maxToken = row.subscriptionTokens + row.purchasedTokens + row.trialTokens;
  const usedToken = row.usedTokens;
  return {
    shopName: shop,
    maxToken,
    usedToken,
    remaining: maxToken - usedToken,
  };
}

async function loadAccountRow(shop: string): Promise<AccountRow | null> {
  const rs = await getTsfDb().execute({
    sql:
      "SELECT subscriptionTokens, purchasedTokens, trialTokens, usedTokens FROM Account WHERE shop = ? LIMIT 1",
    args: [shop],
  });
  const row = rs.rows[0];
  if (!row) return null;
  return {
    subscriptionTokens: Number(row.subscriptionTokens ?? 0),
    purchasedTokens: Number(row.purchasedTokens ?? 0),
    trialTokens: Number(row.trialTokens ?? 0),
    usedTokens: Number(row.usedTokens ?? 0),
  };
}

/** Turso 存在 Account 行 → TSF 计费用户（与 Remix isTsfBillingShop 一致）。 */
export async function isTsfBillingShopInDb(shop: string): Promise<boolean> {
  if (!hasTsfDbCredentials()) return false;
  try {
    const rs = await getTsfDb().execute({
      sql: "SELECT 1 AS ok FROM Account WHERE shop = ? LIMIT 1",
      args: [shop],
    });
    return rs.rows.length > 0;
  } catch (err) {
    console.error(`[tsfAccountQuota] isTsfBillingShopInDb failed shop=${shop}:`, err);
    return false;
  }
}

/** 从 Turso Account 读取额度（仅 TSF 用户）。 */
export async function queryTsfAccountQuota(
  shop: string,
): Promise<TsfAccountQuota | null> {
  if (!hasTsfDbCredentials()) return null;
  try {
    const row = await loadAccountRow(shop);
    if (!row) return null;
    return rowToQuota(shop, row);
  } catch (err) {
    console.error(`[tsfAccountQuota] query failed shop=${shop}:`, err);
    return null;
  }
}

/**
 * Turso 本地扣费：increment usedTokens，remaining 可为负（对齐 Java 语义）。
 * Account 不存在时返回 ok:false。
 */
export async function deductTsfAccountQuota(
  shop: string,
  amount: number,
): Promise<{ ok: boolean; remaining: number }> {
  if (!hasTsfDbCredentials()) {
    return { ok: false, remaining: 0 };
  }

  const tokens = Math.max(1, Math.ceil(amount));
  try {
    const existing = await loadAccountRow(shop);
    if (!existing) {
      console.warn(`[tsfAccountQuota] deduct skipped — no Account shop=${shop}`);
      return { ok: false, remaining: 0 };
    }

    await getTsfDb().execute({
      sql: "UPDATE Account SET usedTokens = usedTokens + ?, updatedAt = datetime('now') WHERE shop = ?",
      args: [tokens, shop],
    });

    const updated = await loadAccountRow(shop);
    const remaining = updated ? rowToQuota(shop, updated).remaining : 0;
    return { ok: true, remaining };
  } catch (err) {
    console.error(`[tsfAccountQuota] deduct error shop=${shop}:`, err);
    return { ok: false, remaining: 0 };
  }
}
