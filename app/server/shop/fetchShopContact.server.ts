import { getOfflineSessionAccessToken } from "./offlineSessionToken.server";
import { buildShopifyAdminGraphqlUrl } from "~/lib/shopifyAdminApiVersion";

export type ShopContact = {
  email: string | null;
  /** shop.shopOwnerName 全称，用作邮件称呼。 */
  ownerName: string | null;
};

const SHOP_CONTACT_QUERY = `#graphql
  query ShopContactEmail {
    shop {
      email
      contactEmail
      shopOwnerName
    }
  }
`;

function pickShopEmail(shop: {
  email?: string | null;
  contactEmail?: string | null;
} | null | undefined): string | null {
  return shop?.email?.trim() || shop?.contactEmail?.trim() || null;
}

function pickOwnerName(shop: {
  shopOwnerName?: string | null;
} | null | undefined): string | null {
  const ownerName = shop?.shopOwnerName?.trim();
  return ownerName || null;
}

/**
 * 从 Shopify Admin GraphQL 拉取店铺联系邮箱与店主称呼（shopOwnerName 全称）。
 * token 始终从 Turso offline Session 读取。
 */
export async function fetchShopContact(shop: string): Promise<ShopContact> {
  const normalizedShop = shop.trim();
  if (!normalizedShop) return { email: null, ownerName: null };

  const token = (await getOfflineSessionAccessToken(normalizedShop)) || "";
  if (!token) {
    console.warn(`[fetchShopContact] no access token shop=${normalizedShop}`);
    return { email: null, ownerName: null };
  }

  const url = buildShopifyAdminGraphqlUrl(normalizedShop);

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
      },
      body: JSON.stringify({ query: SHOP_CONTACT_QUERY }),
    });

    if (!resp.ok) {
      console.warn(
        `[fetchShopContact] http ${resp.status} shop=${normalizedShop}`,
      );
      return { email: null, ownerName: null };
    }

    const json = (await resp.json()) as {
      data?: {
        shop?: {
          email?: string | null;
          contactEmail?: string | null;
          shopOwnerName?: string | null;
        };
      };
      errors?: Array<{ message?: string }>;
    };

    if (json.errors?.length) {
      console.warn(
        `[fetchShopContact] graphql errors shop=${normalizedShop}`,
        json.errors.map((e) => e.message),
      );
      return { email: null, ownerName: null };
    }

    return {
      email: pickShopEmail(json.data?.shop),
      ownerName: pickOwnerName(json.data?.shop),
    };
  } catch (e) {
    console.error(`[fetchShopContact] failed shop=${normalizedShop}`, e);
    return { email: null, ownerName: null };
  }
}
