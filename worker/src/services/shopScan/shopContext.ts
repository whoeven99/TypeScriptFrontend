import { shopScanGraphql } from "./graphql.js";

/** 店铺语言（Shopify shopLocales）。 */
export type ShopLocaleRow = {
  locale: string;
  name: string;
  primary: boolean;
  published: boolean;
};

const SHOP_LOCALES_QUERY = `
query ShopScanLocales {
  shopLocales {
    locale
    name
    primary
    published
  }
}`;

export async function fetchShopLocales(
  shop: string,
  accessToken: string,
): Promise<ShopLocaleRow[]> {
  const data = await shopScanGraphql<{
    shopLocales: Array<{
      locale: string;
      name: string;
      primary: boolean;
      published: boolean;
    }> | null;
  }>(shop, accessToken, SHOP_LOCALES_QUERY);
  return (data.shopLocales ?? []).map((r) => ({
    locale: String(r.locale),
    name: String(r.name ?? r.locale),
    primary: Boolean(r.primary),
    published: Boolean(r.published),
  }));
}

/** 画像原始素材（写 Blob 存档 + 拼 AI prompt）。 */
export type ShopProfileFacts = {
  shopName: string;
  primaryDomain: string | null;
  currencyCode: string | null;
  productTypes: string[];
  vendors: string[];
  topProductTitles: string[];
  collectionTitles: string[];
  tags: string[];
};

const SHOP_FACTS_QUERY = `
query ShopScanFacts {
  shop {
    name
    currencyCode
    primaryDomain { url }
  }
  products(first: 40, sortKey: UPDATED_AT, reverse: true) {
    nodes { title productType vendor tags }
  }
  collections(first: 20, sortKey: UPDATED_AT, reverse: true) {
    nodes { title }
  }
}`;

export async function fetchShopProfileFacts(
  shop: string,
  accessToken: string,
): Promise<ShopProfileFacts> {
  const data = await shopScanGraphql<{
    shop: {
      name: string;
      currencyCode: string | null;
      primaryDomain: { url: string | null } | null;
    };
    products: {
      nodes: Array<{
        title: string | null;
        productType: string | null;
        vendor: string | null;
        tags: string[] | null;
      }>;
    };
    collections: { nodes: Array<{ title: string | null }> };
  }>(shop, accessToken, SHOP_FACTS_QUERY);

  const products = data.products?.nodes ?? [];
  const productTypes = dedupeNonEmpty(products.map((p) => p.productType ?? ""));
  const vendors = dedupeNonEmpty(products.map((p) => p.vendor ?? ""));
  const topProductTitles = dedupeNonEmpty(products.map((p) => p.title ?? "")).slice(0, 30);
  const tags = dedupeNonEmpty(products.flatMap((p) => p.tags ?? [])).slice(0, 50);
  const collectionTitles = dedupeNonEmpty(
    (data.collections?.nodes ?? []).map((c) => c.title ?? ""),
  ).slice(0, 20);

  return {
    shopName: data.shop?.name ?? shop,
    primaryDomain: data.shop?.primaryDomain?.url ?? null,
    currencyCode: data.shop?.currencyCode ?? null,
    productTypes,
    vendors,
    topProductTitles,
    collectionTitles,
    tags,
  };
}

function dedupeNonEmpty(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const trimmed = (v ?? "").trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}
