import axios from "axios";

/**
 * TSF 额度查询（复用 Java 额度服务 /quota/query）。
 * base 用 TSF 的 SERVER_URL（与既有 Java 调用一致）。
 */
export type ShopQuota = {
  shopName: string;
  maxToken: number;
  usedToken: number;
  remaining: number;
};

type QuotaBaseResponse = {
  success: boolean;
  errorCode: number;
  errorMsg: string;
  response: ShopQuota | null;
};

export async function getShopQuota(shop: string): Promise<ShopQuota | null> {
  const base = process.env.SERVER_URL?.trim()?.replace(/\/+$/, "");
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
    console.error("[translateV4] getShopQuota failed:", err);
    return null;
  }
}
