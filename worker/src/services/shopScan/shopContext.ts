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

/** 市场配置（本地化策略输入，无法从翻译数据推断）。 */
export type ShopMarket = {
  name: string;
  handle: string;
  status: string;
  baseCurrency: string | null;
  locales: string[];
};

/** 画像原始素材（写 Blob 存档 + 拼 AI prompt）。 */
export type ShopProfileFacts = {
  shopName: string;
  primaryDomain: string | null;
  currencyCode: string | null;
  productTypes: string[];
  vendors: string[];
  topProductTitles: string[];
  collectionTitles: string[];
  collectionDescriptions: string[];
  articleTitles: string[];
  articleSummaries: string[];
  menuTitles: string[];
  tags: string[];
};

export type ShopIdentityFacts = Pick<
  ShopProfileFacts,
  "shopName" | "primaryDomain" | "currencyCode" | "vendors"
>;

export type ShopCatalogFacts = Pick<
  ShopProfileFacts,
  | "productTypes"
  | "vendors"
  | "topProductTitles"
  | "collectionTitles"
  | "collectionDescriptions"
  | "menuTitles"
  | "tags"
>;

export type ShopEditorialFacts = Pick<ShopProfileFacts, "articleTitles" | "articleSummaries">;

const SHOP_MARKETS_QUERY = `
query ShopScanMarkets {
  markets(first: 50, query: "status:ACTIVE") {
    nodes {
      name
      handle
      status
      currencySettings {
        baseCurrency { currencyCode }
      }
      webPresences(first: 5) {
        nodes {
          defaultLocale { locale }
          alternateLocales { locale }
          rootUrls { locale }
        }
      }
    }
  }
}`;

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
  collections(first: 30, sortKey: UPDATED_AT, reverse: true) {
    nodes { title description }
  }
  articles(first: 20, sortKey: UPDATED_AT, reverse: true) {
    nodes { title summary }
  }
  menus(first: 10) {
    nodes {
      title
      items {
        title
        items { title }
      }
    }
  }
}`;

const SHOP_IDENTITY_QUERY = `
query ShopScanIdentity {
  shop {
    name
    currencyCode
    primaryDomain { url }
  }
  products(first: 20, sortKey: UPDATED_AT, reverse: true) {
    nodes { vendor }
  }
}`;

const SHOP_CATALOG_QUERY = `
query ShopScanCatalog {
  products(first: 40, sortKey: UPDATED_AT, reverse: true) {
    nodes { title productType vendor tags }
  }
  collections(first: 30, sortKey: UPDATED_AT, reverse: true) {
    nodes { title description }
  }
  menus(first: 10) {
    nodes {
      title
      items {
        title
        items { title }
      }
    }
  }
}`;

const SHOP_EDITORIAL_QUERY = `
query ShopScanEditorial {
  articles(first: 20, sortKey: UPDATED_AT, reverse: true) {
    nodes { title summary }
  }
}`;

type MarketWebPresenceNode = {
  defaultLocale?: { locale?: string | null } | null;
  alternateLocales?: Array<{ locale?: string | null }> | null;
  rootUrls?: Array<{ locale?: string | null }> | null;
};

type MenuItemNode = {
  title?: string | null;
  items?: MenuItemNode[] | null;
};

type MenuNode = {
  title?: string | null;
  items?: MenuItemNode[] | null;
};

/**
 * 读取店铺已启用市场及其语言/货币配置。
 * webPresences 为空时回退到已发布 shopLocales（主域名 + 国家选择器场景）。
 */
export async function fetchShopMarkets(
  shop: string,
  accessToken: string,
  locales: ShopLocaleRow[],
): Promise<ShopMarket[]> {
  const publishedLocales = dedupeNonEmpty(
    locales.filter((l) => l.published).map((l) => l.locale),
  );

  const data = await shopScanGraphql<{
    markets?: {
      nodes?: Array<{
        name?: string | null;
        handle?: string | null;
        status?: string | null;
        currencySettings?: {
          baseCurrency?: { currencyCode?: string | null } | null;
        } | null;
        webPresences?: { nodes?: MarketWebPresenceNode[] | null } | null;
      }> | null;
    } | null;
  }>(shop, accessToken, SHOP_MARKETS_QUERY);

  return (data.markets?.nodes ?? [])
    .map((node) => {
      const name = (node.name ?? "").trim();
      if (!name) return null;
      const webPresences = node.webPresences?.nodes ?? [];
      const marketLocales = resolveMarketLocales(webPresences, publishedLocales);
      return {
        name,
        handle: (node.handle ?? "").trim(),
        status: (node.status ?? "ACTIVE").trim(),
        baseCurrency: node.currencySettings?.baseCurrency?.currencyCode?.trim() || null,
        locales: marketLocales,
      } satisfies ShopMarket;
    })
    .filter((m): m is ShopMarket => m !== null);
}

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
    collections: {
      nodes: Array<{ title: string | null; description: string | null }>;
    };
    articles: {
      nodes: Array<{ title: string | null; summary: string | null }>;
    };
    menus: { nodes: MenuNode[] };
  }>(shop, accessToken, SHOP_FACTS_QUERY);

  const products = data.products?.nodes ?? [];
  const productTypes = dedupeNonEmpty(products.map((p) => p.productType ?? ""));
  const vendors = dedupeNonEmpty(products.map((p) => p.vendor ?? ""));
  const topProductTitles = dedupeNonEmpty(products.map((p) => p.title ?? "")).slice(0, 30);
  const tags = dedupeNonEmpty(products.flatMap((p) => p.tags ?? [])).slice(0, 50);

  const collections = data.collections?.nodes ?? [];
  const collectionTitles = dedupeNonEmpty(collections.map((c) => c.title ?? "")).slice(0, 30);
  const collectionDescriptions = dedupeNonEmpty(
    collections
      .map((c) => truncateText(c.description ?? "", 200))
      .filter((d) => d.length >= 8),
  ).slice(0, 15);

  const articles = data.articles?.nodes ?? [];
  const articleTitles = dedupeNonEmpty(articles.map((a) => a.title ?? "")).slice(0, 20);
  const articleSummaries = dedupeNonEmpty(
    articles
      .map((a) => truncateText(stripHtml(a.summary ?? ""), 200))
      .filter((s) => s.length >= 8),
  ).slice(0, 15);

  const menuTitles = collectMenuTitles(data.menus?.nodes ?? []);

  return {
    shopName: data.shop?.name ?? shop,
    primaryDomain: data.shop?.primaryDomain?.url ?? null,
    currencyCode: data.shop?.currencyCode ?? null,
    productTypes,
    vendors,
    topProductTitles,
    collectionTitles,
    collectionDescriptions,
    articleTitles,
    articleSummaries,
    menuTitles,
    tags,
  };
}

export async function fetchShopIdentityFacts(
  shop: string,
  accessToken: string,
): Promise<ShopIdentityFacts> {
  const data = await shopScanGraphql<{
    shop: {
      name: string;
      currencyCode: string | null;
      primaryDomain: { url: string | null } | null;
    };
    products: {
      nodes: Array<{ vendor: string | null }>;
    };
  }>(shop, accessToken, SHOP_IDENTITY_QUERY);

  return {
    shopName: data.shop?.name ?? shop,
    primaryDomain: data.shop?.primaryDomain?.url ?? null,
    currencyCode: data.shop?.currencyCode ?? null,
    vendors: dedupeNonEmpty((data.products?.nodes ?? []).map((p) => p.vendor ?? "")),
  };
}

export async function fetchShopCatalogFacts(
  shop: string,
  accessToken: string,
): Promise<ShopCatalogFacts> {
  const data = await shopScanGraphql<{
    products: {
      nodes: Array<{
        title: string | null;
        productType: string | null;
        vendor: string | null;
        tags: string[] | null;
      }>;
    };
    collections: {
      nodes: Array<{ title: string | null; description: string | null }>;
    };
    menus: { nodes: MenuNode[] };
  }>(shop, accessToken, SHOP_CATALOG_QUERY);

  const products = data.products?.nodes ?? [];
  const collections = data.collections?.nodes ?? [];

  return {
    productTypes: dedupeNonEmpty(products.map((p) => p.productType ?? "")),
    vendors: dedupeNonEmpty(products.map((p) => p.vendor ?? "")),
    topProductTitles: dedupeNonEmpty(products.map((p) => p.title ?? "")).slice(0, 30),
    collectionTitles: dedupeNonEmpty(collections.map((c) => c.title ?? "")).slice(0, 30),
    collectionDescriptions: dedupeNonEmpty(
      collections
        .map((c) => truncateText(c.description ?? "", 200))
        .filter((d) => d.length >= 8),
    ).slice(0, 15),
    menuTitles: collectMenuTitles(data.menus?.nodes ?? []),
    tags: dedupeNonEmpty(products.flatMap((p) => p.tags ?? [])).slice(0, 50),
  };
}

export async function fetchShopEditorialFacts(
  shop: string,
  accessToken: string,
): Promise<ShopEditorialFacts> {
  const data = await shopScanGraphql<{
    articles: {
      nodes: Array<{ title: string | null; summary: string | null }>;
    };
  }>(shop, accessToken, SHOP_EDITORIAL_QUERY);

  const articles = data.articles?.nodes ?? [];
  return {
    articleTitles: dedupeNonEmpty(articles.map((a) => a.title ?? "")).slice(0, 20),
    articleSummaries: dedupeNonEmpty(
      articles
        .map((a) => truncateText(stripHtml(a.summary ?? ""), 200))
        .filter((s) => s.length >= 8),
    ).slice(0, 15),
  };
}

export function mergeShopProfileFacts(args: {
  identity?: Partial<ShopIdentityFacts> | null;
  catalog?: Partial<ShopCatalogFacts> | null;
  editorial?: Partial<ShopEditorialFacts> | null;
}): ShopProfileFacts {
  return {
    shopName: args.identity?.shopName ?? "",
    primaryDomain: args.identity?.primaryDomain ?? null,
    currencyCode: args.identity?.currencyCode ?? null,
    productTypes: args.catalog?.productTypes ?? [],
    vendors: dedupeNonEmpty([...(args.identity?.vendors ?? []), ...(args.catalog?.vendors ?? [])]),
    topProductTitles: args.catalog?.topProductTitles ?? [],
    collectionTitles: args.catalog?.collectionTitles ?? [],
    collectionDescriptions: args.catalog?.collectionDescriptions ?? [],
    articleTitles: args.editorial?.articleTitles ?? [],
    articleSummaries: args.editorial?.articleSummaries ?? [],
    menuTitles: args.catalog?.menuTitles ?? [],
    tags: args.catalog?.tags ?? [],
  };
}

function resolveMarketLocales(
  webPresences: MarketWebPresenceNode[],
  publishedLocales: string[],
): string[] {
  const locales: string[] = [];
  for (const wp of webPresences) {
    const defaultLocale = wp.defaultLocale?.locale?.trim();
    if (defaultLocale) locales.push(defaultLocale);
    for (const alt of wp.alternateLocales ?? []) {
      const loc = alt.locale?.trim();
      if (loc) locales.push(loc);
    }
    for (const root of wp.rootUrls ?? []) {
      const loc = root.locale?.trim();
      if (loc) locales.push(loc);
    }
  }
  const deduped = dedupeNonEmpty(locales);
  return deduped.length > 0 ? deduped : publishedLocales;
}

function collectMenuTitles(menus: MenuNode[]): string[] {
  const titles: string[] = [];
  for (const menu of menus) {
    const menuTitle = menu.title?.trim();
    if (menuTitle) titles.push(menuTitle);
    for (const item of menu.items ?? []) {
      const itemTitle = item.title?.trim();
      if (itemTitle) titles.push(itemTitle);
      for (const child of item.items ?? []) {
        const childTitle = child.title?.trim();
        if (childTitle) titles.push(childTitle);
      }
    }
  }
  return dedupeNonEmpty(titles).slice(0, 30);
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateText(text: string, maxLen: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen).trimEnd()}…`;
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
