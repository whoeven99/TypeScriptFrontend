import { resolveOfflineAccessToken } from "~/server/translateV4/token.server";

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
 * accessToken 缺省时从 offline session 解析。
 */
export async function fetchShopContact(
  shop: string,
  accessToken?: string | null,
): Promise<ShopContact> {
  const normalizedShop = shop.trim();
  if (!normalizedShop) return { email: null, ownerName: null };

  const token =
    accessToken?.trim() ||
    (await resolveOfflineAccessToken(normalizedShop)) ||
    "";
  if (!token) {
    console.warn(`[fetchShopContact] no access token shop=${normalizedShop}`);
    return { email: null, ownerName: null };
  }

  const graphqlVersion = process.env.GRAPHQL_VERSION?.trim() || "2025-04";
  const url = `https://${normalizedShop}/admin/api/${graphqlVersion}/graphql.json`;

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
