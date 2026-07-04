import axios from "axios";
import prisma from "~/db.server";
import { isTsfBillingShop } from "~/server/billing/isTsfBillingShop.server";
import { ensureAccount } from "~/server/billing/account/ensureAccount.server";
import {
  getAvailableTokens,
} from "./accountBalance.server";

/** 与 Java `/quota/*` 及 translate-v4 UI 对齐的额度视图。 */
export type ShopQuota = {
  shopName: string;
  maxToken: number;
  usedToken: number;
  remaining: number;
};

export type ShopQuotaDeductResult = {
  ok: boolean;
  remaining: number;
  quota: ShopQuota | null;
};

type QuotaBaseResponse = {
  success: boolean;
  errorCode: number;
  errorMsg: string;
  response: ShopQuota | null;
};

function accountToShopQuota(shop: string, account: {
  subscriptionTokens: number;
  purchasedTokens: number;
  trialTokens: number;
  usedTokens: number;
}): ShopQuota {
  const maxToken = getAvailableTokens(account);
  const usedToken = account.usedTokens;
  return {
    shopName: shop,
    maxToken,
    usedToken,
    remaining: maxToken - usedToken,
  };
}

function javaQuotaBase(): string | null {
  const base = process.env.SERVER_URL?.trim()?.replace(/\/+$/, "");
  return base || null;
}

async function getJavaShopQuota(shop: string): Promise<ShopQuota | null> {
  const base = javaQuotaBase();
  if (!base) return null;
  try {
    const res = await axios.get<QuotaBaseResponse>(`${base}/quota/query`, {
      params: { shopName: shop },
      timeout: 8000,
    });
    const data = res.data;
    if (data?.success && data.response) return data.response;
    return null;
  } catch (err) {
    console.error("[shopQuota] getJavaShopQuota failed:", err);
    return null;
  }
}

async function deductJavaShopQuota(
  shop: string,
  tokens: number,
): Promise<ShopQuotaDeductResult> {
  const base = (
    process.env.TSF_SERVER_URL?.trim() ||
    process.env.SERVER_URL?.trim() ||
    ""
  ).replace(/\/+$/, "");
  if (!base) {
    return { ok: false, remaining: 0, quota: null };
  }

  const amount = Math.max(1, Math.ceil(tokens));
  try {
    const resp = await fetch(
      `${base}/quota/deduct?shopName=${encodeURIComponent(shop)}&tokens=${amount}`,
      { method: "POST" },
    );
    const data = (await resp.json()) as QuotaBaseResponse;
    if (!data?.success || !data.response) {
      console.warn(
        `[shopQuota] deductJavaShopQuota not ok shop=${shop}: ${data?.errorMsg ?? resp.status}`,
      );
      return { ok: false, remaining: 0, quota: null };
    }
    return {
      ok: true,
      remaining: data.response.remaining,
      quota: data.response,
    };
  } catch (err) {
    console.error(`[shopQuota] deductJavaShopQuota failed shop=${shop}:`, err);
    return { ok: false, remaining: 0, quota: null };
  }
}

async function getTsfShopQuota(shop: string): Promise<ShopQuota | null> {
  const account = await prisma.account.findUnique({ where: { shop } });
  if (!account) return null;
  return accountToShopQuota(shop, account);
}

/**
 * TSF 本地扣费：始终 increment usedTokens，remaining 可为负（对齐 Java 语义）。
 */
async function deductTsfShopQuota(
  shop: string,
  tokens: number,
): Promise<ShopQuotaDeductResult> {
  const amount = Math.max(1, Math.ceil(tokens));
  await ensureAccount(shop);

  const account = await prisma.account.update({
    where: { shop },
    data: { usedTokens: { increment: amount } },
  });

  const quota = accountToShopQuota(shop, account);
  return { ok: true, remaining: quota.remaining, quota };
}

/** 按 shop 自动分流 TSF Turso / Java Spring。 */
export async function getShopQuota(shop: string): Promise<ShopQuota | null> {
  if (await isTsfBillingShop(shop)) {
    return getTsfShopQuota(shop);
  }
  return getJavaShopQuota(shop);
}

/** 按 shop 自动分流扣费；TSF 走 Turso，老用户走 Java。 */
export async function deductShopQuota(
  shop: string,
  tokens: number,
): Promise<ShopQuotaDeductResult> {
  if (tokens <= 0) {
    const quota = await getShopQuota(shop);
    return {
      ok: true,
      remaining: quota?.remaining ?? 0,
      quota,
    };
  }

  if (await isTsfBillingShop(shop)) {
    return deductTsfShopQuota(shop, tokens);
  }
  return deductJavaShopQuota(shop, tokens);
}
